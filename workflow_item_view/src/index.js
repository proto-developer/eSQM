import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import * as serviceWorker from "./serviceWorker";
import App from "./App";
import LoadingProvider from "./utils/LoadingContext";
import { MondayContextProvider } from "./utils/MondayContext";
import { FeedbackWidget } from "./components/feedbackWidget/FeedbackWidget";

// Shown in the feedback modal
const documentationLink =
  "https://view.monday.com/8350818770-67dfb40f3f80b5b16f349bf895f6188a?r=use1";
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
