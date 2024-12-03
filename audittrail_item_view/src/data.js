import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();
monday.setApiVersion("2023-10");

// const BASE_URL = "http://localhost:8080";

const getIndexKey = (itemId) => {
  return `audit-trail:${itemId}`;
};

const getStorage = async (key, sessionToken) => {
  try {
    const response = await fetch(`/audit/trail?itemKey=${key}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: sessionToken,
      },
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(
        `Request failed with status ${response.status}: ${errorDetails}`
      );
    }

    const data = await response.json();

    return {
      value: data,
    };
  } catch (error) {
    console.error("Error Getting Storage", error);
    return {
      value: null,
    };
  }
};

export const getAuditTrailIndex = async (itemId, sessionToken) => {
  const key = getIndexKey(itemId);
  return await getStorage(key, sessionToken);
};

export const getAuditTrailItem = async (key, sessionToken) => {
  return await getStorage(key, sessionToken);
};
