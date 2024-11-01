const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const BASE_URL = "http://localhost:8080";

const doRequest = async (url, method, options, sessionToken) => {
  // console.log("Request:", url, method, options, sessionToken);
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: sessionToken,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error("Request failed");
    }

    // console.log("Response:", response);

    const result = await response.json();

    // console.log("Result:", result);

    if (result?.action === "do_oauth") {
      // Redirect the user to the auth URL, this will unload the app, but they will be redirected back
      // when auth is complete.
      console.log("Redirecting to auth", result.authUrl);
      window.location = result.authUrl;
      // Don't return, we're redirecting. If we return, the app has to handle a load of extra
      // logic to not try and deal with this "error" class.
      while (true) {
        await delay(3000);
        console.log("Waiting for auth redirect, still...");
      }
    }
    return result;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

const postData = async (url, data, sessionToken) => {
  return await doRequest(
    url,
    "POST",
    { body: JSON.stringify(data) },
    sessionToken
  );
};

const getData = async (url, sessionToken) => {
  return await doRequest(url, "GET", {}, sessionToken);
};

export const getItemWorkflowState = async (itemState, sessionToken) => {
  const url = `/api/workflow/get_item_workflow_state`;
  return await postData(url, itemState, sessionToken);
};

export const performAction = async (itemState, data, sessionToken) => {
  const url = `/api/workflow/perform_action`;
  const body = {
    ...itemState,
    ...data,
  };
  return await postData(url, body, sessionToken);
};

export const validatePin = async (pin, sessionToken) => {
  const url = `/api/esign/validate_pin`;
  return await postData(url, { pin }, sessionToken);
};

export const getPin = async (sessionToken) => {
  const url = `/api/esign/pin`;
  return await getData(url, sessionToken);
};
