import jwt from "jsonwebtoken";
import { getSecret } from "../helpers/secrets.js";
import { makeAccountLogger } from "../helpers/logger.js";
import dotenv from "dotenv";
dotenv.config();

async function authenticationMiddleware(req, res, next) {
  try {
    let { authorization } = req.headers;
    if (!authorization && req.query) {
      authorization = req.query.token;
    }
    const { accountId, userId, backToUrl, shortLivedToken } = jwt.verify(
      authorization,
      // getSecret("MONDAY_SIGNING_SECRET")
      getSecret("MONDAY_SIGNING_SECRET", { invalidate: true })
    );
    const logger = makeAccountLogger(accountId);
    req.session = { accountId, userId, backToUrl, shortLivedToken, logger };
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "not authenticated" });
  }
}

async function clientSecretAuthenticationMiddleware(req, res, next) {
  try {
    let { authorization } = req.headers;

    const data = jwt.verify(
      authorization,
      getSecret("MONDAY_OAUTH_CLIENT_SECRET", { invalidate: true })
      // getSecret("MONDAY_OAUTH_CLIENT_SECRET")
    );

    const logger = makeAccountLogger(data.dat.accountId);
    req.session = {
      accountId: data.dat.account_id,
      userId: data.dat.user_id,
      slug: data.dat.slug,
      logger,
    };
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "not authenticated" });
  }
}

export { authenticationMiddleware, clientSecretAuthenticationMiddleware };
