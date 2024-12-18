import {
  changeColumnValue,
  loadItemToObject,
} from "../services/monday-service.js";
import logger from "../helpers/logger.js";
import { calNextAuditDate } from "../services/nextAuditDate-service.js";

const TAG = "nextAuditDate_calculation_controller";

export const calculateNextAuditDate = async (req, res) => {
  const { accountId } = req.session;
  const { payload } = req.body;
  logger.info("Executing calculateNextAuditDate action", TAG, { accountId });

  const { inputFields } = payload;
  const { boardId, itemId } = inputFields;

  // Load the current Item from Monday
  const currentItem = await loadItemToObject(req.monday, itemId);

  // Set the values of the "Last Audit Date" and "Audit Frequency"
  const lastAuditDate = currentItem.column_values.date6__1.text;
  const auditFrequencyInMonths = currentItem.column_values.numbers7__1.text;

  // Calculate the "Next Audit Date"
  const nextAuditDate = calNextAuditDate(lastAuditDate, auditFrequencyInMonths);

  // Update the "Next Audit Date" column's Value
  try {
    await changeColumnValue(
      req.monday,
      boardId,
      itemId,
      "date_mkkbt8f2",
      nextAuditDate
    );

    return res.status(200).send({});
  } catch (err) {
    logger.error("Couldn't update the 'Next Audit Date' column", TAG, {
      error: err,
    });
    return res.status(500).send({ message: "internal server error" });
  }
};
