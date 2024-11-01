import { MondayNotificationService } from "../services/monday-notification.js";
import logger from "../helpers/logger.js";
import {
  createItem,
  loadItemToObject,
  loadItemsToObject,
} from "../services/monday-service.js";
import {
  canPerformAction,
  performAction,
} from "../services/qms-workflow-service.js";
import { ACTION_SOURCE } from "../constants/general.js";

const TAG = "effects";

export const sendNotification =
  (messageTemplate, recipientsGetter) => async (context) => {
    const message = messageTemplate(context);
    const recipients = recipientsGetter(context);
    if (!recipients || recipients.length === 0) {
      logger.info("No recipients for notification", TAG, {
        itemId: context.item.id,
        message,
      });
      return { success: true };
    }
    console.log("Sending notification:", message);
    const notifier = new MondayNotificationService(context.client);
    console.log(recipients, message);
    await notifier.sendNotificationToMondayItem(
      context.item.id,
      recipients,
      message
    );
    return { success: true };
  };

export const createLinkedBoardItem =
  (
    boardIdGetter,
    columnValuesGetter,
    skipCondition,
    idCallback,
    messageGetter = null
  ) =>
  async (context) => {
    if (skipCondition(context)) {
      return { success: true };
    }
    const boardId = boardIdGetter(context);
    const columnValues = columnValuesGetter(context);
    const itemName = columnValues.name;
    delete columnValues.name;
    const { id, url } = await createItem(
      context.client,
      boardId,
      itemName,
      columnValues
    );
    idCallback(context, id);
    // Add a message to the context which will be shown to the user
    let message = "Created new linked item";
    if (messageGetter) {
      message = messageGetter(context, id);
    }
    context.messages.push({
      message, // Item name is unknown at this point
      item_url: url,
      type: "info",
    });
    return { success: true };
  };

export const performWorkflowAction =
  (itemIdsGetter, userGetter, action, skipItemGetter = null) =>
  async (context) => {
    const itemIds = itemIdsGetter(context);

    if (!itemIds || itemIds.length === 0) {
      logger.info("No itemIds in performWorkflowAction, skipping fetch", TAG, {
        itemId: context.item.id,
      });
      return { success: true };
    }

    const user = userGetter(context);
    const loadedItems = await loadItemsToObject(context.client, itemIds);
    let processableItems = [];

    for (const loadedItem of loadedItems) {
      if (skipItemGetter && skipItemGetter(loadedItem)) {
        logger.info("Skipping item in performWorkflowAction", TAG, {
          itemId: loadedItem.id,
        });
        continue;
      }
      processableItems.push(loadedItem);
    }

    if (!processableItems || processableItems.length === 0) {
      logger.info(
        "No processableItems in performWorkflowAction, skipping action",
        TAG,
        {
          itemId: context.item.id,
        }
      );
      return { success: true };
    }

    let proceedable = true;
    for (const loadedItem of processableItems) {
      const result = await canPerformAction(
        context.req,
        loadedItem,
        loadedItem.board,
        action,
        user,
        context.client,
        ACTION_SOURCE.SYSTEM
      );
      if (!result.canPerformAction) {
        context.messages.push({
          item_url: loadedItem.url,
          message: `Linked item "${
            loadedItem.name
          }" has validation errors when performing linked action "${action}". Please correct the following: \n\n - ${result.reasons.join(
            "\n\n - "
          )}`,
          type: "error",
        });
        proceedable = false;
      }
    }
    if (!proceedable) {
      return { success: false };
    }

    // Perform the state transition and any side effects for each itemId
    for (const loadedItem of processableItems) {
      const itemId = loadedItem.id;
      // TODO: it would be helpful to have a way to skip the checks since we've just done them above
      const result = await performAction(
        context.req,
        loadedItem,
        loadedItem.board,
        action,
        user,
        false, // No pin required
        context.client,
        ACTION_SOURCE.SYSTEM
      );

      if (!result.success) {
        return result;
      }

      logger.info("Performed sub-action", TAG, {
        itemId,
      });

      // Add a message to the context which will be shown to the user
      context.messages.push({
        message: `Performed action "${action}" on item "${loadedItem.name}"`,
        item_url: loadedItem.url,
        type: "info",
      });
    }

    return { success: true };
  };

export const addItemToContext =
  (itemIdGetter, destinationContextKey, optional = false) =>
  async (context) => {
    const itemId = itemIdGetter(context);
    if (!itemId) {
      logger.error("No itemId in addItemToContext, skipping fetch", TAG, {
        parentItemId: context.item.id,
        childItemId: itemId,
      });
      return { success: optional };
    }
    context[destinationContextKey] = await loadItemToObject(
      context.client,
      itemId
    );
    logger.info("Added item to context", TAG, {
      itemId,
      name: context[destinationContextKey].name,
      destinationContextKey,
    });
    return { success: true };
  };
