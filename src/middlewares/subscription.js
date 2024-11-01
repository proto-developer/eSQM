import initMondayClient from "monday-sdk-js";

const fullAccessAccountIds = [
  "18903400", // Capable Koala test account
  "10046003", // Monday appssolutions-team account
  "7271863", // Monday appsdemos account/
  "23360785", // Mohsin Acc
];
const app_name = "LUCY eQMS";

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

const getSubscriptionStatus = async (shortLivedToken, logger) => {
  const mondayClient = initMondayClient({ token: shortLivedToken });
  mondayClient.setApiVersion("2023-10");

  try {
    const res = await mondayClient.api(
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
    );

    const data = res.data;
    const subscription = data?.app_subscription[0] || false;

    let subscriptionStatus = false;
    let accountID = data.account.id;

    if (fullAccessAccountIds.includes(String(accountID))) {
      subscriptionStatus = "whitelisted";
    }

    if (!subscriptionStatus && !data.apps_monetization_status.is_supported) {
      subscriptionStatus = "not-supported";
      logger.warn(`App monetization is not supported, allowing all features`);
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

    if (
      (!subscriptionStatus && !data.account.plan) ||
      !data.account?.plan?.max_users
    ) {
      subscriptionStatus = "valid-assumed";
      logger.warn(
        `No plan data found, continuing assuming a 0 user plan, this will be very permissive`
      );
    }

    if (!subscriptionStatus) {
      const max_users = planIdToSeatCount(subscription.plan_id);
      const monday_max_users = data.account?.plan?.max_users || 0;
      if (max_users < monday_max_users) {
        subscriptionStatus = "invalid-subscription";
      }
    }

    if (!subscriptionStatus) subscriptionStatus = "valid";

    if (
      ["valid", "valid-assumed", "whitelisted", "trial"].includes(
        subscriptionStatus
      )
    ) {
      logger.info("Subscription is VALID");
      return true;
    } else {
      logger.info("Subscription is INVALID");
      return false;
    }
  } catch (error) {
    logger.error("Error in subscription checker", { error });
    return false;
  }
};

async function subscriptionMiddleware(req, res, next) {
  try {
    const token = req.session.shortLivedToken;
    const allowUse = await getSubscriptionStatus(token, req.session.logger);
    if (!allowUse) {
      const errorMessage = `Your ${app_name} trial has expired or your subscription is invalid. Please upgrade your subscription to continue using this app.`;
      res.status(402).json({
        severityCode: 4000,
        notificationErrorTitle: "Subscription required",
        notificationErrorDescription: errorMessage,
        runtimeErrorDescription: errorMessage,
      });
    } else {
      next();
    }
  } catch (err) {
    req.session.logger.error("Error in subscription middleware", {
      error: err,
    });
    res.status(500).json({ error: "not authenticated" });
  }
}

export { subscriptionMiddleware };
