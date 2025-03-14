import React from "react";
import { useState, useEffect } from "react";
import mondaySdk from "monday-sdk-js";
import "monday-ui-react-core/dist/main.css";
import { Button, Flex, AttentionBox, Text } from "monday-ui-react-core";

// Accounts which are allowed to skip subscription checks
const fullAccessAccountIds = [
  "18903400", // Capable Koala test account
  "10046003", // Monday appssolutions-team account
  "7271863", // Monday appsdemos account
  // "23360785", // Developer Account
];

const monday = mondaySdk();
monday.setApiVersion("2023-10");

const checkAllowedItemsCount = ({ planId, items_count }) => {
  if (planId === "LucieSQMfree" && items_count > 10) {
    return false;
  } else if (planId === "LucieSQMbronze" && items_count > 100) {
    return false;
  } else if (planId === "LucieSQMsilver" && items_count > 500) {
    return false;
  }
  return true;
};

const allowedItemsInPlanMap = new Map([
  ["LucieSQMfree", 10],
  ["LucieSQMbronze", 100], // Less than 101
  ["LucieSQMsilver", 500], // Less than 501
  ["LucieSQMgold", Infinity], // No upper limit
]);

const getSubscriptionStatus = (setSubscriptionInfo, boardId) => {
  monday
    .api(
      `query {
        apps_monetization_status {
          is_supported
        }
        boards(ids: ${boardId}) {
          name
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
    .then(async (res) => {
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
      if (!subscriptionStatus && subscription.days_left <= 0) {
        subscriptionStatus = "expired";
      }

      if (!subscriptionStatus) {
        // Get the Board Name
        const boardName = data?.boards[0]?.name;

        let supplierBoardItemsCount = 0;
        let qualityEventBoardItemsCount = 0;
        let capaBoardItemsCount = 0;
        let effectivenessCheckBoardItemsCount = 0;

        if (boardName === "Supplier") {
          // Get the Count of Items in the "Supplier Board" and the Settings String for getting the Id of Quality Event Board
          const response = await monday.api(
            `query {
              boards(ids: ${boardId}) {
                items_count
                columns(ids: "connect_boards5__1") {
                  settings_str
                }
              }
            }`
          );

          supplierBoardItemsCount = response?.data?.boards[0]?.items_count;

          // Get the Id of "Quality Event Board"
          const qualityEventBoardSettings = JSON.parse(
            response?.data?.boards[0]?.columns[0]?.settings_str
          );
          const qualityEventBoardId = qualityEventBoardSettings?.boardIds[0];

          // Get the Count of Items in the "Quality Event Board" and Id of "CAPA" board
          const qualityEventResponse = await monday.api(
            `query {
              boards(ids: ${qualityEventBoardId}) {
                items_count
                columns(ids: "connect_boards__1") {
                  settings_str
                }
              }
            }`
          );

          qualityEventBoardItemsCount =
            qualityEventResponse?.data?.boards[0]?.items_count;

          const capaBoardSettings = JSON.parse(
            qualityEventResponse?.data?.boards[0]?.columns[0]?.settings_str
          );
          const capaBoardId = capaBoardSettings?.boardIds[0];

          // Get the Count of Items in the "CAPA Board" and Id of "Effectiveness Check" board
          const capaResponse = await monday.api(
            `query {
              boards(ids: ${capaBoardId}) {
                items_count
                columns(ids: "effectiveness_checks") {
                  settings_str
                }
              }
            }`
          );

          capaBoardItemsCount = capaResponse?.data?.boards[0]?.items_count;

          const effectivenessCheckBoardSettings = JSON.parse(
            capaResponse?.data?.boards[0]?.columns[0]?.settings_str
          );
          const effectivenessCheckBoardId =
            effectivenessCheckBoardSettings?.boardIds[0];

          //  Get the Count of Items in the "Effectiveness Check Board"
          const effectivenessCheckResponse = await monday.api(
            `query {
              boards(ids: ${effectivenessCheckBoardId}) {
                items_count
              }
            }`
          );

          effectivenessCheckBoardItemsCount =
            effectivenessCheckResponse?.data?.boards[0]?.items_count;
        } else if (boardName === "Quality Event") {
          // Get the Count of Items in the "Quality Event Board" and the Id of parent "Supplier" board and child "CAPA" board
          const response = await monday.api(
            `query {
              boards(ids: ${boardId}) {
                items_count
                columns(ids: ["link_to_supplier__1", "connect_boards__1"]) {
                  settings_str
                }
              }
            }`
          );

          qualityEventBoardItemsCount = response?.data?.boards[0]?.items_count;

          const supplierBoardSettings = JSON.parse(
            response?.data?.boards[0]?.columns[0]?.settings_str
          );
          const supplierBoardId = supplierBoardSettings?.boardIds[0];

          const capaBoardSettings = JSON.parse(
            response?.data?.boards[0]?.columns[1]?.settings_str
          );
          const capaBoardId = capaBoardSettings?.boardIds[0];

          // Get the Count of Items in the "Supplier Board"
          const supplierResponse = await monday.api(
            `query {
              boards(ids: ${supplierBoardId}) {
                items_count
              }
            }`
          );

          supplierBoardItemsCount =
            supplierResponse?.data?.boards[0]?.items_count;

          // Get the Count of Items in the "CAPA Board" and Id of "Effectiveness Check" board
          const capaResponse = await monday.api(
            `query {
              boards(ids: ${capaBoardId}) {
                items_count
                columns(ids: "effectiveness_checks") {
                  settings_str
                }
              }
            }`
          );

          capaBoardItemsCount = capaResponse?.data?.boards[0]?.items_count;

          const effectivenessCheckBoardSettings = JSON.parse(
            capaResponse?.data?.boards[0]?.columns[0]?.settings_str
          );
          const effectivenessCheckBoardId =
            effectivenessCheckBoardSettings?.boardIds[0];

          //  Get the Count of Items in the "Effectiveness Check Board"
          const effectivenessCheckResponse = await monday.api(
            `query {
              boards(ids: ${effectivenessCheckBoardId}) {
                items_count
              }
            }`
          );

          effectivenessCheckBoardItemsCount =
            effectivenessCheckResponse?.data?.boards[0]?.items_count;
        } else if (boardName === "CAPA") {
          // Get the Count of Items in the "CAPA Board" and Id of "Effectiveness Check" board and parent "Quality Event" board
          const response = await monday.api(
            `query {
              boards(ids: ${boardId}) {
                items_count
                columns(ids: ["link_to_quality_event_mkkae0t0", "effectiveness_checks"]) {
                  settings_str
                }
              }
            }`
          );

          capaBoardItemsCount = response?.data?.boards[0]?.items_count;

          const qualityEventBoardSettings = JSON.parse(
            response?.data?.boards[0]?.columns[0]?.settings_str
          );

          const qualityEventBoardId = qualityEventBoardSettings?.boardIds[0];

          const effectivenessCheckBoardSettings = JSON.parse(
            response?.data?.boards[0]?.columns[1]?.settings_str
          );
          const effectivenessCheckBoardId =
            effectivenessCheckBoardSettings?.boardIds[0];

          //  Get the Count of Items in the "Effectiveness Check Board"
          const effectivenessCheckResponse = await monday.api(
            `query {
              boards(ids: ${effectivenessCheckBoardId}) {
                items_count
              }
            }`
          );

          effectivenessCheckBoardItemsCount =
            effectivenessCheckResponse?.data?.boards[0]?.items_count;

          // Get the Count of Items in the "Quality Event Board" and the Id of parent "Supplier" board
          const qualityEventResponse = await monday.api(
            `query {
              boards(ids: ${qualityEventBoardId}) {
                items_count
                columns(ids: ["link_to_supplier__1"]) {
                  settings_str
                }
              }
            }`
          );

          qualityEventBoardItemsCount =
            qualityEventResponse?.data?.boards[0]?.items_count;

          const supplierBoardSettings = JSON.parse(
            qualityEventResponse?.data?.boards[0]?.columns[0]?.settings_str
          );
          const supplierBoardId = supplierBoardSettings?.boardIds[0];

          // Get the Count of Items in the "Supplier Board"
          const supplierResponse = await monday.api(
            `query {
              boards(ids: ${supplierBoardId}) {
                items_count
              }
            }`
          );

          supplierBoardItemsCount =
            supplierResponse?.data?.boards[0]?.items_count;
        } else if (boardName === "Effectiveness Checks") {
          // Get the Count of Items in the "Effectiveness Check Board" and Id of parent "CAPA" board
          const response = await monday.api(
            `query {
              boards(ids: ${boardId}) {
                items_count
                columns(ids: ["link_to_capas__1"]) {
                  settings_str
                }
              }
            }`
          );

          effectivenessCheckBoardItemsCount =
            response?.data?.boards[0]?.items_count;

          const capaBoardSettings = JSON.parse(
            response?.data?.boards[0]?.columns[0]?.settings_str
          );
          const capaBoardId = capaBoardSettings?.boardIds[0];

          // Get the Count of Items in the "CAPA Board" and Id of parent "Quality Event" board
          const capaResponse = await monday.api(
            `query {
              boards(ids: ${capaBoardId}) {
                items_count
                columns(ids: ["link_to_quality_event_mkkae0t0"]) {
                  settings_str
                }
              }
            }`
          );

          capaBoardItemsCount = capaResponse?.data?.boards[0]?.items_count;

          const qualityEventBoardSettings = JSON.parse(
            capaResponse?.data?.boards[0]?.columns[0]?.settings_str
          );
          const qualityEventBoardId = qualityEventBoardSettings?.boardIds[0];

          // Get the Count of Items in the "Quality Event Board" and the Id of parent "Supplier" board
          const qualityEventResponse = await monday.api(
            `query {
              boards(ids: ${qualityEventBoardId}) {
                items_count
                columns(ids: ["link_to_supplier__1"]) {
                  settings_str
                }
              }
            }`
          );

          qualityEventBoardItemsCount =
            qualityEventResponse?.data?.boards[0]?.items_count;

          const supplierBoardSettings = JSON.parse(
            qualityEventResponse?.data?.boards[0]?.columns[0]?.settings_str
          );
          const supplierBoardId = supplierBoardSettings?.boardIds[0];

          // Get the Count of Items in the "Supplier Board"
          const supplierResponse = await monday.api(
            `query {
              boards(ids: ${supplierBoardId}) {
                items_count
              }
            }`
          );

          supplierBoardItemsCount =
            supplierResponse?.data?.boards[0]?.items_count;
        }

        //  Check plan Validation
        const isPlanValid = checkAllowedItemsCount({
          planId: subscription.plan_id,
          items_count:
            supplierBoardItemsCount +
            qualityEventBoardItemsCount +
            capaBoardItemsCount +
            effectivenessCheckBoardItemsCount,
        });

        if (!isPlanValid) {
          subscriptionStatus = "plan-limit";
          errorMessage = `You have reached the maximum number of items (${allowedItemsInPlanMap.get(
            subscription.plan_id
          )}) allowed in your plan (${
            subscription.plan_id
          }). Upgrade your plan to continue using the app.`;
        } else {
          subscriptionStatus = "valid";
        }
      }

      // if (!subscriptionStatus) {
      //   subscriptionStatus = "valid";
      // }

      setSubscriptionInfo({
        status: subscriptionStatus,
        message: errorMessage,
      });
      if (
        ["valid", "valid-assumed", "whitelisted", "trial"].includes(
          subscriptionStatus
        )
      ) {
        console.log("App Opened");
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
          "Please set up your subscription to continue using this app."
        }
        text={null}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            rowGap: "20px",
            alignItems: "center",
            marginTop: 20,
            maxWidth: "538.78px",
            textAlign: "center",
            width: "100%",
          }}
        >
          <p>
            You are not subscribed to any plan. You would need to purchase a
            suitable plan to use the app.
          </p>
          <Button
            onClick={() =>
              monday.execute("openPlanSelection", { isInPlanSelection: true })
            }
          >
            Purchase Plan
          </Button>
        </div>
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            rowGap: "20px",
            alignItems: "center",
            marginTop: 20,
            maxWidth: "538.78px",
            textAlign: "center",
            width: "100%",
          }}
        >
          <p>{message || ""}</p>
          <Button
            onClick={() =>
              monday.execute("openPlanSelection", { isInPlanSelection: false })
            }
          >
            View billing info
          </Button>
        </div>
      </AttentionBox>
    </div>
  );
};

const PlanLimitReachedSubscription = ({ message }) => {
  return (
    <div className="warning">
      <AttentionBox
        type={AttentionBox.types.WARNING}
        title="Please select a suitable subscription to continue using this app"
        text={null}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            rowGap: "20px",
            alignItems: "center",
            marginTop: 20,
            maxWidth: "538.78px",
            textAlign: "center",
          }}
        >
          <p>{message || ""}</p>
          <Button
            onClick={() =>
              monday.execute("openPlanSelection", { isInPlanSelection: false })
            }
          >
            View billing info
          </Button>
        </div>
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
      // console.info("sessionToken payload -> ", payload);
      if (payload.dat.is_view_only) {
        // A view only user cannot access the monday GQL API,
        // so we can't check their subscription status etc,
        // so we just disable the app for them
        console.info("View only user detected, disabling app");
        return setIsViewOnly(true);
      } else {
        monday.listen("context", (res) => {
          getSubscriptionStatus(setSubscriptionInfo, res?.data?.boardId);
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

  if (["plan-limit"].includes(subscriptionInfo.status)) {
    return (
      <SubscriptionMessageContainer>
        <PlanLimitReachedSubscription message={subscriptionInfo.message} />
      </SubscriptionMessageContainer>
    );
  }

  return <div className={subscriptionInfo.status}>{children}</div>;
};
