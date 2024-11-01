import { WorkflowStateMachine } from "./base.js";
import {
  sendNotification,
  createLinkedBoardItem,
  performWorkflowAction,
} from "./effects.js";
import {
  hasRequiredFields,
  userAssignedInField,
  requireSourceType,
} from "./guards.js";
import { ACTION_SOURCE } from "../constants/general.js";
import { getConnectedItemColValues } from "../services/monday-service.js";

export const auditStates = {
  DRAFT: "Draft",
  CLOSED_CANCELLED: "Closed - Cancelled",
  AUDIT_PLAN_CREATION: "Audit Plan Creation",
  AUDIT_PLAN_ACCEPTANCE: "Audit Plan Acceptance",
  PENDING_AUDIT_START: "Pending Audit Start",
  AUDIT_IN_PROGRESS: "Audit In Progress",
  REPORT_IN_PROGRESS: "Report In Progress",
  PENDING_FINDINGS_APPROVAL: "Pending Findings Approval",
  CLOSED_DONE: "Closed - Done",
};

const desiredStateFlow = [
  auditStates.DRAFT,
  auditStates.AUDIT_PLAN_CREATION,
  auditStates.AUDIT_PLAN_ACCEPTANCE,
  auditStates.PENDING_AUDIT_START,
  auditStates.AUDIT_IN_PROGRESS,
  auditStates.REPORT_IN_PROGRESS,
  auditStates.PENDING_FINDINGS_APPROVAL,
  auditStates.CLOSED_DONE,
];

export const auditActions = {
  CANCEL: "Cancel",
  SUBMIT: "Submit",
  AUDIT_PLAN_COMPLETED: "Audit Plan Completed",
  RETURN_TO_AUDIT_PLAN_CREATION: "Return to Audit Plan Creation",
  AUDIT_PLAN_ACCEPTED: "Audit Plan Accepted",
  RETURN_TO_AUDIT_PLAN_ACCEPTANCE: "Return to Audit Plan Acceptance",
  AUDIT_STARTED: "Audit Started",
  CREATE_FINDING_CHILD: "Create Finding Child",
  AUDIT_ENDED: "Audit Ended",
  RETURN_TO_AUDIT_IN_PROGRESS: "Return to Audit In Progress",
  AUDIT_REPORT_COMPLETED: "Audit Report Completed",
  AUDIT_COMPLETED: "Audit Completed",
};

// Define the fields that are required for each state
// These are directly linked to the column IDs set in the template board
const commonFields = [
  "dropdown__1",
  "dropdown7__1",
  "dropdown1__1",
  "people__1",
  "people_2__1",
];

const fieldsForAuditPlanAcceptance = [
  ...commonFields,
  "date__1",
  "date9__1",
  "dropdown88__1",
  "dropdown4__1",
  "files6__1",
];

const fieldsForPendingAuditStart = [
  ...commonFields,
  "date__1",
  "date9__1",
  "dropdown88__1",
  "dropdown4__1",
];

const fieldsForAuditInProgress = [...fieldsForPendingAuditStart];

const fieldsForReportInProgress = [...fieldsForAuditInProgress];

const fieldsForPendingAuditeeResponse = [
  ...fieldsForReportInProgress,
  "files68__1",
  "long_text2__1",
  "long_text25__1",
];

const fieldsForClosedDone = [...fieldsForPendingAuditeeResponse];

// Qustion to ask from client about which roles will come here
const auditRoleFields = {
  originator: "creation_log__1",
  leadAuditor: "people__1",
  coAuditors: "people_1__1",
  auditee: "people_2__1",
};

const guardRequireSystemSourceAudit = requireSourceType(
  ACTION_SOURCE.SYSTEM,
  () =>
    "This action is triggered automatically when all linked audit findings are completed"
);

const guardRequireSystemIfFindingPresent = (context) => {
  const findingIds =
    context.item.column_values?.link_to_audit_findings__1?.linked_item_ids ||
    [];
  if (findingIds.length > 0) {
    return guardRequireSystemSourceAudit(context);
  }
  return { success: true };
};

