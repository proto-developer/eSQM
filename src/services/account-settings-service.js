import { AccountSettingsStorage } from "../storage/account-settings-storage.js";
import { FLAGS } from "../constants/general.js";

export const getAccountSettings = async (client) => {
  const storage = new AccountSettingsStorage(client._token);
  return await storage.get("");
};

export const setAccountSettings = async (client, settings) => {
  const storage = new AccountSettingsStorage(client._token);
  return await storage.set("", settings);
};

export const deleteAccountSettings = async (client) => {
  const storage = new AccountSettingsStorage(client._token);
  return await storage.delete("");
};

export const setAccountFlag = async (client, flag, enable) => {
  if (!Object.values(FLAGS).includes(flag)) {
    throw new Error("Invalid flag");
  }
  const storage = new AccountSettingsStorage(client._token);
  let newFlags = {};
  await storage.safeUpdate("", (value) => {
    if (!value) value = {};
    if (!value.flags) value.flags = {};
    if (enable == null) {
      delete value.flags[flag];
    } else {
      value.flags[flag] = enable;
    }
    newFlags = value.flags;
    return value;
  });
  return newFlags;
};

export const getAccountFlags = async (client) => {
  const settings = await getAccountSettings(client);
  return settings.value?.flags || {};
};
