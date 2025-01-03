import { WorkflowStateMachine } from "./base.js";
import { createLinkedBoardItem } from "./effects.js";
import { hasRequiredFields, userAssignedInField } from "./guards.js";

// --- SUPPLIER WORKFLOW STATES ---
export const supplierStates = {
  DRAFT: "Draft",
  ON_BOARDING: "On-boarding",
  SUPPLIER_ASSESSMENT: "Supplier Assessment",
  SUPPLIER_APPROVED: "Supplier Approved",
  DISQUALIFIED: "Disqualified",
  IN_ACTIVATED: "In-activated",
  RESTRICTED: "Restricted",
  CLOSED_CANCELLED: "Closed - Cancelled",
};

// --- DESIRED STATE FLOW ---
const desiredStateFlow = [
  supplierStates.DRAFT,
  supplierStates.ON_BOARDING,
  supplierStates.SUPPLIER_ASSESSMENT,
  supplierStates.SUPPLIER_APPROVED,
  supplierStates.DISQUALIFIED,
  supplierStates.IN_ACTIVATED,
  supplierStates.RESTRICTED,
];

// --- SUPPLIER WORKFLOW ACTIONS ---
export const supplierActions = {
  CANCEL: "Cancel",
  SUBMIT: "Submit",
  ON_BOARDING_COMPLETED: "On-boarding Completed",
  RETURN_TO_ON_BOARDING: "Return to On-boarding",
  ASSESSMENT_COMPLETED: "Assessment Completed",
  CREATE_SUPPLIER_AUDIT: "Create Supplier Audit",
  RE_ASSESSMENT_REQUIRED: "Re-assessment Required",
  CREATE_QUALITY_EVENT: "Create Quality Event",
  DISQUALIFIED: "Disqualified Supplier",
  IN_ACTIVATED: "In-activated Supplier",
  RESTRICTED: "Restricted Supplier",
  RETURN_TO_SUPPLIER_ASSESSMENT: "Return to Supplier Assessment",
  RETURN_TO_SUPPLIER_APPROVED: "Return to Supplier Approved",
};

// --- REQUIRED FIELDS FOR DIFFERENT STATES ---
const onBoardingFields = [
  "people__1",
  "text3__1",
  "dropdown0__1",
  "text5__1",
  "text6__1",
  "text2__1",
  "people8__1",
];
const supplierAssessmentFields = [...onBoardingFields, "dropdown9__1"];
const supplierApprovedFields = [...supplierAssessmentFields];
const inActivatedFields = [...supplierApprovedFields];
const disqualifiedFields = [...supplierApprovedFields];
const restrictedFields = [...supplierApprovedFields];
// const closedCancelledFields = [...onBoardingFields];

// --- ROLE FIELDS FOR ACCESS TO PERFORM DIFFERENT ACTIONS ---
const supplierRoleFields = {
  creationLog: "creation_log__1",
  supplierManager: "people__1",
};

// --- SUPPLIER WORKFLOW EFFECTS ---
const createSupplierAudit = () => {
  return createLinkedBoardItem(
    // Find the boardId for the "Audit" from the linked column settings
    (context) => context.item.column_settings.connect_boards__1.boardIds[0],
    // Data for the new item (Finding)
    (context) => ({
      name: `Supplier Audit ${
        context?.item?.column_values?.connect_boards__1?.linked_item_ids
          ?.length + 1
      } for ${context.item?.name}`,
    }),
    // Allow extra supplier audits to be created (no skip condition)
    (context) => false,
    // Set the ID in the array of linked audits
    (context, itemId) => {
      const existingItemIds =
        context.item.column_values?.connect_boards__1?.linked_item_ids;
      context.updates.connect_boards__1 = {
        item_ids: [...existingItemIds, itemId],
      };
    },
    // Message for the user
    (context, itemId) => "Created and linked a new Supplier Audit Item."
  );
};