const guardRequireFindingsNotInDraft = async (context) => {
  // Allow if only checking, since we don't want to make unnecessary API calls
  if (context.isCheckOnly) {
    return { success: true };
  }

  // Allow if the action is triggered by the system
  if (context.source === ACTION_SOURCE.SYSTEM) {
    return { success: true };
  }

  // If there are no linked findings, this action is allowed
  const findingIds =
    context.item.column_values?.link_to_audit_findings__1?.linked_item_ids ||
    [];
  if (findingIds.length === 0) {
    return { success: true };
  }

  // Fetch the status of all linked findings
  const results = await getConnectedItemColValues(
    context.client,
    context.item.id,
    "link_to_audit_findings__1",
    "status__1"
  );

  // console.log("Finding IDs result", results);

  // Check if all linked findings are in a completed state
  const notAllowedStatus = [auditStates.DRAFT];

  const allCompleted = results.valueArr.every(
    (result) => !notAllowedStatus.includes(result)
  );

  if (!allCompleted) {
    context.messages.push({
      message:
        "At least one linked finding is in Draft State. Please complete all findings before proceeding.",
      type: "error",
    });
    return {
      success: false,
      reasons: ["All linked findings must be completed!"],
    };
  }

  return { success: true };
};
const guardRequireAllCompletedFindings = async (context) => {
  // Allow if only checking, since we don't want to make unnecessary API calls
  if (context.isCheckOnly) {
    return { success: true };
  }

  // Allow if the action is triggered by the system
  if (context.source === ACTION_SOURCE.SYSTEM) {
    return { success: true };
  }

  // If there are no linked findings, this action is allowed
  const findingIds =
    context.item.column_values?.link_to_audit_findings__1?.linked_item_ids ||
    [];
  if (findingIds.length === 0) {
    return { success: true };
  }

  // Fetch the status of all linked findings
  const results = await getConnectedItemColValues(
    context.client,
    context.item.id,
    "link_to_audit_findings__1",
    "status__1"
  );

  // console.log("Finding IDs result", results);

  // Check if all linked findings are in a completed state
  const allowedStates = [auditStates.CLOSED_CANCELLED, auditStates.CLOSED_DONE];

  const allCompleted = results.valueArr.every((result) =>
    allowedStates.includes(result)
  );

  if (!allCompleted) {
    context.messages.push({
      message:
        "At least one linked finding is in not completed. Please complete all findings before proceeding.",
      type: "error",
    });
    return {
      success: false,
      reasons: [
        "All linked findings must be in Closed State!",
        "This action will be performed automatically when all linked findings are completed.",
      ],
    };
  }

  return { success: true };
};

const createAuditFindingChild = () => {
  return createLinkedBoardItem(
    // Find the boardId for the finding from the linked column settings
    (context) =>
      context.item.column_settings.link_to_audit_findings__1.boardIds[0],
    // Data for the new item (Finding)
    (context) => ({
      name: context.item?.name || "Finding",
      people_2__1: context.item.column_values?.people_2__1.persons_and_teams
        .map((person) => person.id)
        .join(", "),
      people__1: context.item.column_values?.people__1.persons_and_teams
        .map((person) => person.id)
        .join(", "),
    }),
    // Allow extra findings to be created (no skip condition)
    (context) => false,
    // Set the ID in the array of linked findings
    (context, itemId) => {
      const existingItemIds =
        context.item.column_values?.link_to_audit_findings__1?.linked_item_ids;
      context.updates.link_to_audit_findings__1 = {
        item_ids: [...existingItemIds, itemId],
      };
    },
    // Message for the user
    (context, itemId) => "Created and linked a new Finding record."
  );
};

