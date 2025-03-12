import { changeColumnValue } from "../services/monday-service.js";
import logger from "../helpers/logger.js";
import {
  getAuditItemValues,
  getMirrorColumnStatus,
} from "../services/mirrorCol-status.js";

const TAG = "status_change_automation_controller";

export const changeStatusAutomation = async (req, res) => {
  const { accountId } = req.session;
  const { payload } = req.body;
  logger.info("Executing changeStatusAutomation action", TAG, { accountId });

  const { inputFields } = payload;
  const { boardId, itemId } = inputFields;

  let allClosed;

  // Update the "Last Audit Date" col based on the "Audit End Date"
  try {
    const auditItemValues = await getAuditItemValues(req.monday, itemId);

    // Filter out the Columns which have Status as "Closed - Done"
    const closedDoneColumns = auditItemValues.filter(
      (item) => item[1].text === "Closed - Done"
    );

    const formattedClosedDoneColumns = closedDoneColumns.map((item) => {
      return {
        id: item[1].id,
        text: item[1].text,
        statusUpdatedAt: item[1].updated_at,
        auditEndDateId: item[2].id,
        auditEndDate: item[2].text,
        itemId: item[0].text,
      };
    });

    // Filter out the items whose status is updated most recently
    const mostRecentlyUpdatedStatusCol = formattedClosedDoneColumns.reduce(
      (latest, current) => {
        // Compare the 'statusUpdatedAt' fields (convert to Date objects for proper comparison)
        const latestUpdatedAt = new Date(latest.statusUpdatedAt);
        const currentUpdatedAt = new Date(current.statusUpdatedAt);

        // Return the most recent item
        return currentUpdatedAt > latestUpdatedAt ? current : latest;
      }
    );

    await changeColumnValue(
      req.monday,
      boardId,
      itemId,
      "date6__1",
      mostRecentlyUpdatedStatusCol.auditEndDate || ""
    );
  } catch (err) {
    logger.error(
      "Couldn't update 'Last Audit Date' col of 'Supplier Board'",
      TAG,
      {
        error: err,
      }
    );
  }

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