const createQualityEvent = () => {
  return createLinkedBoardItem(
    // Find the boardId for the "Quality Event" from the linked column settings
    (context) => context.item.column_settings.connect_boards5__1.boardIds[0],
    // Data for the new item (Finding)
    (context) => ({
      name:
        `Quality Event ${
          context?.item?.column_values?.connect_boards5__1?.linked_item_ids
            ?.length + 1
        } for ${context.item?.name}` || "Quality Event Item",
      people__1: context.item.column_values?.people__1.persons_and_teams
        .map((person) => person.id)
        .join(", "),
    }),
    // Allow extra "Quality Events" to be created (no skip condition)
    (context) => false,
    // Set the ID in the array of linked "Quality Events"
    (context, itemId) => {
      const existingItemIds =
        context.item.column_values?.connect_boards5__1?.linked_item_ids;
      context.updates.connect_boards5__1 = {
        item_ids: [...existingItemIds, itemId],
      };
    },
    // Message for the user
    (context, itemId) => "Created and linked a new Quality Event Item."
  );
};

const guardRequireConnectedAuditBoard = async (context) => {
  // Always allow if only checking, since we don't want to make API calls to serve
  // the allowed actions.
  if (context.isCheckOnly) {
    return { success: true };
  }

  const boardId = context.item.board.id;
  const mondayClient = context.client;

  if (!boardId || !mondayClient) {
    context.messages.push({
      message: "Some unknown Error ocuured! Please Reload the app!",
      type: "error",
    });

    return {
      success: false,
      reasons: [],
    };
  }

  const query = `
       query {
          boards(ids:${boardId}) {
            columns(ids: ["connect_boards__1"]) {
              settings_str
            }
          }
       }
  `;

  try {
    const response = await mondayClient.api(query);

    // Get the Ids of connected Audit Board
    const connectedAuditBoardIds =
      JSON.parse(response.data.boards[0].columns[0].settings_str).boardIds ||
      [];

    // Checking if User has connected some Audit Table or not
    if (connectedAuditBoardIds.length < 1) {
      const stepsToFollow = [
        "Please install 'Lucie Audit' app, if not installed already.",
        "If installed already, then please connect the 'Audit' board using the 'connect board column' named as 'Supplier Audits' at the end of 'Supplier' board.",
      ];

      context.messages.push({
        message: `"Audits" board not connected with "Supplier" board!\n\nPlease follow the below steps to continue:\n\n- ${stepsToFollow.join(
          "\n- "
        )}`,
        type: "error",
      });

      return {
        success: false,
        reasons: [],
      };
    }
    return { success: true };
  } catch (err) {
    context.messages.push({
      message:
        "Some unknown Error ocuured! Please Reload the app or contact the admin!",
      type: "error",
    });

    return {
      success: false,
      reasons: [],
    };
  }
};

const guardCheckForConnectedAudits = async (context) => {
  // Always allow if only checking, since we don't want to make API calls to serve
  // the allowed actions.
  if (context.isCheckOnly) {
    return { success: true };
  }

  const boardId = context.item.board.id;
  const mondayClient = context.client;

  if (!boardId || !mondayClient) {
    context.messages.push({
      message: "Some unknown Error ocuured! Please Reload the app!",
      type: "error",
    });

    return {
      success: false,
      reasons: [],
    };
  }

  const auditIds = context.item.column_values.connect_boards__1.linked_item_ids;

  // Checking if User Item has Audit Childs
  if (auditIds.length < 1) {
    return { success: true };
  }
  context.messages.push({
    message:
      "Once all the Audits are closed (either Done or Cancelled), this action will be triggered automatically!",
    type: "error",
  });

  return {
    success: false,
    reasons: [],
  };
};