const submitFindingsToAuditeeAutomation = async (context) => {
  // Fetch the Ids of all linked findings
  const findingIds =
    context.item.column_values?.link_to_audit_findings__1?.linked_item_ids ||
    [];
  if (findingIds.length === 0) {
    return { success: true };
  }

  // Get the Findings Board ID

  const settingsStr =
    context.item.column_values?.link_to_audit_findings__1?.column?.settings_str;

  const settings = settingsStr ? JSON.parse(settingsStr) : null;

  const findingsBoardId = settings ? settings.boardIds[0] : null;

  // Change the status of all linked findings to "Finding In Progress"
  await Promise.all(
    findingIds.map(async (findingId) => {
      try {
        await context.client.api(`mutation {
          change_simple_column_value (item_id: ${findingId}, board_id: ${findingsBoardId},  column_id: "status__1", value: "Finding In Progress") {
            id
          }
        }`);

        // Send a notification to the auditee
        sendNotification(
          (context) =>
            `Audit Report for "${context.item.name}" is ready for review.`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.creation_log__1.creator.id,
            },
          ]
        );
      } catch (error) {
        console.error(
          `Error updating status for finding ID: ${findingId}`,
          error
        );
        return { success: true };
      }
    })
  );

  return { success: true };
};

const auditTransitions = {
  [auditStates.DRAFT]: {
    [auditActions.CANCEL]: {
      guards: [
        userAssignedInField([
          auditRoleFields.originator,
          auditRoleFields.leadAuditor,
          auditRoleFields.coAuditors,
        ]),
      ],
      effects: [
        sendNotification(
          (context) =>
            `Audit "${context.item.name}" cancelled and moved to "Closed - Cancelled"`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.creation_log__1.creator.id,
            },
          ]
        ),
      ],
      newState: auditStates.CLOSED_CANCELLED,
    },
    [auditActions.SUBMIT]: {
      guards: [
        hasRequiredFields(commonFields),
        userAssignedInField([
          auditRoleFields.originator,
          auditRoleFields.leadAuditor,
          auditRoleFields.coAuditors,
        ]),
      ],
      effects: [
        sendNotification(
          (context) =>
            `Audit "${context.item.name}" submitted to "Audit Plan Creation"`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.creation_log__1.creator.id,
            },
          ]
        ),
      ],
      newState: auditStates.AUDIT_PLAN_CREATION,
    },
  },

  [auditStates.AUDIT_PLAN_CREATION]: {
    [auditActions.AUDIT_PLAN_COMPLETED]: {
      requiresESignature: true,
      guards: [
        hasRequiredFields(fieldsForAuditPlanAcceptance),
        userAssignedInField([
          auditRoleFields.originator,
          auditRoleFields.leadAuditor,
          auditRoleFields.coAuditors,
        ]),
      ],
      effects: [
        sendNotification(
          (context) =>
            `Audit Plan "${context.item.name}" completed and moved to "Audit Plan Acceptance"`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.creation_log__1.creator.id,
            },
          ]
        ),
      ],
      newState: auditStates.AUDIT_PLAN_ACCEPTANCE,
    },
    [auditActions.CANCEL]: {
      guards: [
        userAssignedInField([
          auditRoleFields.originator,
          auditRoleFields.leadAuditor,
          auditRoleFields.coAuditors,
        ]),
      ],
      effects: [
        sendNotification(
          (context) =>
            `Audit Plan "${context.item.name}" cancelled and returned to "Closed - Cancelled"`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.creation_log__1.creator.id,
            },
          ]
        ),
      ],
      newState: auditStates.CLOSED_CANCELLED,
    },
  },

  [auditStates.AUDIT_PLAN_ACCEPTANCE]: {
    [auditActions.AUDIT_PLAN_ACCEPTED]: {
      requiresESignature: true,
      guards: [
        hasRequiredFields(fieldsForPendingAuditStart),
        userAssignedInField([auditRoleFields.auditee]),
      ],
      effects: [],
      newState: auditStates.PENDING_AUDIT_START,
    },
    [auditActions.RETURN_TO_AUDIT_PLAN_CREATION]: {
      guards: [userAssignedInField([auditRoleFields.auditee])],
      effects: [
        // Send a notification to the originator
        sendNotification(
          (context) =>
            `Audit Plan "${context.item.name}" rejected to "Audit Plan Creation"`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.creation_log__1.creator.id,
            },
          ]
        ),
      ],
      newState: auditStates.AUDIT_PLAN_CREATION,
    },
  },

  [auditStates.PENDING_AUDIT_START]: {
    [auditActions.AUDIT_STARTED]: {
      guards: [
        hasRequiredFields(fieldsForAuditInProgress),
        userAssignedInField([
          auditRoleFields.originator,
          auditRoleFields.leadAuditor,
          auditRoleFields.coAuditors,
        ]),
      ],
      effects: [],
      newState: auditStates.AUDIT_IN_PROGRESS,
    },
    [auditActions.RETURN_TO_AUDIT_PLAN_ACCEPTANCE]: {
      guards: [
        userAssignedInField([
          auditRoleFields.originator,
          auditRoleFields.leadAuditor,
          auditRoleFields.coAuditors,
        ]),
      ],
      effects: [
        // Send a notification to the originator
        sendNotification(
          (context) =>
            `Audit "${context.item.name}" rejected to "Audit Plan Acceptance"`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.creation_log__1.creator.id,
            },
          ]
        ),
      ],
      newState: auditStates.AUDIT_PLAN_ACCEPTANCE,
    },
  },

  [auditStates.AUDIT_IN_PROGRESS]: {
    [auditActions.CREATE_FINDING_CHILD]: {
      guards: [
        userAssignedInField([
          auditRoleFields.originator,
          auditRoleFields.leadAuditor,
          auditRoleFields.coAuditors,
        ]),
      ],
      effects: [createAuditFindingChild()],
      newState: auditStates.AUDIT_IN_PROGRESS,
    },
    [auditActions.AUDIT_ENDED]: {
      guards: [
        hasRequiredFields(fieldsForAuditInProgress),
        userAssignedInField([
          auditRoleFields.originator,
          auditRoleFields.leadAuditor,
          auditRoleFields.coAuditors,
        ]),
      ],
      effects: [],
      newState: auditStates.REPORT_IN_PROGRESS,
    },
  },

  [auditStates.REPORT_IN_PROGRESS]: {
    [auditActions.AUDIT_REPORT_COMPLETED]: {
      requiresESignature: true,
      guards: [
        hasRequiredFields(fieldsForPendingAuditeeResponse),
        userAssignedInField([
          auditRoleFields.originator,
          auditRoleFields.leadAuditor,
          auditRoleFields.coAuditors,
        ]),
        guardRequireFindingsNotInDraft,
      ],
      effects: [submitFindingsToAuditeeAutomation],
      newState: auditStates.PENDING_FINDINGS_APPROVAL,
    },

    [auditActions.RETURN_TO_AUDIT_IN_PROGRESS]: {
      guards: [
        userAssignedInField([
          auditRoleFields.originator,
          auditRoleFields.leadAuditor,
          auditRoleFields.coAuditors,
        ]),
      ],
      effects: [],
      newState: auditStates.AUDIT_IN_PROGRESS,
    },
  },

  [auditStates.PENDING_FINDINGS_APPROVAL]: {
    [auditActions.AUDIT_COMPLETED]: {
      guards: [
        guardRequireAllCompletedFindings,
        hasRequiredFields(fieldsForClosedDone),
        userAssignedInField([
          auditRoleFields.originator,
          auditRoleFields.leadAuditor,
          auditRoleFields.coAuditors,
        ]),
      ],
      effects: [
        sendNotification(
          (context) => `Audit "${context.item.name}" completed and closed`,
          (context) => [
            {
              kind: "person",
              id: context.item.column_values?.creation_log__1.creator.id,
            },
          ]
        ),
      ],
      newState: auditStates.CLOSED_DONE,
    },
  },
};

export const auditStateMachine = new WorkflowStateMachine(
  auditTransitions,
  ["item"],
  "item.column_values.status__1.label",
  auditActions,
  desiredStateFlow
);
