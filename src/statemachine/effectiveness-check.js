import { WorkflowStateMachine } from "./base.js";
import { sendNotification, addItemToContext } from "./effects.js";
import {
  hasRequiredFields,
  userAssignedInField,
  preventAssignedUserPerformingAction,
  allowSubmitIfStandalone,
} from "./guards.js";
import { ACTION_SOURCE } from "../constants/general.js";

export const effectivenessCheckStates = {
  DRAFT: "Draft",
  EC_IN_PROGRESS: "In Progress",
  PENDING_EC_APPROVAL: "QA Approval",
  CLOSED_CANCELLED: "Closed - Cancelled",
  CLOSED_DONE: "Closed - Completed",
};

const desiredStateFlow = [
  effectivenessCheckStates.DRAFT,
  effectivenessCheckStates.EC_IN_PROGRESS,
  effectivenessCheckStates.PENDING_EC_APPROVAL,
  effectivenessCheckStates.CLOSED_DONE,
];

export const effectivenessCheckActions = {
  CANCEL: "Cancel EC",
  SUBMIT: "Submit",
  EC_COMPLETED: "EC completed",
  REJECT_TO_IN_PROGRESS: "Reject to EC in Progress",
  APPROVE: "EC Approved",
};

const fieldsForInProgress = ["person", "ec_plan"];

const fieldsForPendingApproval = [
  ...fieldsForInProgress,
  "ec_results",
  "qa_approvers",
];

const fieldsForClosedDone = [...fieldsForPendingApproval, "qa_summary"];

const roleFields = {
  originator: "creation_log__1",
  implementor: "person",
  qa_approver: "qa_approvers",
};

const effectivenessCheckTransitions = {
  [effectivenessCheckStates.DRAFT]: {
    [effectivenessCheckActions.SUBMIT]: {
      guards: [
        hasRequiredFields(fieldsForInProgress),
        allowSubmitIfStandalone(
          (context) =>
            context.item.column_values.link_to_capas__1.linked_item_ids,
          (context) =>
            'Effectiveness Check will be automatically submitted when the linked CAPA is completed"',
          userAssignedInField([
            roleFields.originator,
            roleFields.implementor,
            roleFields.qa_approver,
          ])
        ),
      ],
      effects: [
        sendNotification(
          (context) =>
            `${context.item.name} submitted to "${effectivenessCheckStates.EC_IN_PROGRESS}"`,
          (context) => context.item.column_values?.person.persons_and_teams
        ),
      ],
      newState: effectivenessCheckStates.EC_IN_PROGRESS,
    },
  },
  [effectivenessCheckStates.EC_IN_PROGRESS]: {
    [effectivenessCheckActions.CANCEL]: {
      requiresESignature: true,
      guards: [userAssignedInField([roleFields.implementor])],
      effects: [],
      newState: effectivenessCheckStates.CLOSED_CANCELLED,
    },
    [effectivenessCheckActions.EC_COMPLETED]: {
      requiresESignature: true,
      guards: [
        hasRequiredFields(fieldsForPendingApproval),
        userAssignedInField([roleFields.implementor]),
      ],
      effects: [
        addItemToContext(
          (context) =>
            context.item.column_values.link_to_capas__1.linked_item_ids[0],
          "capa"
        ),
        sendNotification(
          (context) =>
            `${context.item.name} which was linked to your CAPA ${context.capa?.name} has been moved to "${effectivenessCheckStates.PENDING_EC_APPROVAL}"`,
          (context) => context.capa?.column_values?.person?.persons_and_teams
        ),
      ],
      newState: effectivenessCheckStates.PENDING_EC_APPROVAL,
    },
  },
  [effectivenessCheckStates.PENDING_EC_APPROVAL]: {
    [effectivenessCheckActions.APPROVE]: {
      requiresESignature: true,
      guards: [
        hasRequiredFields(fieldsForClosedDone),
        userAssignedInField([roleFields.qa_approver]),
        preventAssignedUserPerformingAction(
          roleFields.implementor,
          roleFields.qa_approver
        ),
      ],
      effects: [],
      newState: effectivenessCheckStates.CLOSED_DONE,
    },
    [effectivenessCheckActions.REJECT_TO_IN_PROGRESS]: {
      guards: [userAssignedInField([roleFields.qa_approver])],
      effects: [
        sendNotification(
          (context) =>
            `${context.item.name} rejected to "${effectivenessCheckStates.EC_IN_PROGRESS}"`,
          (context) => context.item.column_values?.person.persons_and_teams
        ),
      ],
      newState: effectivenessCheckStates.EC_IN_PROGRESS,
    },
  },
  [effectivenessCheckStates.CLOSED_DONE]: {},
};

export const effectivenessCheckStateMachine = new WorkflowStateMachine(
  effectivenessCheckTransitions,
  ["item"],
  "item.column_values.status__1.label",
  effectivenessCheckActions,
  desiredStateFlow
);
