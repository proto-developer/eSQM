import {Logger} from "@mondaycom/apps-sdk"

export const logger = (tag) => new Logger(tag);

export const makeAccountLogger = (accountID) => {
    const tag = `lucie/${accountID}`;
    return new Logger(tag);
};


class BaseLogger {
  constructor() {}

  /**
   * Logs an informational message with the specified tag.
   * @param {string} message - The message to be logged.
   * @param {string} tag - The tag associated with the log message.
   * @param {Object} options - (Optional) Additional options for logging.
   * @returns {void}
   */
  info(message, tag = "", options) {
    console.info(
      "info: ",
      tag,
      message,
      options ? JSON.stringify(options) : ""
    );
  }

  /**
   * Logs a warning message with the specified tag.
   * @param {string} message - The warning message to be logged.
   * @param {string} tag - The tag associated with the log message.
   * @param {Object} options - (Optional) Additional options for logging.
   * @returns {void}
   */
  warn(message, tag = "", options) {
    console.warn(
      "warn: ",
      tag,
      message,
      options ? JSON.stringify(options) : ""
    );
  }

  /**
   * Logs an error message with the specified tag.
   * @param {string} message - The error message to be logged.
   * @param {string} tag - The tag associated with the log message.
   * @param {Object} options - (Optional) Additional options for logging.
   * @returns {void}
   */
  error(message, tag = "", options) {
    console.error(
      "error: ",
      tag,
      message,
      options ? JSON.stringify(options) : ""
    );
  }

  /**
   * Logs a debug message with the specified tag.
   * @param {string} message - The debug message to be logged.
   * @param {string} tag - The tag associated with the log message.
   * @param {Object} options - (Optional) Additional options for logging.
   * @returns {void}
   */
  debug(message, tag = "", options) {
    console.debug(
      "debug: ",
      tag,
      message,
      options ? JSON.stringify(options) : ""
    );
  }
}

/**
 * This logger provides a simple way to log messages for your app in a project deployed <monday-code/>.
 * Logged messages are accessible via "@mondaycom/apps-cli" https://github.com/mondaycom/monday-code-cli#mapps-codelogs
 * using `$ mapps code:logs`
 * Logs written without this logger may not be accessible via @mondaycom/apps-cli or not get labeled correctly
 * visit https://github.com/mondaycom/apps-sdk#logger for documentation
 */
class MondayLogger extends BaseLogger {
  constructor() {
    super();
  }

  info(message, tag, options) {
    new Logger(tag).info(message + ' PARAMS:- \n' + JSON.stringify(options));
  }

  warn(message, tag, options) {
    new Logger(tag).warn(message + ' PARAMS:- \n' + JSON.stringify(options));
  }

  error(message, tag, options) {
    new Logger(tag).error(message + ' PARAMS:- \n' + JSON.stringify(options));
  }

  debug(message, tag, options) {
    new Logger(tag).debug(message + ' PARAMS:- \n' + JSON.stringify(options));
  }
}
export default new MondayLogger();
