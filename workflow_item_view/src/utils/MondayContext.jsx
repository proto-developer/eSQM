import { createContext, useState, useEffect } from "react";
import mondaySdk from "monday-sdk-js";

export const MondayContext = createContext(null);

export const MondayContextProvider = ({ children }) => {
  const [context, setContext] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const monday = mondaySdk();

  useEffect(() => {
    monday.listen("context", (res) => {
      setContext(res.data);
    });
    monday.listen("sessionToken", (res) => {
      setSessionToken(res.data);
    });
    monday.execute("valueCreatedForUser");
  }, [monday]);

  return (
    <MondayContext.Provider
      value={{
        context,
        sessionToken,
      }}
    >
      {children}
    </MondayContext.Provider>
  );
};
