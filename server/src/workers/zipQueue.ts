import archiver from "archiver";
import { Queue, QueueEvent, QueueEventInterface } from "../ds/queue";
import { Path } from "../io/path";

type ZipArgs = {
  outputPath: string;
  files: string[];
};

class ZipQueue {
  private queue: Queue<archiver.Archiver> = new Queue<archiver.Archiver>(
    Number.MAX_SAFE_INTEGER
  );
  private event: QueueEventInterface = QueueEvent();
  private stopArchive: boolean = false;
  private running: boolean = false;

  public addArgs(params: ZipArgs) {
    this.queue.enqueue(this.createZip(params));
  }
  public getEvent(): QueueEventInterface {
    return this.event;
  }

  public isRunning() {
    return this.running;
  }

  public abort() {
    this.stopArchive = true;
  }

  public startJob() {
    this.event.addEventListener("finish", (message: string) => {
      if (this.isRunning()) {
        this.queue.dequeue()?.finalize();
        this.running = false;
      }
    });
    // start job
    this.queue.dequeue()?.finalize();
    this.running = true;
  }

  private createZip(params: ZipArgs): archiver.Archiver {
    const { outputPath, files } = params;
    const outputFile = new Path(outputPath);
    const stream = Path.createWriteStream(outputPath);

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    archive.on("warning", (error) => {
      this.running = false;
      if (error.code === "ENOENT")
        console.warn("Warning: File not found or readable.");
      else throw error;
    });

    archive.on("error", (error) => {
      this.running = false;
      throw error;
    });

    archive.on("data", (chunk: Buffer) => {
      if (this.stopArchive) {
        archive.abort();
        this.stopArchive = false;
        this.running = false;
        this.event.emit("killed", "Archive Aborted!");
      } else {
        //track progress here
      }
    });

    archive.pipe(stream);
    files.forEach((file: string) => {
      const fileObject = new Path(file);
      if (fileObject.isFile())
        archive.file(fileObject.toString(), {
          name: fileObject.fileName().toString(),
        });
      else
        archive.directory(
          fileObject.toString(),
          fileObject.fileName().toString()
        );
    });
    stream.on("close", () => {
      this.running = !this.queue.isEmpty();
      this.event.emit("finish", "Archive finished!");
      console.log("Archive created:", archive.pointer() + " total bytes");
    });

    return archive;
  }
}

export { ZipQueue };
