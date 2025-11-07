import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { NODE_ENV } from "./config/env.js";
import chatRoutes from "./routes/chatRoutes.js";
import statsRoute from "./routes/statsRoute.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/", statsRoute);

if (NODE_ENV === "development") {
  app.use(cors({ origin: "http://localhost:3000" }));
}

app.use(chatRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, "../../chat-fronted/build");
app.use(express.static(clientPath));
app.get("*", (req, res) => res.sendFile(path.join(clientPath, "index.html")));

export default app;
