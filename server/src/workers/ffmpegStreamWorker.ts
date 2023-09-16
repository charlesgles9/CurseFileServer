import { ChildProcess, spawn } from "child_process";
import { Path } from "../io/path";
class FFmpegStreamWorker {
  private outputPath: string;
  private inputPath: string;
  private ffmpeg: any;
  constructor(outputPath: string, inputPath: string) {
    this.outputPath = outputPath;
    this.inputPath = inputPath;
  }

  public kill() {
    this.ffmpeg.kill("SIGHUP");
  }
  public start() {
    console.log("creating ffmpeg process");
    // create a temporary output directory for this video file
    const inputFile = new Path(this.inputPath);

    this.ffmpeg = spawn("ffmpeg", [
      //   "-ss",
      //   startTime.toString(),
      "-i",
      this.inputPath.toString(),
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-g",
      "60",
      "-b:v",
      "100k",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-f",
      "segment",
      "-movflags",
      "+faststart",
      "-vf",
      "-segment_list",
      this.outputPath,
      "-segment_list_flags",
      "+live",
      //"-segment_list_size",
      // "100",
      `${inputFile.fileName()}_%03d.ts`,
    ]);
    this.ffmpeg.on("exit", (code: number) => {
      console.log("Stream stopped with code: " + code);
    });
  }
}

export default FFmpegStreamWorker;
