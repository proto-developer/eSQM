import React from "react";
import { LoadingContext } from "../utils/LoadingContext";

export const useLoader = () => {
  return React.useContext(LoadingContext);
};
