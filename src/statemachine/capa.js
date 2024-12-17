import { WorkflowStateMachine } from "./base.js";
import {
  sendNotification,
  createLinkedBoardItem,
  addItemToContext,
  performWorkflowAction,
} from "./effects.js";
import {
  loadItemToObject,
  loadItemsToObject,
} from "../services/monday-service.js";
import { performAction } from "../services/qms-workflow-service.js";
import logger from "../helpers/logger.js";
import {
  hasRequiredFields,
  userAssignedInField,
  allowSubmitIfStandalone,
  preventAssignedUserPerformingAction,
} from "./guards.js";
import { effectivenessCheckActions } from "./effectiveness-check.js";
import { ACTION_SOURCE } from "../constants/general.js";

const TAG = "capa";

export const capaStates = {
  DRAFT: "Draft",
  CAPA_IN_PROGRESS: "In Progress",
  PENDING_CAPA_CLOSURE: "QA Approval",
  CLOSED_CANCELLED: "Closed - Cancelled",
  CLOSED_DONE: "Closed - Completed",
};

const desiredStateFlow = [
  capaStates.DRAFT,
  capaStates.CAPA_IN_PROGRESS,
  capaStates.PENDING_CAPA_CLOSURE,
  capaStates.CLOSED_DONE,
];

export const capaActions = {
  CANCEL: "Cancel",
  SUBMIT: "Submit",
  CAPA_COMPLETED: "CAPA Completed",
  REJECT_TO_IN_PROGRESS: "Reject to CAPA in Progress",
  CLOSE_COMPLETE: "CAPA Approved",
};

const fieldsForInProgress = [
  "person",
  "due_date",
  "capa_class",
  "deliverables",
  "classification",
];

const fieldsForPendingQA = [
  ...fieldsForInProgress,
  "actions_taken",
  "qa_approvers",
];

const fieldsForClosedDone = [
  ...fieldsForPendingQA,
  "requires_ec",
  "qa_summary",
];

const roleFields = {
  originator: "creation_log__1",
  implementor: "person",
  qa_approver: "qa_approvers",
};

export const closeQualityEventOnLastCAPAClosing = async (context) => {
  /*
  TODO: This code was originally only for deviations, but parent items can now also be complaints
    The references to `qualityEventId` etc should be updated to `parentId`.
  */

  const qualityEventId =
    context.item.column_values.link_to_quality_event_mkkae0t0
      ?.linked_item_ids[0];

  if (!qualityEventId) {
    logger.info("No parent linked to Quality Item item", TAG, {
      itemId: context.item.id,
    });
    return { success: true };
  }

  const qualityEvent = await loadItemToObject(context.client, qualityEventId);

  const qualityEventState = qualityEvent.column_values.status__1.label;
  if (qualityEventState !== "CAPA Plan") {
    logger.info("Parent not in correct state to close", TAG, {
      qualityEvent: qualityEvent.id,
      state: qualityEventState,
    });
    context.messages.push({
      message: `Parent "${qualityEvent.name}" in unexpected state "${qualityEventState}" - Contact your administrator.`,
      item_url: qualityEvent.url,
      type: "error",
    });

    return { success: false };
  }

  const currentItemId = context.item.id;

  const allCapaIds =
    qualityEvent.column_values.connect_boards__1?.linked_item_ids || [];

  const otherCapaIds = allCapaIds.filter((id) => id !== currentItemId);
  const hasOtherCapas = otherCapaIds.length > 0;

  // Load other CAPAs linked to the qualityEvent
  let allClosed = false;
  if (hasOtherCapas) {
    const capas = await loadItemsToObject(context.client, otherCapaIds);

    const otherCapaStates = capas.map(
      (capa) => capa.column_values.status__1.label
    );

    allClosed = otherCapaStates.every(
      (state) =>
        state === capaStates.CLOSED_DONE ||
        state === capaStates.CLOSED_CANCELLED
    );

    logger.info("CAPA has siblings", TAG, {
      otherStates: otherCapaStates,
      allClosed,
    });
  } else {
    logger.info("CAPA has no siblings", TAG, {});
  }

  // If there are no other CAPAs, or all capas are complete, we can close the qualityEvent
  if (!hasOtherCapas || allClosed) {
    // Perform the state transition and any side effects
    // N.b. the action is set as a string here to avoid circular dependencies, but this should be refactored
    // so that constants live somewhere else.

    const action = "Close Event";
    const result = await performAction(
      context.req,
      qualityEvent,
      qualityEvent.board,
      action,
      context.user,
      false, // No pin required
      context.client,
      ACTION_SOURCE.SYSTEM
    );

    if (!result.success) {
      context.messages.push({
        message: `Could not perform "${action}" on item ${
          qualityEvent.name
        } due to: \n\n - ${result.reasons.join("\n\n - ")}`,
        item_url: qualityEvent.url,
        type: "error",
      });
      return result;
    }

    logger.info("Performed sub-action", TAG, {
      itemId: qualityEvent.id,
    });
    // Add a message to the context which will be shown to the user
    context.messages.push({
      message: `Performed action "${action}" on item ${qualityEvent.name} since all CAPAs are complete`,
      item_url: qualityEvent.url,
      type: "info",
    });
  } else {
    context.messages.push({
      message: `Parent ${qualityEvent.name} left open since some CAPAs are not closed.`,
      item_url: qualityEvent.url,
      type: "info",
    });
  }

  return { success: true };
};

