import { ConnectionModelService } from "../services/monday-auth-service.js";
import { setAccountFlag } from "../services/account-settings-service.js";

import logger from "../helpers/logger.js";

const TAG = "management_controller";

const connectionService = new ConnectionModelService();

export const deleteAccountAuth = async (req, resp) => {
  const webhookBody = req.body;

  const accountId = webhookBody.data.account_id;

  if (webhookBody.type === "uninstall") {
    await connectionService.deleteConnection(accountId);
    logger.info("Deleted account auth", TAG, { accountId });
    resp.status(200).send();
  }

  if (webhookBody.type === "install") {
    await connectionService.sendEmailOnAppInstallation(webhookBody.data);
    logger.info("Sent email on app installation", TAG, {
      accountId,
      userId: webhookBody.data.user_id,
    });
    resp.status(200).send();
  }
};

export const setAccountFeatureFlag = async (req, resp) => {
  const { flag, enabled } = req.body;
  const { accountId } = req.query;
  const mondayConnection = await connectionService.getConnectionByAccountId(
    accountId
  );
  try {
    const result = await setAccountFlag(
      { _token: mondayConnection.mondayToken },
      flag,
      enabled
    );
    resp.status(200).send({ result: result });
  } catch (err) {
    logger.error("Error setting account flag", TAG, {
      error: err.message,
      flag,
      enabled,
    });
    return resp.status(500).send({ error: err.message });
  }
};
