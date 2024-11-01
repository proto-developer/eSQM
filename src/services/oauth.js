import mondaySdk from "monday-sdk-js";
import { AuthorizationCode } from "simple-oauth2";
import {
  MONDAY_OAUTH_CLIENT_ID,
  MONDAY_OAUTH_CLIENT_SECRET,
  MONDAY_OAUTH_TOKEN_PATH,
  MONDAY_OAUTH_HOST,
  MONDAY_OAUTH_AUTHORIZE_PATH,
  MONDAY_OAUTH_REDIRECT_BASE,
} from "../constants/secret-keys.js";
import { getSecret } from "../helpers/secrets.js";

const monday = mondaySdk();

class BaseAuthManager {
  getAuthorizationUrl = (userId, state) => {
    throw new Error("Not implemented");
  };

  getToken = async (code) => {
    throw new Error("Not implemented");
  };
}

export class MondayAuthManager extends BaseAuthManager {
  getAuthorizationUrl = (userId, state, slug) => {
    const client = this._getClient();
    let authorizationUrl = client.authorizeURL({
      state,
    });

    // Sending to the slug specific auth ensures the current account is used for the oauth flow by default
    const subdomain = slug;
    authorizationUrl = authorizationUrl.replace("https://auth.", `https://${subdomain}.`);

    return authorizationUrl;
  };

  getToken = async (code) => {
    // const client = this._getClient();
    const response = await monday.oauthToken(
      code,
      getSecret(MONDAY_OAUTH_CLIENT_ID),
      getSecret(MONDAY_OAUTH_CLIENT_SECRET)
    );
    return response?.access_token || response?.token || response;
  };

  _getClient = () => {
    return new AuthorizationCode({
      client: {
        id: getSecret(MONDAY_OAUTH_CLIENT_ID),
        secret: getSecret(MONDAY_OAUTH_CLIENT_SECRET),
      },
      auth: {
        tokenHost: getSecret(MONDAY_OAUTH_HOST),
        tokenPath: getSecret(MONDAY_OAUTH_TOKEN_PATH),
        authorizePath: getSecret(MONDAY_OAUTH_AUTHORIZE_PATH),
      },
    });
  };
}
