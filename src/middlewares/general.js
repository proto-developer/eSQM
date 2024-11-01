
export const jsonErrorMiddleware = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    res.status(400).json({ error: "Invalid JSON body" });
  } else {
    next();
  }
};

export const securityHeadersMiddleware = (req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    //res.setHeader('Content-Security-Policy', "default-src 'none'; frame-src 'none'");
    next();
};
