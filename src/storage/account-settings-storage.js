import { BaseStorage } from "./base-storage.js";

export class AccountSettingsStorage extends BaseStorage {
    constructor(token) {
        super(token);
        this.prefix = "settings";
        this.autoJSON = true;
    }
}
