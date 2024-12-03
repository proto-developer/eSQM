import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import express from "express";
import bodyParser from "body-parser";
import routes from "./routes/index.js";
import {
  securityHeadersMiddleware,
  jsonErrorMiddleware,
} from "./middlewares/general.js";

const { PORT: port } = process.env;
const app = express();

app.use(bodyParser.json({ strict: true }));
app.use(jsonErrorMiddleware);
app.use(securityHeadersMiddleware);

const allowedOrigins = [
  "https://83fd-2a09-bac1-5b20-28-00-1f1-1cf.ngrok-free.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    // Allow any subdomain of .monday.app
    if (
      origin.endsWith(".monday.app") ||
      origin.endsWith(".ngrok-free.app") ||
      allowedOrigins.includes(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(routes);

app.listen(port, () => {
  console.log(`Server Started at localhost: ${port}`);
});
