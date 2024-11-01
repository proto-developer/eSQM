import React from "react";
import { MondayContext } from "../utils/MondayContext";

export const useMondayContext = () => {
  const contextValue = React.useContext(MondayContext);
  return contextValue;
  // return React.useContext(MondayContext);
};
