import * as Sentry from "@sentry/node";
import { getBoardItemHighestNumber } from "../services/monday-count.js";
import { changeColumnValueMultiple } from "../services/monday-service.js";
import logger from "../helpers/logger.js";

const TAG = "auto_number_controller";

export const assignAutoNumber = async (req, res) => {
  const { accountId, shortLivedToken } = req.session;
  const { payload } = req.body;
  logger.info("Executing assignAutoNumber action", TAG, { accountId });

  const { inputFields } = payload;
  const { boardId, itemId, prefix, outputColumn } = inputFields;

  let newId;
  try {
    // Get the number of items in the board
    const highestId = await getBoardItemHighestNumber(
      req.monday,
      boardId,
      outputColumn
    );
    newId = parseInt(highestId.replace(prefix, ""), 10) + 1;
  } catch (err) {
    newId = 1;
  }

  newId = `${prefix}${newId.toString().padStart(4, '0')}`;

  const update = {
    [outputColumn]: newId,
  };

  logger.info("Auto number created", TAG, { update });

  try {
    // Update the item with the new number
    await changeColumnValueMultiple(req.monday, boardId, itemId, update);

    return res.status(200).send({});
  } catch (err) {
    logger.error("Failure in monday-controller", TAG, { error: err });
    Sentry.captureException(err);
    return res.status(500).send({ message: "internal server error" });
  }
};
