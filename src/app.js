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
  "https://7357-182-176-222-139.ngrok-free.app",
  "https://9bcd-182-176-222-139.ngrok-free.app",
  "https://d0f8-2a09-bac1-5b20-10-00-31-7f.ngrok-free.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    // Allow any subdomain of .monday.app
    if (origin.endsWith(".monday.app") || allowedOrigins.includes(origin)) {
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
