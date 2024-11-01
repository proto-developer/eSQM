import http from "http";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { cwd } from "process";

// Retrieve the current working directory, assuming it's the project root
const projectRoot = cwd();

let urlAvailability = {};

const getUrlAvailability = (url) => {
  if (urlAvailability[url] === undefined) {
    return false;
  }
  return urlAvailability[url];
};

const setUrlAvailability = (url, value) => {
  urlAvailability[url] = value;
};

export const checkServer = (targetUrl) => {
  return new Promise((resolve) => {
    const req = http.request(targetUrl, { method: "HEAD" }, (res) => {
      resolve(true);
    });

    req.on("error", () => {
      resolve(false);
    });

    req.end();
  });
};

/**
 * Creates middleware to proxy requests or serve static files based on server availability.
 * @param {string} targetUrl - The URL of the backend server to proxy to.
 * @param {string} staticDirectory - The directory from which to serve static files.
 * @param {string} pathStrip - The path prefix to strip from requests before proxying.
 * @returns Middleware function.
 */
export const staticOrProxyReactMiddleware = (targetUrl, staticDirectory) => {
  // Create proxy middleware regardless of server availability, as it will be used conditionally
  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
  });

  const fullStaticDirectory = path.join(projectRoot, staticDirectory);
  console.log("project root", projectRoot);
  const staticMiddleware = express.static(fullStaticDirectory);
  console.log("static middleware", staticMiddleware);

  // Check server availability and cache the result
  checkServer(targetUrl).then((isAvailable) => {
    setUrlAvailability(targetUrl, isAvailable);
    if (isAvailable) {
      console.log(`Proxying to ${targetUrl}`);
    } else {
      console.log(`Serving static files from ${fullStaticDirectory}`);
    }
  });

  // Return middleware function
  return (req, res, next) => {
    console.log(`Serving static file ${req.url}`); // eslint-disable-line no-console
    if (getUrlAvailability(targetUrl)) {
      proxy(req, res, next);
    } else {
      staticMiddleware(req, res, next);
    }
  };
};
