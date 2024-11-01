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
  DISQUALIFIED: "Disqualified",
  IN_ACTIVATED: "In-activated",
  RESTRICTED: "Restricted",
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
const inActivatedFields = [...onBoardingFields];
const disqualifiedFields = [...onBoardingFields];
const restrictedFields = [...onBoardingFields];
const closedCancelledFields = [...onBoardingFields];

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
      name: "Supplier Audit",
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
      name: context.item?.name || "Supplier QE",
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
      ],
      effects: [],
      newState: supplierStates.SUPPLIER_APPROVED,
    },
    [supplierActions.CREATE_SUPPLIER_AUDIT]: {
      guards: [
        hasRequiredFields(supplierAssessmentFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
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
      guards: [
        hasRequiredFields(disqualifiedFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [],
      newState: supplierStates.DISQUALIFIED,
    },
    [supplierActions.IN_ACTIVATED]: {
      guards: [
        hasRequiredFields(inActivatedFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [],
      newState: supplierStates.IN_ACTIVATED,
    },
    [supplierActions.RESTRICTED]: {
      guards: [
        hasRequiredFields(restrictedFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [],
      newState: supplierStates.RESTRICTED,
    },
    [supplierActions.CREATE_QUALITY_EVENT]: {
      guards: [
        hasRequiredFields(supplierApprovedFields),
        userAssignedInField([supplierRoleFields.supplierManager]),
      ],
      effects: [createQualityEvent()],
      newState: supplierStates.SUPPLIER_APPROVED,
    },
  },
};

// --- SUPPLIER WORKFLOW STATE MACHINE ---
export const supplierStateMachine = new WorkflowStateMachine(
  supplierTransitions,
  ["item"],
  supplierActions,
  desiredStateFlow
);
