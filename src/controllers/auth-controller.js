import { MONDAY_SIGNING_SECRET } from "../constants/secret-keys.js";
import { getSecret } from "../helpers/secrets.js";
import { MondayAuthManager } from "../services/oauth.js";
import logger from "../helpers/logger.js";
import { ConnectionModelService } from "../services/monday-auth-service.js";
import jwt from "jsonwebtoken";

const TAG = "auth_controller";
const mondayAuthManager = new MondayAuthManager();
const connectionModelService = new ConnectionModelService();

// After getting the monday auth in a view, redirect back to the original view
export const mondayViewCallback = async (req, res) => {
  const { code, state } = req.query;
  const backToPath = state; // The original view path is in the state. It should be a path component URL.

  try {
    const mondayToken = await mondayAuthManager.getToken(code);

    // console.log("mondayToken", mondayToken);
    const { actid: accountId, uid: userId } = jwt.decode(mondayToken);

    // console.log("accountId", accountId);
    // console.log("userId", userId);

    await connectionModelService.upsertConnection(accountId, {
      mondayToken,
      userId,
    });
    logger.info("monday oauth callback success", TAG, {
      userId,
      accountId,
    });
    return res.redirect(backToPath);
  } catch (err) {
    logger.error("monday oauth callback failed", TAG, {
      error: err.message,
    });
    return res.status(500).send({ message: "internal server error" });
  }
};
