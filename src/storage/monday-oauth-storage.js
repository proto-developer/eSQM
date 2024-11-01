import BaseSecureStorage from "./base-secure-storage.js";

class ConnectionStorage extends BaseSecureStorage {
  constructor() {
    super();
    this.prefix = "auth.monday.acc_";
  }
}

export default ConnectionStorage;
