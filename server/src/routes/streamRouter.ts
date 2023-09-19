import express from "express";
import { Path } from "../io/path";
import os from "os";
import { FFmpegStream, TranscodeQueue } from "../workers/ffmpegStream";
import Hash from "../utils/hash";

const router = express.Router();
const transcodeQueue = new TranscodeQueue();
router.get("/video/stream", (req, res) => {
  const { path, quality, startTime } = req.query;

  if (path) {
    const parent = new Path(Hash("transcode", path.toString()));
    console.log(parent.toString());
    const file = new Path(os.homedir())
      .join("CurseFileServer", "stream")
      .join(parent.toString())
      .join("output.m3u8");
    file
      .exists()
      .then(() => {
        res.send({ m3u8: parent.join(file.fileName()).toString() });
      })
      .catch((err) => {
        res.status(404).send("File not transcoded!");
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
  const { paths, options } = req.body;
  if (!paths) {
    res.status(204).send(JSON.stringify({ message: "No files selected!" }));
    return;
  }
  transcodeQueue.setOutputPath(
    new Path(os.homedir()).join("CurseFileServer", "stream").toString()
  );
  transcodeQueue.addFiles(paths as string[]);
  if (!transcodeQueue.isRunning()) {
    transcodeQueue
      .startJob()
      .then(() => {
        console.log("Transcoding started");
      })
      .catch(() => {
        console.log("Transcoding failed!");
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

export default router;