// --- SUPPLIER WORKFLOW TRANSITIONS ---
const supplierTransitions = {
  [supplierStates.DRAFT]: {
    [supplierActions.CANCEL]: {
      guards: [
        userAssignedInField([
          supplierRoleFields.creationLog,
          supplierRoleFields.supplierManager,
        ]),
      ],
      effects: [
        // Send Notification
      ],
      newState: supplierStates.CLOSED_CANCELLED,
    },
    [supplierActions.SUBMIT]: {
      guards: [
        hasRequiredFields(onBoardingFields),
        userAssignedInField([
          supplierRoleFields.creationLog,
          supplierRoleFields.supplierManager,
        ]),
      ],
      effects: [],
      newState: supplierStates.ON_BOARDING,
    },
  },
  [supplierStates.ON_BOARDING]: {
    [supplierActions.CANCEL]: {
      guards: [
        userAssignedInField([
          supplierRoleFields.creationLog,
          supplierRoleFields.supplierManager,
        ]),
      ],
      effects: [
        // Send Notification
      ],
      newState: supplierStates.CLOSED_CANCELLED,
    },
    [supplierActions.ON_BOARDING_COMPLETED]: {
      guards: [
        hasRequiredFields(onBoardingFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [],
      newState: supplierStates.SUPPLIER_ASSESSMENT,
    },
  },
  [supplierStates.SUPPLIER_ASSESSMENT]: {
    [supplierActions.RETURN_TO_ON_BOARDING]: {
      guards: [
        hasRequiredFields(onBoardingFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [],
      newState: supplierStates.ON_BOARDING,
    },
    [supplierActions.ASSESSMENT_COMPLETED]: {
      guards: [
        hasRequiredFields(supplierAssessmentFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
        guardCheckForConnectedAudits,
      ],
      effects: [],
      newState: supplierStates.SUPPLIER_APPROVED,
    },
    [supplierActions.CREATE_SUPPLIER_AUDIT]: {
      guards: [
        hasRequiredFields(onBoardingFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
        guardRequireConnectedAuditBoard,
      ],
      effects: [createSupplierAudit()],
      newState: supplierStates.SUPPLIER_ASSESSMENT,
    },
  },

  [supplierStates.SUPPLIER_APPROVED]: {
    [supplierActions.RE_ASSESSMENT_REQUIRED]: {
      guards: [
        hasRequiredFields(supplierAssessmentFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [],
      newState: supplierStates.SUPPLIER_ASSESSMENT,
    },
    [supplierActions.DISQUALIFIED]: {
      requiresESignature: true,
      guards: [
        hasRequiredFields(disqualifiedFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [],
      newState: supplierStates.DISQUALIFIED,
    },
    [supplierActions.IN_ACTIVATED]: {
      requiresESignature: true,
      guards: [
        hasRequiredFields(inActivatedFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [],
      newState: supplierStates.IN_ACTIVATED,
    },
    [supplierActions.RESTRICTED]: {
      requiresESignature: true,
      guards: [
        hasRequiredFields(restrictedFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [],
      newState: supplierStates.RESTRICTED,
    },
    [supplierActions.CREATE_QUALITY_EVENT]: {
      guards: [
        hasRequiredFields(onBoardingFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [createQualityEvent()],
      newState: supplierStates.SUPPLIER_APPROVED,
    },
  },
  [supplierStates.DISQUALIFIED]: {
    [supplierActions.RETURN_TO_SUPPLIER_ASSESSMENT]: {
      guards: [
        hasRequiredFields(disqualifiedFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [],
      newState: supplierStates.SUPPLIER_ASSESSMENT,
    },
  },
  [supplierStates.IN_ACTIVATED]: {
    [supplierActions.RETURN_TO_SUPPLIER_APPROVED]: {
      guards: [
        hasRequiredFields(inActivatedFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [],
      newState: supplierStates.SUPPLIER_APPROVED,
    },
  },
  [supplierStates.RESTRICTED]: {
    [supplierActions.RETURN_TO_SUPPLIER_APPROVED]: {
      guards: [
        hasRequiredFields(restrictedFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [],
      newState: supplierStates.SUPPLIER_APPROVED,
    },
  },
};

// --- SUPPLIER WORKFLOW STATE MACHINE ---
export const supplierStateMachine = new WorkflowStateMachine(
  supplierTransitions,
  ["item"],
  "item.column_values.status__1.label",
  supplierActions,
  desiredStateFlow
);
