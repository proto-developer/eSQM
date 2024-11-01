import { Storage } from "@mondaycom/apps-sdk";
import { ConnectionModelService } from "../services/monday-auth-service.js";

const accountTokens = new ConnectionModelService();

export const getAuditTrail = async (req, res) => {
  const { accountId } = req.session;

  const accountAuthConnection = await accountTokens.getConnectionByAccountId(
    accountId
  );
  const storage = new Storage(accountAuthConnection.mondayToken);

  // const storage = new Storage(
  //   "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjQxNzU5ODkwMCwiYWFpIjoxMSwidWlkIjo2NjQxNzYwMSwiaWFkIjoiMjAyNC0wOS0zMFQyMjoxMDo1Ni4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjMzNjA3ODUsInJnbiI6ImV1YzEifQ.QPfGhX1rj4svESy3rAhPtzn9UbBd1NcY2HN-BSBIGoY"
  // );

  try {
    const { itemKey } = req.query;

    const response = await storage.get(itemKey);

    if (response.value) {
      const auditTrail = JSON.parse(response.value);
      res.status(200).send(auditTrail);
    } else {
      // console.log("Audit Trail Not Found");
      res.status(404).send({
        message: "Audit Trail Not Found",
        value: null,
      });
    }
  } catch (error) {
    console.error("Error Getting Audit Trail", error);
    res.status(500).send("Error Getting Audit Trail");
  }
};
