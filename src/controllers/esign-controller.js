import {
  esignGetOrCreatePin,
  esignValidatePin,
} from "../services/esign-service.js";

export const getESignPin = async (req, res) => {
    const { userId } = req.session;
    const user = {id: userId};
    const pin = await esignGetOrCreatePin(req.monday, user);
    return res.json({ pin });
}

export const validatePin = async (req, res) => {
    const { userId } = req.session;
    const { pin } = req.body;
    const user = {id: userId};
    const isValid = await esignValidatePin(req.monday, user, pin);
    return res.json({ isValid });
}
