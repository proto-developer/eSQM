import * as Sentry from "@sentry/node";

const sentryContextMiddleware = (req, res, next) => {
  const scope = Sentry.getCurrentScope();
  scope.setTag("server-side", "true");

  if (req.session && req.session.userId) {
    scope.setUser({
      id: req.session.userId,
      account: req.session.accountId,
    });
    scope.setTag("account", req.session.accountId);
    scope.setContext("session", req.session);
  }
  next();
};

export { sentryContextMiddleware };
