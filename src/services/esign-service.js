import { PinService } from "./pin-service.js";
import { loadTemplate } from "../helpers/templates.js";

const esignTemplate = loadTemplate("src/templates/esign-record.hbs");

export const esignGetOrCreatePin = async (client, user) => {
  const pinService = new PinService(client._token);
  const pin = await pinService.getOrCreatePin(user.id);
  return pin;
};

export const esignValidatePin = async (client, user, pin) => {
  const pinService = new PinService(client._token);
  return await pinService.validatePin(user.id, pin);
};

/* Return a templated HTML chunk to add to the audit record for this item */
export const esignCreateRecordHTML = async (update) => {
  const { context, action, prevState, nextState } = update;
  const { item, user } = context;
  return esignTemplate({
    user,
    item,
    action,
    prevState,
    nextState,
    createdAt: new Date().toLocaleString(),
  });
};
