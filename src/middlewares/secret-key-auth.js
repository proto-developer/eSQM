import { getSecret } from "../helpers/secrets.js";
import { MANAGEMENT_KEY } from "../constants/secret-keys.js";

export const secretKeyAuthMiddleware = (req, res, next) => {
  const secretKey = getSecret(MANAGEMENT_KEY);
  const { authorization } = req.headers;
  if (!authorization || authorization !== secretKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};
