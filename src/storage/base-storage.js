import { Storage } from "@mondaycom/apps-sdk";

/**
 * key/value storage for monday-code projects
 * This is the way to store customer data for your app
 * key/value based where the key is a string and value can be any serializable type (object, number, string, etc.)
 * compartmentalized based on accountId and app for your specific app which means that data stored for one account will not be accessible from the context of another account
 * @param {string} token - The Monday user token obtained from either OAuth or webhook triggers as a shortLivedToken.
 */
export class BaseStorage {
  constructor(token) {
    this.storage = new Storage(token);
    this.prefix = "";
    this.autoJSON = false
  }

  _getFinalKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * @typedef {Object} Options
   * @property {string} [token] - The token value.
   * @property {string} [previousVersion] - The previous version.
   */

  /**
   * Sets a value in the storage.
   * @param {string} key - The key for the value.
   * @param {*} value - The value to be stored.
   * @param {Options} [options] - Additional options.
   * @returns {Promise<void>} A Promise representing the completion of the set operation.
   */
  async set(key, value, options) {
    if (this.autoJSON) {
      value = JSON.stringify(value);
    }
    return await this.storage.set(this._getFinalKey(key), value, options);
  }

  /**
   * Retrieves a value from the storage.
   * @param {string} key - The key for the value.
   * @param {Options} [options] - Additional options.
   * @returns {Promise<any>} A Promise representing the retrieved value.
   */
  async get(key, options) {
    const result = await this.storage.get(this._getFinalKey(key), options);
    if (this.autoJSON && result.value) {
      result.value = JSON.parse(result.value);
    }
    return result;
  }

  /**
   * Deletes a value from the storage.
   * @param {string} key - The key for the value to delete.
   * @param {Options} [options] - Additional options.
   * @returns {Promise<void>} A Promise representing the completion of the delete operation.
   */
  async delete(key, options) {
    return await this.storage.delete(this._getFinalKey(key), options);
  }


  /**
   * Perform a sage update operation on a key.
   *
   * The updater function will be called with the current value of the key and should return the new value.
   * The current value may be null
   *
   * @param {string} key
   * @param {function} updater
   * @param {int} retryLimit
   * @returns
   */
  async safeUpdate(key, updater, retryLimit=5) {
    for(let i=0; i<retryLimit; i++){
      const {value, version} = await this.get(key);
      const newValue = updater(value);
      const response = await this.set(key, newValue, {previousVersion: version});
      if(response.success){
        return response;
      }
      logger.warn("Failed to update key", TAG, {
        key,
        attempt: i,
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    logger.error("Failed to update key", TAG, {key});
  }
}
