
import { FLAGS } from "../constants/general.js";
import { getSecret } from "./secrets.js"

export { FLAGS } from "../constants/general.js";

export const getFlagEnabled = (flag) => {
    if (!Object.values(FLAGS).includes(flag)) {
        throw new Error("Invalid flag");
    }
    const flagValue = getSecret(flag)
    return flagValue.toLowerCase() === "true"
}
