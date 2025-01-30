import { PinStorage } from "../storage/pin-storage.js";

export class PinService {
  constructor(token) {
    this.storage = new PinStorage(token);
  }

  async createPin(userId) {
    const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = new Date().toISOString();
    await this.storage.set(userId, { pin, createdAt });
    return pin;
  }

  async getOrCreatePin(userId) {
    const data = await this.storage.get(userId);
    if (data?.pin) {
      return data.pin;
    }
    return await this.createPin(userId);
  }

  async validatePin(userId, pin) {
    const data = await this.storage.get(userId);
    return data.pin === pin;
  }
}
