import express from "express";
import { Path } from "../io/path";
import ffmpeg from "fluent-ffmpeg";
import { Worker } from "worker_threads";
import { ChildProcess, spawn } from "child_process";
import { Queue } from "../ds/queue";
import { resolve } from "path";
import os from "os";
import { FFmpegStream, TranscodeQueue } from "../workers/ffmpegStream";
import Hash from "../utils/hash";

const router = express.Router();

router.get("/video", (req, res) => {
  const { path, quality, startTime } = req.query;

  if (path) {
    const targetPath = new Path(os.homedir()).join(
      "CurseFileServer",
      "stream",
      Hash("secret", path.toString())
    );
    Path.createFolder(targetPath.toString());
    // fetch the video metadata
    FFmpegStream.getVideoMetaData(path.toString()).then((vmd) => {
      const worker = new FFmpegStream(
        targetPath.join("output.m3u8").toString(),
        path.toString()
      );

      worker.start(startTime ? parseInt(startTime.toString()) : 0);
      worker.isReady().then((data) => {
        res.status(206).send({ m3u8: data, vmd: vmd });
        console.log("path to m3u8: " + data);
      });
    });
  }
});

router.get("/video/vmd", (req, res) => {
  const { path } = req.query;
  if (path) {
    // fetch the video metadata
    FFmpegStream.getVideoMetaData(path.toString())
      .then((vmd) => {
        res.status(200).send(vmd);
      })
      .catch((err) => {
        res.status(500).send(err);
      });
  } else {
    res.status(204).send("path is null!");
  }
});

router.post("/video/transcode", (req, res) => {
  const { path, options } = req.body;
});

function getMaxQuality(width: number, height: number): number {
  if (width >= 1920 && height >= 1080) {
    return 1080;
  } else if (width >= 1600 && height >= 900) {
    return 1440;
  } else if (width >= 1280 && height >= 720) {
    return 720;
  } else if (width >= 854 && height >= 480) {
    return 480;
  } else if (width >= 640 && height >= 360) {
    return 360;
  } else if (width >= 426 && height >= 240) {
    return 240;
  } else {
    return 144;
  }
}

export default router;
