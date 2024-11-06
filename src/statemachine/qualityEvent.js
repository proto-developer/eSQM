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

// --- QUALITY EVENT WORKFLOW STATES ---
export const qualityEventStates = {
  OPENED: "Opened",
  CAPA_PLAN: "CAPA Plan",
  CLOSED_DONE: "Closed - Done",
  CLOSED_CANCELLED: "Closed - Cancelled",
};

// --- DESIRED STATE FLOW ---
const desiredStateFlow = [
  supplierStates.OPENED,
  supplierStates.CAPA_PLAN,
  supplierStates.CLOSED_DONE,
];

// --- QUALITY EVENT WORKFLOW ACTIONS ---
export const qualityEventActions = {
  CANCEL: "Cancel",
  SUBMIT: "Submit",
  RETURN_TO_OPENED: "Return to Opened",
  CREATE_SUPPLIER_CAPA: "Create Supplier CAPA",
  CLOSE_EVENT: "Close Event",
};

// --- REQUIRED FIELDS FOR DIFFERENT STATES ---
const requiredFields = [
  "people__1",
  "description__1",
  "date__1",
  "dropdown9__1",
  "dropdown3__1",
  "dropdown30__1",
  "long_text2__1",
];

// --- ROLE FIELDS FOR ACCESS TO PERFORM DIFFERENT ACTIONS ---
const qualityEventRoleFields = {
  creationLog: "creation_log__1",
  QA: "people__1",
};

// --- SUPPLIER WORKFLOW EFFECTS ---
const createSupplierCAPA = () => {
  return createLinkedBoardItem(
    // Find the boardId for the "CAPA" from the linked column settings
    (context) => context.item.column_settings.connect_boards__1.boardIds[0],
    // Data for the new item (Finding)
    (context) => ({
      name: "Supplier CAPA",
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
    (context, itemId) => "Created and linked a new Supplier CAPA Item."
  );
};

// --- QUALITY EVENT WORKFLOW TRANSITIONS ---
const qualityEventTransitions = {
  [qualityEventStates.OPENED]: {
    [qualityEventActions.CANCEL]: {
      guards: [
        userAssignedInField([
          qualityEventRoleFields.creationLog,
          qualityEventRoleFields.QA,
        ]),
      ],
      effects: [
        // Send Notification
      ],
      newState: qualityEventStates.CLOSED_CANCELLED,
    },
    [qualityEventActions.SUBMIT]: {
      guards: [
        hasRequiredFields(requiredFields),
        userAssignedInField([
          qualityEventRoleFields.creationLog,
          qualityEventRoleFields.QA,
        ]),
      ],
      effects: [
        // Send Notification to "Assigned To" Field
      ],
      newState: qualityEventStates.CAPA_PLAN,
    },
  },

  [qualityEventStates.CAPA_PLAN]: {
    [qualityEventActions.RETURN_TO_OPENED]: {
      guards: [
        userAssignedInField([
          qualityEventRoleFields.creationLog,
          qualityEventRoleFields.QA,
        ]),
      ],
      effects: [
        // Send Notification
      ],
      newState: qualityEventStates.OPENED,
    },
    [qualityEventActions.CREATE_SUPPLIER_CAPA]: {
      guards: [
        userAssignedInField([
          qualityEventRoleFields.creationLog,
          qualityEventRoleFields.QA,
        ]),
        hasRequiredFields(requiredFields),
      ],
      effects: [createSupplierCAPA()],
      newState: qualityEventStates.CAPA_PLAN,
    },
    [qualityEventActions.CLOSE_EVENT]: {
      guards: [
        userAssignedInField([
          qualityEventRoleFields.creationLog,
          qualityEventRoleFields.QA,
        ]),
        hasRequiredFields(requiredFields),
      ],
      effects: [
        // Send Notification
      ],
      newState: qualityEventStates.CLOSED_DONE,
    },
  },
};

// --- QUALITY EVENT WORKFLOW STATE MACHINE ---
export const qualityEventStateMachine = new WorkflowStateMachine(
  qualityEventTransitions,
  ["item"],
  qualityEventActions,
  desiredStateFlow
);
