import { getAccountFlags } from "../services/account-settings-service.js";
import { FLAGS, getFlagEnabled } from "../helpers/flags.js";

export const featureFlagsMiddleware = async (req, res, next) => {
  const flags = await getAccountFlags(req.monday);

  req.accountFlags = flags;

  req.getFlagEnabled = (flag) => {
    // Check if the flag is overridden for the account, and return the default if not
    return req.accountFlags.hasOwnProperty(flag)
      ? req.accountFlags[flag]
      : getFlagEnabled(flag);
  };

  req.FLAGS = FLAGS;

  next();
};
