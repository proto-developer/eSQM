import { WorkflowStateMachine } from "./base.js";
import { sendNotification } from "./effects.js";
import {
  hasRequiredFields,
  userAssignedInField,
  preventAssignedUserPerformingAction,
} from "./guards.js";

export const auditFindingStates = {
  DRAFT: "Draft",
  PENDING_AUDIT_REPORT: "Pending Audit Report",
  FINDING_IN_PROGRESS: "Finding In Progress",
  PENDING_APPROVAL: "Pending Approval",
  CLOSED_DONE: "Closed - Done",
  CLOSED_CANCELLED: "Closed - Cancelled",
};

const desiredStateFlow = [
  auditFindingStates.DRAFT,
  auditFindingStates.PENDING_AUDIT_REPORT,
  auditFindingStates.FINDING_IN_PROGRESS,
  auditFindingStates.PENDING_APPROVAL,
  auditFindingStates.CLOSED_DONE,
];

export const auditFindingActions = {
  CANCEL: "Cancel",
  FINDING_COMPLETED: "Finding Completed",
  RESPONSE_SUBMITTED: "Response Submitted",
  RETURN_BACK: "Return Back",
  APPROVED: "Approved",
};

const commonFields = [
  "people_2__1",
  "dropdown8__1",
  "dropdown6__1",
  "long_text__1",
  "dropdown4__1",
  "dropdown82__1",
];

const fieldsForPendingApproval = [...commonFields, "long_text6__1"];

const fieldsForClosedDone = [...fieldsForPendingApproval];

const auditFindingsRoleFields = {
  originator: "creation_log__1",
  auditee: "people_2__1",
  leadAuditor: "mirror_1__1",
  coAuditors: "mirror7__1",
};

// Move Parent Audit Item to "Closed - Done"
// If All the Findings are in "Closed - Done" or "Closed - Cancelled" Status
const moveAuditToClosedDone = async (context) => {
  // Get the parent Audit Id through connected board column
  const parentItemId =
    context.item.column_values?.connect_boards__1?.linked_item_ids[0];

  // Current Finding Id on which the action is being performed
  const currentItemId = context.item.id;

  // Query to get the mirror column value of the parent item
  const query = `query {
  items (ids: ${parentItemId} ) {
    id
    column_values(ids: ["mirror__1"]) {
      ... on MirrorValue {
        display_value
        mirrored_items {
          linked_item {
            id
          }
        }
      }
    }
  }
}`;

  // Fetch the parent item Details
  const response = await context.client.api(query);

  // Get the mirror column value of the parent item as String
  const parentItemMirrorValue =
    response.data.items[0].column_values[0].display_value;

  // Convert the mirror column value to Array
  const FindingsStatusesArray = parentItemMirrorValue
    .split(",")
    .map((status) => status.trim());

  // Find the index of the current item in the mirrored_items array
  const requiredIndexForCurrentItem =
    response.data.items[0].column_values[0].mirrored_items.findIndex(
      (item) => item.linked_item.id === currentItemId
    );

  // Required Statuses for the action to be performed on Audit
  // Move Audit to Closed Done only if all the Findings are in Closed Done or Closed Cancelled Status
  const requiredStatuses = ["Closed - Done", "Closed - Cancelled"];

  // Remove the Current Item from the Array based on the status of the current item
  const updatedFindingsStatusesArray = FindingsStatusesArray.filter(
    (_, index) => index !== requiredIndexForCurrentItem
  );

  console.log("Updated Findings Statuses Array", updatedFindingsStatusesArray);

  // Check if All Statuses match the required statuses skiping the current item as it is being moved to Closed Done
  const allStatusesMatch = updatedFindingsStatusesArray.every((status) =>
    requiredStatuses.includes(status)
  );

  // Get the Audit Board Id
  const settingsStr =
    context.item.column_values?.connect_boards__1?.column?.settings_str;

  const settings = settingsStr ? JSON.parse(settingsStr) : null;

  const auditBoardId = settings ? settings.boardIds[0] : null;

  if (allStatusesMatch) {
    console.log("All Statuses match the required statuses");
    try {
      await context.client.api(
        `mutation {
            change_simple_column_value (board_id: ${auditBoardId}, item_id: ${parentItemId}, column_id: "status__1", value: "Closed - Done") {
              id
            }
          }`
      );
    } catch (error) {
      console.error(
        `Error updating status for Audit ID: ${parentItemId}`,
        error
      );
      return;
    }
  } else {
    console.log("All Statuses do not match the required statuses");
  }
  return { success: true };
};

