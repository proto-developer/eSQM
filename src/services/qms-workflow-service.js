import { getWorkflowByName } from "../statemachine/index.js";
import { changeColumnValueMultiple } from "./monday-service.js";
import { createAuditRecord } from "./audit-record.js";
import logger from "../helpers/logger.js";
import { esignValidatePin, esignCreateRecordHTML } from "./esign-service.js";

const TAG = "qms-workflow-service";

export const getPermissableActions = async (req, item, board, user) => {
  /* Get the actions that the user can take on the item */

  logger.info("Getting permissable actions", TAG, {
    boardName: board.name,
    itemState: item.column_values.status__1.label,
  });

  const boardName = board.name;
  const workflow = getWorkflowByName(boardName);

  logger.info("Workflow", TAG, { workflow });

  const itemState = item.column_values.status__1.label;

  const context = { item, user, isCheckOnly: true };

  const permissableActions = await workflow.validPermittedTransitions(
    itemState,
    context
  );

  logger.info("Permissable actions", TAG, { permissableActions });

  // Send false for requires e-signature if the flag is not enabled
  // or if the transition does not have the property set

  // permissableActions.forEach((transition) => {
  //   transition.requireESignature =
  //     req.getFlagEnabled(req.FLAGS.ENABLE_ESIGN) &&
  //     (transition.requireESignature || false);
  // });

  return {
    permissableActions, // response is in the form [{key, title, etc}]
    desiredStateFlow: workflow.desiredStateFlow,
  };
};

export const canPerformAction = async (
  req,
  item,
  board,
  action,
  user,
  client,
  source
) => {
  const boardName = board.name;
  const workflow = getWorkflowByName(boardName);

  const result = await workflow.checkTransition(action, {
    item,
    user,
    client,
    source,
    isCheckOnly: true,
    req,
  });

  if (!result.canPerformAction) {
    console.log(
      "Cannot perform action",
      action,
      "on",
      boardName,
      "item",
      item.id,
      "with state",
      item.column_values.status.label,
      "reasons",
      result.reasons
    );
  }
  return result;
};

export const performAction = async (
  req,
  item,
  board,
  action,
  user,
  pin,
  client,
  source
) => {
  /* Perform the action on the item */
  const boardName = board.name;
  const workflow = getWorkflowByName(boardName);
  const itemState = item.column_values.status__1.label;
  // const esignEnabled = req.getFlagEnabled(req.FLAGS.ENABLE_ESIGN);
  const hasPin = !!pin;
  const pinValid = !!pin ? await esignValidatePin(client, user, pin) : false;

  // logger.info("Performing action", TAG, {
  //   action,
  //   boardName,
  //   itemId: item.id,
  //   itemName: item.name,
  //   itemState,
  //   hasPin,
  //   pinValid,
  //   isCheckOnly: false,
  // });

  const update = await workflow.performAction(action, {
    item,
    user,
    client,
    source,
    hasPin,
    pinValid,
    // esignEnabled,
    req,
  });

  //
  if (!update.success) {
    const resp = {
      success: false,
      reasons: update.reasons,
      messages: update.messages,
    };
    logger.warn("Failed to update", TAG, resp);
    console.error("Failed to update", TAG, resp);
    return resp;
  }
  // logger.info("Writing update", TAG, {
  //   updates: update.updates,
  //   messages: update.messages,
  // });

  let itemUpdate;

  try {
    itemUpdate = await changeColumnValueMultiple(
      client,
      board.id,
      item.id,
      update.updates
    );
  } catch (e) {
    console.error("Failed to save result", e);
    return {
      success: false,
      error: "Failed to save result",
      extra: JSON.stringify(e),
    };
  }

  let esignRecord = "";
  if (update.context.transition.requiresESignature) {
    esignRecord = await esignCreateRecordHTML(update);
  }

  const { success: auditRecordSuccess } = await createAuditRecord(
    client,
    itemUpdate.item,
    user,
    action,
    esignRecord
  );

  return {
    success: true,
    messages: update.messages,
    nextState: update.nextState,
  };
};
