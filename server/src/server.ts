import express, { Request, Response, Application } from "express";
import { Path } from "./io/path";
import { Directory } from "./io/directory";
import { DirTree } from "./ds/dirtree";
import os, { type } from "os";
import cors from "cors";
import cookieParser from "cookie-parser";
import videoRouter from "./routes/streamRouter";
import router from "./routes/fileSystemRouter";
const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.static(os.homedir() + "/CurseFileServer/stream")); // Replace with the path to the directory containing the HLS files
const clientUIPath = new Path(new Path(__dirname).parent().toString()).join(
  "public",
  "client"
);

console.log(clientUIPath.toString());
app.use(express.static(clientUIPath.toString()));

app.use("/", videoRouter);
app.use("/", router);
const PORT = process.env.PORT || 8000;
app.get("/home", (req, res) => {
  res.sendFile(
    new Path(clientUIPath.toString()).join("src", "index.html").toString()
  );
});
app.listen(PORT, (): void => {
  console.log("Server started!");
});
