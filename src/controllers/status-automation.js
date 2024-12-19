import { changeColumnValue } from "../services/monday-service.js";
import logger from "../helpers/logger.js";
import { getMirrorColumnStatus } from "../services/mirrorCol-status.js";

const TAG = "status_change_automation_controller";

export const changeStatusAutomation = async (req, res) => {
  const { accountId } = req.session;
  const { payload } = req.body;
  logger.info("Executing changeStatusAutomation action", TAG, { accountId });

  const { inputFields } = payload;
  const { boardId, itemId } = inputFields;

  let allClosed;

  try {
    const capaItemsStatuses = await getMirrorColumnStatus(req.monday, itemId);

    //   Check if all capaItemsStatuses are "Closed - Completed" or "Closed - Cancelled"
    allClosed = capaItemsStatuses.every(
      (status) => status === "Closed - Done" || status === "Closed - Cancelled"
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
      "audits_complete_trigger",
      "Default"
    );
    return res.status(400).send({ message: "All Audits are not closed yet!" });
  }

  try {
    await changeColumnValue(
      req.monday,
      boardId,
      itemId,
      "status__1",
      "Supplier Approved"
    );

    await changeColumnValue(
      req.monday,
      boardId,
      itemId,
      "audits_complete_trigger",
      "Default"
    );
    return res.status(200).send({
      message: "Status of Supplier Item has been updated to Supplier Approved",
    });
  } catch (err) {
    logger.error("Couldn't update the status of Supplier Item", TAG, {
      error: err,
    });
    return res.status(500).send({ message: "internal server error" });
  }
};
