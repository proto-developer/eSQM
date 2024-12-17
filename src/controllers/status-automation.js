import { getBoardItemHighestNumber } from "../services/monday-count.js";
import { changeColumnValue } from "../services/monday-service.js";
import logger from "../helpers/logger.js";
import { getMirrorColumnStatus } from "../services/mirrorCol-status.js";

const TAG = "status_change_automation_controller";

export const changeStatusAutomation = async (req, res) => {
  const { accountId, shortLivedToken } = req.session;
  const { payload } = req.body;
  logger.info("Executing assignAutoNumber action", TAG, { accountId });

  const { inputFields } = payload;
  const { boardId, itemId } = inputFields;

  let allClosed;

  try {
    const capaItemsStatuses = await getMirrorColumnStatus(req.monday, itemId);

    //   Check if all capaItemsStatuses are "Closed - Completed" or "Closed - Cancelled"
    allClosed = capaItemsStatuses.every(
      (status) =>
        status === "Closed - Completed" || status === "Closed - Cancelled"
    );
  } catch (err) {
    logger.error("Couldn't find Mirror Col's Statuses", TAG, { error: err });
    return res.status(500).send({ message: "internal server error" });
  }

  // If all capaItemsStatuses are "Closed - Completed" or "Closed - Cancelled", then change the status of the item to "Closed - Completed"
  if (!allClosed) {
    await changeColumnValue(
      req.monday,
      boardId,
      itemId,
      "status_1_mkk9tm24",
      "Draft"
    );
    return res.status(400).send({ message: "All CAPA Items are not closed" });
  }

  try {
    await changeColumnValue(
      req.monday,
      boardId,
      itemId,
      "status__1",
      "Closed - Done"
    );
    return res.status(200).send({});
  } catch (err) {
    logger.error("Couldn't update the status of QE Item", TAG, { error: err });
    return res.status(500).send({ message: "internal server error" });
  }
};
