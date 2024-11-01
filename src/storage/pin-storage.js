import { BaseStorage } from "./base-storage.js";
import logger from "../helpers/logger.js";

const TAG = "base-indexed-storage";

export class PinStorage extends BaseStorage {
  constructor(token) {
    super(token);
    this.prefix = "pin:";
    this.autoJSON = true;
  }
}
