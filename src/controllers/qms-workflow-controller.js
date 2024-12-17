import {
  getPermissableActions,
  performAction,
} from "../services/qms-workflow-service.js";
import {
  changeColumnValueMultiple,
  loadItemToObject,
} from "../services/monday-service.js";
import { ConnectionModelService } from "../services/monday-auth-service.js";
// import { board_relation } from "../services/monday-service.js";
import logger from "../helpers/logger.js";
import { getUserDetails } from "../services/monday-user.js";
import { ACTION_SOURCE } from "../constants/general.js";
import { processStatusColSettings } from "../services/monday-column-utils.js";
import _ from "lodash";

const TAG = "qms_workflow_controller";

const accountTokens = new ConnectionModelService();

export const getItemWorkflowState = async (req, res) => {
  /* API endpoint called from the workflow item view to get the data needed for the item view */
  const { item, board } = req.body;

  const { userId } = req.session;

  const [loadedItem, loadedUser] = await Promise.all([
    loadItemToObject(req.monday, item.id),
    getUserDetails(req.monday, userId),
  ]);

  // console.log("loadedItem", loadedItem);
  // console.log("loadedUser", loadedUser);

  logger.info("getItemWorkflowState", TAG, {
    item,
    board,
    userId,
    body: req.body,
  });
  let data;
  try {
    data = await getPermissableActions(req, loadedItem, board, loadedUser);
  } catch (err) {
    console.error("Error getting permissable actions", err);
    logger.error("Error getting permissable actions", TAG, {
      error: err.message,
      item,
      board,
      userId,
    });
    return res.status(500).json({
      error: _.escape(err.message),
    });
  }

  return res.json({
    ...data,
    state: loadedItem.column_values.status__1.label,
    sateInfo: processStatusColSettings(loadedItem.column_settings.status__1),
  });
};

export const performWorkflowAction = async (req, res) => {
  const { item, board, actionName, pin } = req.body;
  const { userId, accountId } = req.session;
  logger.info("performWorkflowAction", TAG, {
    item,
    board,
    actionName,
    userId,
    body: req.body,
    accountId,
    hasPin: !!pin,
  });

  const [loadedItem, loadedUser] = await Promise.all([
    loadItemToObject(req.monday, item.id),
    getUserDetails(req.monday, userId),
  ]);

  if (!loadedItem.id) {
    return res.status(200).json({
      success: false,
      error: "Item not found",
    });
  }

  if (loadedItem.column_values.status__1.label != item.state) {
    return res.status(200).json({
      success: false,
      // error: "Item status has changed",
      error:
        "Item may have been updated. Please refresh the page and try again!",
    });
  }

  const update = await performAction(
    req,
    loadedItem,
    board,
    actionName,
    loadedUser,
    pin,
    req.monday,
    ACTION_SOURCE.USER
  );

  if (update.success) {
    logger.info("Successfully updated item", TAG, {
      itemId: item.id,
      state: update.nextState,
    });

    return res.json({
      success: true,
      nextState: update.nextState,
      messages: update.messages,
    });
  } else {
    return res.status(200).json({
      success: false,
      reasons: update.reasons,
      messages: update.messages,
    });
  }
};
