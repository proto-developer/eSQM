import { WorkflowStateMachine } from "./base.js";
import { sendNotification, createLinkedBoardItem } from "./effects.js";
import {
  hasRequiredFields,
  userAssignedInField,
  allowSubmitIfStandalone,
} from "./guards.js";

// --- QUALITY EVENT WORKFLOW STATES ---
export const qualityEventStates = {
  OPENED: "Opened",
  CAPA_PLAN: "CAPA Plan",
  CLOSED_DONE: "Closed - Done",
  CLOSED_CANCELLED: "Closed - Cancelled",
};

// --- DESIRED STATE FLOW ---
const desiredStateFlow = [
  qualityEventStates.OPENED,
  qualityEventStates.CAPA_PLAN,
  qualityEventStates.CLOSED_DONE,
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
  "location_of_event_mkkaa015",
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
      name: `CAPA ${
        context?.item?.column_values?.connect_boards__1?.linked_item_ids
          ?.length + 1
      } for ${context.item?.name}`,

      person: {
        personsAndTeams:
          context.item.column_values.people__1?.persons_and_teams || [],
      },
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
        sendNotification(
          (context) =>
            `${context.item.name} submitted to "${qualityEventStates.CAPA_PLAN}"`,
          (context) => context.item.column_values?.people__1.persons_and_teams
        ),
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
        hasRequiredFields(requiredFields),
        allowSubmitIfStandalone(
          (context) =>
            context.item.column_values.connect_boards__1.linked_item_ids,
          (context) =>
            'Quality Event will be automatically submitted when all Supplier CAPAs are marked as "Closed - Completed" or "Closed - Cancelled".',
          userAssignedInField([
            qualityEventRoleFields.creationLog,
            qualityEventRoleFields.QA,
          ])
        ),
      ],
      effects: [
        // Send Notification
        sendNotification(
          (context) =>
            `${context.item.name} moved to "${qualityEventStates.CLOSED_DONE}"`,
          (context) => context.item.column_values?.people__1.persons_and_teams
        ),
      ],
      newState: qualityEventStates.CLOSED_DONE,
    },
  },
};

// --- QUALITY EVENT WORKFLOW STATE MACHINE ---
export const qualityEventStateMachine = new WorkflowStateMachine(
  qualityEventTransitions,
  ["item"],
  "item.column_values.status__1.label",
  qualityEventActions,
  desiredStateFlow
);