const capaTransitions = {
  [capaStates.DRAFT]: {
    [capaActions.CANCEL]: {
      guards: [
        userAssignedInField([roleFields.originator, roleFields.implementor]),
      ],
      effects: [],
      newState: capaStates.CLOSED_CANCELLED,
    },
    [capaActions.SUBMIT]: {
      guards: [
        hasRequiredFields(fieldsForInProgress),
        // allowSubmitIfStandalone(
        //   (context) =>
        //     context.item.column_values.link_to_deviations__1.linked_item_ids,
        //   (context) =>
        //     'CAPA will be automatically submitted when parent is marked as "CAPA Plan completed"',
        //   userAssignedInField([roleFields.originator, roleFields.implementor])
        // ),
        userAssignedInField([roleFields.originator, roleFields.implementor]),
      ],
      effects: [
        sendNotification(
          (context) =>
            `${context.item.name} submitted to "${capaStates.CAPA_IN_PROGRESS}"`,
          (context) => context.item.column_values?.person.persons_and_teams
        ),
      ],
      newState: capaStates.CAPA_IN_PROGRESS,
    },
  },
  [capaStates.CAPA_IN_PROGRESS]: {
    [capaActions.CAPA_COMPLETED]: {
      requiresESignature: true,
      guards: [
        hasRequiredFields(fieldsForPendingQA),
        userAssignedInField([roleFields.implementor]),
      ],
      effects: [
        sendNotification(
          (context) =>
            `CAPA "${context.item.name}" has been submitted to "${capaStates.PENDING_CAPA_CLOSURE}"`,
          (context) =>
            context.qualityEvent?.column_values?.qa_approvers.persons_and_teams
        ),
      ],
      newState: capaStates.PENDING_CAPA_CLOSURE,
    },
  },
  [capaStates.PENDING_CAPA_CLOSURE]: {
    [capaActions.CLOSE_COMPLETE]: {
      requiresESignature: false,
      guards: [
        hasRequiredFields(fieldsForClosedDone),
        userAssignedInField([roleFields.qa_approver]),
        preventAssignedUserPerformingAction(
          roleFields.implementor,
          roleFields.qa_approver
        ),
      ],
      effects: [
        // createLinkedBoardItem(
        //   // Find the boardId for the effectiveness check from the linked column settings
        //   (context) =>
        //     context.item.column_settings.effectiveness_checks.boardIds[0],
        //   // Data for the new item
        //   (context) => ({
        //     name:
        //       context.item.column_values?.ec_desc?.text ||
        //       `EC for ${context.item.name}`,
        //     qa_approvers: {
        //       personsAndTeams:
        //         context.item.column_values.qa_approvers?.persons_and_teams ||
        //         [],
        //     },
        //     person: {
        //       personsAndTeams:
        //         context.item.column_values.person?.persons_and_teams || [],
        //     },
        //     due_date: context.item.column_values?.review_date?.text,
        //     ec_plan: context.item.column_values?.ec_plan_1?.text,
        //   }),
        //   // Skip condition - if already linked to a EC, or an EC is not needed
        //   (context) =>
        //     !!context.item.column_values?.effectiveness_checks?.linked_item_ids
        //       ?.length ||
        //     !(
        //       context.item.column_values?.requires_ec?.text.toLowerCase() ===
        //       "yes"
        //     ),
        //   // Set the ID in the array of linked ECs
        //   (context, itemId) => {
        //     context.updates.effectiveness_checks = { item_ids: [itemId] };
        //   },
        //   // Set a message
        //   (context, itemId) =>
        //     `Created and linked a new Effectiveness Check "EC for ${context.item.name}"`
        // ),
        // performWorkflowAction(
        //   (context) => context.updates?.effectiveness_checks?.item_ids || [],
        //   (context) => context.user,
        //   effectivenessCheckActions.SUBMIT
        // ),
        closeQualityEventOnLastCAPAClosing,
      ],
      newState: capaStates.CLOSED_DONE,
    },
    [capaActions.REJECT_TO_IN_PROGRESS]: {
      guards: [
        hasRequiredFields(fieldsForInProgress),
        userAssignedInField([roleFields.qa_approver]),
      ],
      effects: [
        sendNotification(
          (context) =>
            `CAPA "${context.item.name}" rejected to "${capaStates.CAPA_IN_PROGRESS}"`,
          (context) => context.item.column_values?.person.persons_and_teams
        ),
      ],
      newState: capaStates.CAPA_IN_PROGRESS,
    },
  },
  [capaStates.CLOSED_DONE]: {},
};

export const capaStateMachine = new WorkflowStateMachine(
  capaTransitions,
  ["item"],
  "item.column_values.status__1.label",
  capaActions,
  desiredStateFlow
);
