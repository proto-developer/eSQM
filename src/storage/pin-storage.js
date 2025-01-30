import BaseSecureStorage from "./base-secure-storage.js";

const TAG = "base-indexed-storage";

export class PinStorage extends BaseSecureStorage {
  constructor(token) {
    super(token);
    this.prefix = "pin:";
    this.autoJSON = true;
  }
}