const auditFindingsTransitions = {
  [auditFindingStates.DRAFT]: {
    [auditFindingActions.CANCEL]: {
      guards: [
        userAssignedInField([
          auditFindingsRoleFields.originator,
          auditFindingsRoleFields.leadAuditor,
          auditFindingsRoleFields.coAuditors,
        ]),
      ],
      effects: [
        sendNotification(
          (context) =>
            `Audit Finding "${context.item.name}" moved to "Closed - Cancelled"`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.creation_log__1.creator.id,
            },
          ]
        ),
      ],
      newState: auditFindingStates.CLOSED_CANCELLED,
    },

    [auditFindingActions.FINDING_COMPLETED]: {
      guards: [
        hasRequiredFields(commonFields),
        userAssignedInField([
          auditFindingsRoleFields.originator,
          auditFindingsRoleFields.leadAuditor,
          auditFindingsRoleFields.coAuditors,
        ]),
      ],
      effects: [
        sendNotification(
          (context) =>
            `Audit Finding "${context.item.name}" submitted to "Pending Audit Report"`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.creation_log__1.creator.id,
            },
          ]
        ),
      ],
      newState: auditFindingStates.PENDING_AUDIT_REPORT,
    },
  },

  [auditFindingStates.PENDING_AUDIT_REPORT]: {
    [auditFindingActions.CANCEL]: {
      guards: [
        userAssignedInField([
          auditFindingsRoleFields.originator,
          auditFindingsRoleFields.leadAuditor,
          auditFindingsRoleFields.coAuditors,
        ]),
      ],
      effects: [
        sendNotification(
          (context) =>
            `Audit Finding "${context.item.name}" moved to "Closed - Cancelled"`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.creation_log__1.creator.id,
            },
          ]
        ),
      ],
      newState: auditFindingStates.CLOSED_CANCELLED,
    },
  },

  [auditFindingStates.FINDING_IN_PROGRESS]: {
    [auditFindingActions.RESPONSE_SUBMITTED]: {
      requiresESignature: true,
      guards: [
        hasRequiredFields(fieldsForPendingApproval),
        userAssignedInField([auditFindingsRoleFields.auditee]),
      ],
      effects: [
        sendNotification(
          (context) =>
            `Audit Finding "${context.item.name}" submitted to "Pending Approval"`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.creation_log__1.creator.id,
            },
          ]
        ),
      ],
      newState: auditFindingStates.PENDING_APPROVAL,
    },
  },

  [auditFindingStates.PENDING_APPROVAL]: {
    [auditFindingActions.RETURN_BACK]: {
      guards: [
        userAssignedInField([
          auditFindingsRoleFields.originator,
          auditFindingsRoleFields.leadAuditor,
          auditFindingsRoleFields.coAuditors,
        ]),
      ],
      effects: [
        sendNotification(
          (context) =>
            `Audit Finding "${context.item.name}" returned back to "Finding In Progress"`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.people_2__1.persons_and_teams[0]
                .id,
            },
          ]
        ),
      ],
      newState: auditFindingStates.FINDING_IN_PROGRESS,
    },

    [auditFindingActions.APPROVED]: {
      requiresESignature: true,
      guards: [
        hasRequiredFields(fieldsForClosedDone),
        userAssignedInField([
          auditFindingsRoleFields.originator,
          auditFindingsRoleFields.leadAuditor,
          auditFindingsRoleFields.coAuditors,
        ]),
        preventAssignedUserPerformingAction(
          auditFindingsRoleFields.auditee,
          auditFindingsRoleFields.leadAuditor
        ),
        // preventAssignedUserPerformingAction(
        //   auditFindingsRoleFields.auditee,
        //   auditFindingsRoleFields.coAuditors,
        //   (context) =>
        //     "There is overlap between the people in the 'Auditee' and the 'Co-Auditors' columns. For compliance reasons, one must not approve their own work."
        // ),
      ],
      effects: [
        moveAuditToClosedDone,
        sendNotification(
          (context) =>
            `Audit Finding "${context.item.name}" approved and closed`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.creation_log__1.creator.id,
            },
          ]
        ),
      ],
      newState: auditFindingStates.CLOSED_DONE,
    },
  },
};

export const auditFindingsStateMachine = new WorkflowStateMachine(
  auditFindingsTransitions,
  ["item"],
  "item.column_values.status__1.label",
  auditFindingActions,
  desiredStateFlow
);
