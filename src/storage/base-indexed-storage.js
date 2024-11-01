import { BaseStorage } from "./base-storage.js";
import logger from "../helpers/logger.js";

const TAG = "base-indexed-storage";

export class BaseIndexedStorage extends BaseStorage {
  constructor(token, indexKey) {
    super(token);
    this.prefix = "";
    this.indexKey = indexKey;
    this.shared = true;
    this.maxRetries = 5;
  }

  /**
   * Add a new key to the index. This should be done before saving the new key's value.
   * @param {string} key
   * @returns
   */
  async updateIndex(key, { indexMetadata }) {
    for (let i = 0; i < this.maxRetries; i++) {
      let { value, version } = await this.getIndex(); // Gets pre-parsed value

      if (!value) {
        value = { index: [], createdAt: new Date().toISOString() };
        version = null;
      } else if (!value.index) {
        value = { index: [], createdAt: new Date().toISOString() };
        version = null;
      }

      value.index.push({
        key: this._getFinalKey(key),
        ...indexMetadata,
      });
      value.updatedAt = new Date().toISOString();

      const response = await this.storage.set(
        this._getFinalKey(this.indexKey),
        JSON.stringify(value),
        { previousVersion: version, shared: this.shared }
      );

      if (response.success) {
        logger.info("Updated index", TAG, { key, value });
        return { success: response.success };
      } else {
        logger.warn("Failed to update index. Retrying...", TAG, {
          attempt: i,
          key,
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    logger.error("Failed to update index", TAG, { key });
    return { success: false };
  }

  async getIndex() {
    return await this.get(this.indexKey);
  }

  getNewItemKey() {
    return `${this.indexKey}:${+new Date()}`;
  }

  /**
   * Sets a value in the storage after adding the key to the index.
   *
   * This may result in items being in the index but not in the storage. This should be handled by the application.
   *
   * @param {string} key - The key for the value.
   * @param {*} value - The value to be stored.
   * @param {Options} [options] - Additional options.
   * @returns {Promise<void>} A Promise representing the completion of the set operation.
   */
  async set(key, value, options) {
    const { success } = await this.updateIndex(key, {
      indexMetadata: options?.indexMetadata,
    });
    if (!success) {
      return { success: false };
    }
    options = { ...options, shared: this.shared };
    return await this.storage.set(
      this._getFinalKey(key),
      JSON.stringify(value),
      options
    );
  }

  /**
   * Retrieves a value from the storage.
   * @param {string} key - The key for the value.
   * @param {Options} [options] - Additional options.
   * @returns {Promise<any>} A Promise representing the retrieved value.
   */
  async get(key, options) {
    const result = await this.storage.get(this._getFinalKey(key), options);
    if (result.value) {
      try {
        result.value = JSON.parse(result.value);
      } catch (e) {}
    }
    return result;
  }
}
