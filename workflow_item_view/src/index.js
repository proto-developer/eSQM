import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import * as serviceWorker from "./serviceWorker";
import App from "./App";
import LoadingProvider from "./utils/LoadingContext";
import { MondayContextProvider } from "./utils/MondayContext";

const root = createRoot(document.getElementById("root"));
root.render(
  <MondayContextProvider>
    <LoadingProvider>
      <App />
    </LoadingProvider>
  </MondayContextProvider>
);

serviceWorker.unregister();
