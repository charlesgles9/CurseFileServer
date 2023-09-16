import express from "express";
import { Path } from "../io/path";
import ffmpeg from "fluent-ffmpeg";
import { Worker } from "worker_threads";
import { ChildProcess, spawn } from "child_process";
import { Queue } from "../ds/queue";
import { resolve } from "path";
import os from "os";
import FFmpegStream from "../workers/ffmpegStream";
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

/*checks if the hls livestream file has been created and at least 3 segments
have been decoded*/
function isHlsFileReady(path: string, segWildcard: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let counter = 0;
    // 20sec retry
    const max_tick = 20;
    const sec = 500;
    // this checks if there are at least 3 segments that have been decoded
    const segCheck = (): boolean => {
      return (
        [
          `${segWildcard}_000.ts`,
          `${segWildcard}_001.ts`,
          `${segWildcard}_002.ts`,
        ].filter((segment) => Path.existsSync(segment)).length >= 1
      );
    };
    //this function checks if at least the m3u8 file has been
    //created by ffmpeg
    const check = () => {
      if (Path.existsSync(path) && segCheck()) resolve();
      else if (counter > max_tick) reject();
      else counter++;
      // make this check every second
      setTimeout(check, sec);
    };
    check();
  });
}

export default router;
