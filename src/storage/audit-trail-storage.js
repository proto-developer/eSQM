import {BaseIndexedStorage} from './base-indexed-storage.js';

export class AuditTrailStorage extends BaseIndexedStorage {
  constructor(token, item) {
    super(token, item.id);
    this.prefix = "audit-trail:";
  }
}
