import ffmpeg from "fluent-ffmpeg";
import { Path } from "../io/path";
import { Directory } from "../io/directory";
import { AnyLengthString } from "aws-sdk/clients/comprehendmedical";
import { clearTimeout } from "timers";
class FFmpegStream {
  private outputPath: string;
  private inputPath: string;
  private ffmpeg: any = undefined;
  constructor(outputPath: string, inputPath: string) {
    this.outputPath = outputPath;
    this.inputPath = inputPath;
  }

  public start(startTime: number = 0) {
    console.log("creating ffmpeg process");

    this.ffmpeg = ffmpeg(this.inputPath)
      .output(this.outputPath)
      .outputOptions([
        "-c:v",
        "h264",
        "-preset",
        "ultrafast",
        "-g",
        "60",
        "-b:v",
        "300k",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-hls_list_size",
        "0",
        "-hls_time",
        "10",
        "-start_number",
        "10",
      ])
      .setStartTime(startTime)
      .on("end", () => {
        console.log("Decoding finished!");
      })
      .on("error", (err) => {
        console.log("Error converting video: " + err);
      });
    this.ffmpeg.run();
  }

  public static getVideoMetaData(file: string): Promise<ffmpeg.FfprobeData> {
    return new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
      ffmpeg.ffprobe(file, (err, metadata) => {
        if (err) {
          console.error("Error:", err.message);
          return;
        }
        console.log(metadata);
        resolve(metadata);
      });
    });
  }
  public isReady(): Promise<string> {
    const outputFolder = new Path(new Path(this.outputPath).parent());
    const dir = new Directory(outputFolder);

    return new Promise<string>((resolve, reject) => {
      const check = async () => {
        const files = await dir.listFiles().then((data) => {
          return data;
        });
        if (files.length >= 3) {
          console.log("trying...");
          const outputFile = new Path(this.outputPath);
          resolve(
            new Path(`${outputFolder.fileName()}`)
              .join(outputFile.fileName())
              .toString()
          );
        } else setTimeout(check, 1000);
      };
      check();
    });
  }
}

export default FFmpegStream;
