import { ConnectionModelService } from "../services/monday-auth-service.js";
import { MondayAuthManager } from "../services/oauth.js";
import logger from "../helpers/logger.js";

const TAG = "monday_connection_check";
const accountTokens = new ConnectionModelService();
const mondayAuthManager = new MondayAuthManager();

export const mondayConnectionCheckMiddleware = async (req, res, next) => {
  const { userId, accountId, slug } = req.session;

  const accountAuthConnection = await accountTokens.getConnectionByAccountId(
    accountId
  );

  // const accountAuthConnection = {
  //   accountId: accountId,
  //   userId: userId,
  //   mondayToken:
  //     "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjQxNzU5ODkwMCwiYWFpIjoxMSwidWlkIjo2NjQxNzYwMSwiaWFkIjoiMjAyNC0wOS0zMFQyMjoxMDo1Ni4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjMzNjA3ODUsInJnbiI6ImV1YzEifQ.QPfGhX1rj4svESy3rAhPtzn9UbBd1NcY2HN-BSBIGoY",
  // };

  logger.info("Monday connection", TAG, {
    accountId,
    hasToken: !!accountAuthConnection && !!accountAuthConnection?.mondayToken,
  });

  if (!accountAuthConnection) {
    logger.error("No monday connection found, redirecting to oauth", TAG, {
      accountId,
    });

    const referrer = req.headers.referer;
    const path = new URL(referrer).pathname;

    // Passes in the path as the state so we can redirect back to the original page after oauth
    // This will reload the react app
    const authUrl = mondayAuthManager.getAuthorizationUrl(userId, path, slug);

    return res.status(200).send({
      error: "oauth required",
      action: "do_oauth",
      authUrl,
    });
  }
  req.session.mondayConnection = accountAuthConnection;

  next();
};
