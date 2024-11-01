import ConnectionStorage from "../storage/monday-oauth-storage.js";
import logger from "../helpers/logger.js";

const TAG = "connection_model_service";

/** @typedef {Object} Connection
 * @property {string} accountId - The monday account ID
 * @property {string} mondayToken - The monday token of the account
 * @property {string} userId - The id of the user authenticated with monday
 */

/**
 * A service for interacting with Connection objects.
 * A Connection defines a relation between a monday account and their Github & monday.com credentials.
 *
 * @returns {ConnectionModelService} - An instance of the ConnectionModelService
 * @example
 * const connectionModelService = new ConnectionModelService();
 * const connection = await connectionModelService.getConnectionByaccountId(accountId);
 *
 * @example
 * const connectionModelService = new ConnectionModelService();
 * const connection = await connectionModelService.upsertConnection(accountId, attributes);
 */
export class ConnectionModelService {
  constructor() {
    this.secureStorage = new ConnectionStorage();
  }

  /**
   * Retrieve a Github & monday.com connection based on a monday account ID.
   * @param {string} accountId - The monday account ID
   * @returns {Promise<Connection>} - The fetched connection
   */
  async getConnectionByAccountId(accountId) {
    try {
      const response = await this.secureStorage.get(accountId);

      // console.log("response getConnectionByAccountId", response);

      if (!response) {
        logger.error("No connection for account ID", TAG, {
          accountId,
        });
        console.log("No connection for account ID", TAG, {
          accountId,
        });
      }
      return response;
    } catch (err) {
      logger.error("Failed to retrieve connection by account ID", TAG, {
        accountId,
        error: err.message,
      });
      console.log("Failed to retrieve connection by account ID", TAG, {
        accountId,
        error: err.message,
      });
    }
  }

  /**
   * Create a Connection record in the DB.
   * A connection defines a relation between a monday account and their Github credentials.
   * @param {string} accountId - The monday account ID
   * @param {Object} attributes - The attributes of the connection
   * @param {string=} attributes.mondayToken - The monday token of the account
   * @param {string=} attributes.userId - The userID of the user who authed the integration
   * @returns {Promise<Connection>} - The created connection
   */
  async upsertConnection(accountId, attributes) {
    const { mondayToken, userId } = attributes;
    const connection = await this.getConnectionByAccountId(accountId);
    const newConnection = {
      ...connection,
      ...(mondayToken && { mondayToken }),
      ...(userId && { userId }),
      accountId,
    };
    try {
      const response = await this.secureStorage.set(accountId, newConnection);

      if (!response) {
        throw new Error("Failed to create connection");
      }

      return { accountId, mondayToken };
    } catch (err) {
      logger.error("Failed to create connection", TAG, {
        accountId,
        error: err.message,
      });
    }
  }

  /**
   * Delete a Connection record in the DB.
   * @param {string} accountId - The monday account ID
   * @returns {Promise<void>}
   */
  async deleteConnection(accountId) {
    try {
      const response = await this.secureStorage.delete(accountId);

      if (!response) {
        throw new Error("Failed to delete connection");
      }
    } catch (err) {
      logger.error("Failed to delete connection", TAG, {
        accountId,
        error: err.message,
      });
    }
  }
}
