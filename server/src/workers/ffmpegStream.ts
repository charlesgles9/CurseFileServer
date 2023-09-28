import ffmpeg from "fluent-ffmpeg";
import { Path } from "../io/path";
import { Directory } from "../io/directory";
import { Queue } from "../ds/queue";
import Hash from "../utils/hash";
interface QueueEventArgs {
  finish: [string];
  failure: [string, string];
  progress: [number];
}

interface QueueEventInterface {
  addEventListener<K extends keyof QueueEventArgs>(
    e: K,
    cb: (...args: QueueEventArgs[K]) => void
  ): void;
  emit<K extends keyof QueueEventArgs>(e: K, ...args: QueueEventArgs[K]): void;
}

function QueueEvent(): QueueEventInterface {
  const listenerMap: {
    [K in keyof QueueEventArgs]?: ((...args: QueueEventArgs[K]) => void)[];
  } = {};
  const ret: QueueEventInterface = {
    addEventListener<K extends keyof QueueEventArgs>(
      e: K,
      cb: (...args: QueueEventArgs[K]) => void
    ) {
      const listeners: ((...args: QueueEventArgs[K]) => void)[] = (listenerMap[
        e
      ] ??= []);
      listeners.push(cb);
    },
    emit<K extends keyof QueueEventArgs>(e: K, ...a: QueueEventArgs[K]) {
      const listeners: ((...args: QueueEventArgs[K]) => void)[] =
        listenerMap[e] ?? [];
      listeners.forEach((cb) => cb(...a));
    },
  };
  return ret;
}

class FFmpegStream {
  private outputPath: string;
  private inputPath: string;
  private ffmpeg: any = undefined;
  private event: QueueEventInterface = QueueEvent();
  constructor(outputPath: string, inputPath: string) {
    this.outputPath = outputPath;
    this.inputPath = inputPath;
  }

  public kill() {
    if (this.ffmpeg) this.ffmpeg.kill("SIGINT");
  }

  public getEvent(): QueueEventInterface {
    return this.event;
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
        "0",
      ])

      .setStartTime(startTime)
      .on("end", () => {
        this.event.emit("finish", this.outputPath);
        console.log("Transcoding finished!");
        this.ffmpeg?.kill("SIGINT");
      })
      .on("error", (err) => {
        this.event.emit("failure", this.outputPath, err.message);
        console.log(`Error converting video: ${err.message}  ${err.code}`);
        this.ffmpeg?.kill("SIGINT");
      });
    this.ffmpeg.run();
  }
  public static getVideoMetaData(file: string): Promise<ffmpeg.FfprobeData> {
    return new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
      ffmpeg.ffprobe(file, (err, metadata) => {
        if (err) {
          console.error("Error:", err.message);
          reject(err.message);
          return;
        }
        // console.log(metadata);
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

class TranscodeQueue {
  private queue: Queue<FFmpegStream> = new Queue<FFmpegStream>(
    Number.MAX_SAFE_INTEGER
  );
  private files: string[] = [];
  private outputPath: string = "";
  private terminate: boolean = false;
  private event: QueueEventInterface = QueueEvent();

  public addFiles(files: string[]) {
    this.files.push(...files);
  }

  public setOutputPath(outputPath: string) {
    this.outputPath = outputPath;
  }

  static isVideo(extension: string): boolean {
    return (
      extension.includes("mp4") ||
      extension.includes("mkv") ||
      extension.includes("webm") ||
      extension.includes("3gp") ||
      extension.includes("ts")
    );
  }

  public getEvent(): QueueEventInterface {
    return this.event;
  }

  public kill() {
    this.terminate = true;
    this.queue?.peek()?.kill();
  }

  public isRunning() {
    return !this.queue.isEmpty();
  }

  public async startJob() {
    if (this.files.length > 0) {
      const paths: Path[] = [];

      for (let i = 0; i < this.files.length; i++) {
        const file = this.files[i];
        const path = new Path(file);
        if (path.isFile()) {
          paths.push(path);
        } // if it's a folder get all video files in this location
        else {
          const dir = new Directory(path);
          const subPaths: Path[] = await dir.listFilesRecursive((value: Path) =>
            TranscodeQueue.isVideo(value.extension().toString())
          );
          paths.push(...subPaths);
        }
      }
      paths.forEach((path: Path) => {
        const parent = Hash("transcode", path.parent().toString());
        const fileName = Hash("transcode", path.toString());
        const outputFolder = new Path(this.outputPath)
          .join(parent)
          .join(fileName);
        Path.createFolder(outputFolder.toString());
        this.queue.enqueue(
          new FFmpegStream(
            outputFolder.join("output.m3u8").toString(),
            path.toString()
          )
        );
      });
      const size = this.queue.size();
      const getPercentage = () => {
        return Math.round((size - this.queue.size() / size) * 100.0);
      };

      for (let i = 0; i < this.queue.size(); i++) {
        const item = this.queue.get(i);
        item?.getEvent().addEventListener("finish", (output) => {
          const percentage = getPercentage();
          if (!this.terminate) {
            if (this.queue.isEmpty()) {
              this.event.emit("finish", output);
            } else {
              this.queue?.dequeue()?.start();
              this.event.emit("progress", percentage);
            }
          } else this.event.emit("finish", `${percentage}`);
        });

        item?.getEvent().addEventListener("failure", (output, err) => {
          const percentage = getPercentage();
          if (!this.terminate) {
            if (this.queue.isEmpty()) {
              this.event.emit("finish", output);
            } else {
              this.queue?.dequeue()?.start();
              this.event.emit("progress", percentage);
            }
          } else {
            this.queue.clear();
            this.event.emit("failure", "terminated", `${percentage}`);
          }
        });
      }
      // start the job
      this.queue.peek()?.start();
      return Promise.resolve();
    } else return Promise.reject();
  }
}
export { FFmpegStream, TranscodeQueue, QueueEventArgs };
