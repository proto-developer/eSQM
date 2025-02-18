import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import * as serviceWorker from "./serviceWorker";
import App from "./App";
import LoadingProvider from "./utils/LoadingContext";
import { MondayContextProvider } from "./utils/MondayContext";
import { FeedbackWidget } from "./components/feedbackWidget/FeedbackWidget";

// Shown in the feedback modal
const documentationLink = "https://euro-tas.com/";
const supportEmail = "support@euro-tas.com";

const root = createRoot(document.getElementById("root"));
root.render(
  <MondayContextProvider>
    <LoadingProvider>
      <App />
      <FeedbackWidget
        documentationLink={documentationLink}
        supportEmail={supportEmail}
      />
    </LoadingProvider>
  </MondayContextProvider>
);

serviceWorker.unregister();
