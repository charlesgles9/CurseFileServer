import archiver from "archiver";
import { Queue, QueueEvent, QueueEventInterface } from "../ds/queue";
import { Path } from "../io/path";
import { Directory } from "../io/directory";

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
  private totalBytes: number = 0;
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
      } else {
        this.totalBytes = 0;
        this.event.emit("progress", 100);
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
      this.totalBytes = 0;
      if (error.code === "ENOENT")
        console.warn("Warning: File not found or readable.");
      else throw error;
    });

    archive.on("error", (error) => {
      this.running = false;
      this.totalBytes = 0;
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
        const progress = (archive.pointer() / this.totalBytes) * 100;
        this.event.emit("progress", progress);
      }
    });

    archive.pipe(stream);
    let _folders: Path[] = [];
    files.forEach((file: string) => {
      const fileObject = new Path(file);
      if (fileObject.isFile()) {
        archive.file(fileObject.toString(), {
          name: fileObject.fileName().toString(),
        });
        this.totalBytes += fileObject.size();
      } else {
        // for folders we will count these bytes later to prevent blocking
        _folders.push(fileObject);
        archive.directory(
          fileObject.toString(),
          fileObject.fileName().toString()
        );
      }
    });

    //holds all the list of promises
    let _folder_promises: Promise<Path[]>[] = [];
    // count the number of files in an individual folder
    _folders.forEach((folder: Path) => {
      const dir_promise = new Directory(folder).listFilesRecursive((value) =>
        value.isFile()
      );
      _folder_promises.push(dir_promise);
    });

    //count all the bytes available in this folder
    Promise.all(_folder_promises).then((array) => {
      array.forEach((files: Path[]) => {
        files.forEach((file) => {
          this.totalBytes += file.size();
        });
      });
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
