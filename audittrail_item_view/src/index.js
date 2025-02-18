import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { FeedbackWidget } from "./FeedbackWidget";
import { SubscriptionChecker } from "./Subscription";
import App from "./App";
import * as serviceWorker from "./serviceWorker";

// TODO: set up SENTRY
/* import * as Sentry from "@sentry/react";
// TODO: replace with your Sentry DSN
Sentry.init({
  dsn: "https://@.ingest.sentry.io/4506319677947904",
});
*/

// Shown in the feedback modal
const documentationLink = "https://euro-tas.com/";
const supportEmail = "support@euro-tas.com";

const root = createRoot(document.getElementById("root"));
root.render(
  <>
    <SubscriptionChecker>
      <App />
    </SubscriptionChecker>
    <FeedbackWidget
      documentationLink={documentationLink}
      supportEmail={supportEmail}
    />
  </>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
