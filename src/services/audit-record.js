import logger from "../helpers/logger.js";
import { AuditTrailStorage } from "../storage/audit-trail-storage.js";
import { loadTemplate } from "../helpers/templates.js";

const TAG = "audit-record";

const wrapperTemplate = loadTemplate("src/templates/wrapper.hbs");
const tableTemplate = loadTemplate("src/templates/audit-record-table.hbs");

const generateAuditRecordTable = (item) => {
  const rows = item.raw_data.column_values;
  return tableTemplate(rows);
};

const generateAuditRecordForItem = (item, esignRecord) => {
  const table = generateAuditRecordTable(item);

  // console.log(table);

  const title = `Audit Record for ${item.name}`;
  const description = `Generated at ${new Date().toLocaleString()}`;
  return wrapperTemplate({
    content: `${esignRecord}${table}`,
    title,
    description,
  });
};

export const createAuditRecord = async (
  client,
  item,
  user,
  action,
  esignRecord
) => {
  const storage = new AuditTrailStorage(client._token, item);
  const key = storage.getNewItemKey();
  const indexMetadata = {
    createdBy: user.name,
    createdAt: new Date().toISOString(),
    action,
    hasESignature: !!esignRecord,
    itemId: item.id,
  };

  const record = {
    ...indexMetadata,
    htmlDocument: generateAuditRecordForItem(item, esignRecord),
  };

  // console.log("createAuditRecord HTML", record);

  const { success } = await storage.set(key, record, { indexMetadata });
  if (success) {
    logger.info("Created audit record", TAG, { key, record });
    // console.log("Created audit record Success");
    return { success, key };
  }
  logger.error("Failed to create audit record", TAG, { key });
  return { success: false };
};
