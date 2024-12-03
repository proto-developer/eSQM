import React from "react";
import { useState, useEffect } from "react";
import "./App.css";
import mondaySdk from "monday-sdk-js";
import "monday-ui-react-core/dist/main.css";
import { Button, Flex, AttentionBox, Text } from "monday-ui-react-core";

// Accounts which are allowed to skip subscription checks
const fullAccessAccountIds = [
  "18903400", // Capable Koala test account
  "10046003", // Monday appssolutions-team account
  "7271863", // Monday appsdemos account
];

const monday = mondaySdk();
monday.setApiVersion("2023-10");

const planIdToSeatCount = (planId) => {
  if (planId.indexOf("up_to_") === 0) {
    // Plan is limited to a number of seats which is the number after the up_to_
    return parseInt(planId.replace("up_to_", ""));
  }
  if (planId.indexOf("above_") === 0) {
    // This is the unlimited plan
    return 1e256; // This is a hack to make it always be greater than the monday.com max_users value
  }
  return 0;
};

const getSubscriptionStatus = (setSubscriptionInfo, trackInfo) => {
  monday
    .api(
      `query {
        apps_monetization_status {
          is_supported
        }
        app_subscription {
          plan_id
          renewal_date
          billing_period
          days_left
          is_trial
        }
        account {
          id
          name
          slug
          tier
          plan {
            version
            max_users
          }
        }
    }`
    )
    .then((res) => {
      // console.log(res);
      const data = res.data;
      const subscription = data?.app_subscription[0] || false;

      let subscriptionStatus = false;
      let errorMessage = "";

      if (fullAccessAccountIds.includes(String(data.account.id))) {
        subscriptionStatus = "whitelisted";
      }

      if (!subscriptionStatus && !data.apps_monetization_status.is_supported) {
        subscriptionStatus = "not-supported";
        console.info(
          "App monetization is not supported, allowing all features"
        );
      }
      if (!subscriptionStatus && !subscription) {
        subscriptionStatus = "no-subscription";
      }
      if (!subscriptionStatus && subscription.is_trial) {
        subscriptionStatus = "trial";
      }
      if (!subscriptionStatus &&  subscription.days_left <= 0) {
        subscriptionStatus = "expired";
      }

      if (
        (!subscriptionStatus && !data.account.plan) ||
        !data.account?.plan?.max_users
      ) {
        subscriptionStatus = "valid-assumed";
        console.error(
          "No plan data found, continuing assuming a 0 user plan, this will be very permissive"
        );
      }

      if(!subscriptionStatus){
        const max_users = planIdToSeatCount(subscription.plan_id);
        const monday_max_users = data.account?.plan?.max_users || 0;
        if (max_users < monday_max_users) {
          subscriptionStatus = "invalid-subscription";
          errorMessage = `Your monday.com account has ${monday_max_users} seats, but your subscription only allows ${max_users} seats, please upgrade your subscription.`;
        }
      }

      if(!subscriptionStatus)
        subscriptionStatus = "valid";

      setSubscriptionInfo({ status: subscriptionStatus, message: errorMessage });
      if (["valid", "valid-assumed", "whitelisted", "trial"].includes(subscriptionStatus)){
        console.log("App Opened")
      }

    })
    .catch((err) => {
      console.error(err);
      setSubscriptionInfo({ status: "error" });
    });
};

const parseJwtPayload = (jwtToken) => {
  try {
    const payloadBase64 = jwtToken.split(".")[1];
    const decodedPayload = atob(payloadBase64);
    return JSON.parse(decodedPayload);
  } catch (error) {
    return null;
  }
};

const NoSubscription = ({ message }) => {
  return (
    <div className="warning">
      <AttentionBox
        type={AttentionBox.types.WARNING}
        title={
          message ||
          "Please set up your subscription to continue using this app"
        }
        text={null}
      >
        <Button
          style={{ marginTop: 20 }}
          onClick={() =>
            monday.execute("openPlanSelection", { isInPlanSelection: true })
          }
        >
          Open plan selection
        </Button>
      </AttentionBox>
    </div>
  );
};

const InvalidSubscription = ({ message }) => {
  return (
    <div className="warning">
      <AttentionBox
        type={AttentionBox.types.WARNING}
        title="Please select a suitable subscription to continue using this app"
        text={null}
      >
        {message || ""}
        <Button
          style={{ marginTop: 20 }}
          onClick={() =>
            monday.execute("openPlanSelection", { isInPlanSelection: false })
          }
        >
          View billing info
        </Button>
      </AttentionBox>
    </div>
  );
};

const ViewOnlyUser = () => {
  return (
    <div className="warning">
      <AttentionBox
        type={AttentionBox.types.WARNING}
        title="Sorry, This view is not available for view only users"
      ></AttentionBox>
    </div>
  );
};

const SubscriptionMessageContainer = ({ children }) => (
  <Flex
    align="Center"
    justify="Center"
    style={{ height: "100vh", width: "100vw" }}
  >
    {children}
  </Flex>
);

export const SubscriptionChecker = ({ children }) => {
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState({
    status: "loading",
    message: "",
  });

  useEffect(() => {
    monday.listen("sessionToken", (res) => {
      const payload = parseJwtPayload(res.data);
      console.info("sessionToken payload -> ", payload);
      if (payload.dat.is_view_only) {
        // A view only user cannot access the monday GQL API,
        // so we can't check their subscription status etc,
        // so we just disable the app for them
        console.info("View only user detected, disabling app");
        setIsViewOnly(true);
      } else {
        // Regular user
        getSubscriptionStatus(setSubscriptionInfo,{
          user_id: payload.dat.user_id,
          app_id: payload.dat.app_id,
          user_kind: payload.dat.user_kind,
        });
      }
    });
  }, []);

  if (isViewOnly) {
    return (
      <SubscriptionMessageContainer>
        <ViewOnlyUser />
      </SubscriptionMessageContainer>
    );
  }

  if (subscriptionInfo.status === "loading") {
    // Not really anything we can return here, since according to the
    // style guide loading spinners should only be used in more specific contexts
    return (
      <SubscriptionMessageContainer>
        <Text>Loading...</Text>
      </SubscriptionMessageContainer>
    );
  }

  if (["no-subscription"].includes(subscriptionInfo.status)) {
    return (
      <SubscriptionMessageContainer>
        <NoSubscription />
      </SubscriptionMessageContainer>
    );
  }

  if (["invalid-subscription", "expired"].includes(subscriptionInfo.status)) {
    return (
      <SubscriptionMessageContainer>
        <InvalidSubscription message={subscriptionInfo.message} />
      </SubscriptionMessageContainer>
    );
  }

  return <div className={subscriptionInfo.status}>{children}</div>;
};
