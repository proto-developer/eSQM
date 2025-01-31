import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();
monday.setApiVersion("2023-10");

// const BASE_URL = "http://localhost:8080";
// const BASE_URL = "https://c3e16-service-23360785-eb0e1e7e.us.monday.app";

function decodeHtmlEntities(html) {
  const charMap = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#x2F;": "/",
    "&#x60;": "`",
    "&#x3D;": "=",
    "&#45;": "-",
    "&#45;&#45;": "--",
    "&#x27;": "'",
  };

  let decodedHtml = html;
  Object.keys(charMap).forEach((entity) => {
    const regex = new RegExp(entity, "g");
    decodedHtml = decodedHtml?.replace(regex, charMap[entity]);
  });
  return decodedHtml;
}

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

const getDecodedStorage = async (key, sessionToken) => {
  try {
    const response = await fetch(`}/audit/trail?itemKey=${key}`, {
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

    const decodedHTML = decodeHtmlEntities(data.htmlDocument);

    return {
      value: decodedHTML,
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
  return await getDecodedStorage(key, sessionToken);
};
