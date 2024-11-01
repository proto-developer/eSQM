import initMondayClient from "monday-sdk-js";
import logger from "../helpers/logger.js";
import { ConnectionModelService } from "../services/monday-auth-service.js";

const TAG = "monday-client-middleware";
const accountTokens = new ConnectionModelService();

export const mondayClientMiddleware = async (req, res, next) => {
  if (req.session.accountId) {
    const token =
      req.session?.shortLivedToken ||
      req.session?.mondayConnection?.mondayToken;
    req.monday = initMondayClient();
    req.monday.setToken(token);
    req.monday.setApiVersion("2024-07");
  } else {
    req.monday = null;
    logger.error("No monday token found", TAG, { session: req.session });
  }

  next();
};
