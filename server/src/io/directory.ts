import { Path } from "./path";
import { FileFilter } from "./fnf";
import * as fs from "fs";
import { Queue } from "../ds/queue";

export class Directory {
  private path: Path;
  private entries: Path[] = [];

  constructor(path: Path) {
    this.path = path;
  }

  public getPath(): Path {
    return this.path;
  }

  public async listFiles(fileFilter?: FileFilter<Path>): Promise<Path[]> {
    return new Promise<Path[]>((resolve, reject) => {
      fs.readdir(this.path.toString(), (error, files) => {
        if (error) return reject(error);
        //create a path object
        this.entries = files.map(
          (value) => new Path(`${this.path.toString()}${Path.getSep()}${value}`)
        );
        //apply filter
        if (fileFilter) this.entries = this.entries.filter(fileFilter);
        // sort the folders to the top of the list
        this.entries.sort((a, b) => (a.isFolder() && b.isFile() ? -1 : 1));
        return resolve(this.entries);
      });
    });
  }

  public listFilesRecursive(fileFilter?: FileFilter<Path>): Promise<Path[]> {
    var paths: Path[] = [];
    const q = new Queue(Number.MAX_SAFE_INTEGER, [this.path.toString()]);
    return new Promise<Path[]>((resolve, reject) => {
      // fetch files recursively
      for (let p = q.dequeue(); p != undefined; p = q.dequeue()) {
        try {
          fs.accessSync(p);
          const _list = fs.readdirSync(p);
          const _list_to_paths = _list.map(
            (value) => new Path(`${p}${Path.getSep()}${value}`)
          );
          paths.push(..._list_to_paths);
          //ignore files only use directory for recursive looping
          _list_to_paths
            .filter((value) => value.isFolder())
            .forEach((value) => {
              q.enqueue(value.toString());
            });
        } catch (error) {
          console.log(`File ${p} unreachable`);
        }
      }
      //apply filters
      if (fileFilter) paths = paths.filter(fileFilter);
      return resolve(paths);
    });
  }

  public async deleteFiles(...list: Path[]): Promise<Path[]> {
    return new Promise<Path[]>((resolve, reject) => {});
  }

  public getEntries(): Path[] {
    return this.entries;
  }

  public static fileListSize(files: Path[]): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      var bytes = 0;
      files.forEach((path) => {
        try {
          bytes += path.size();
        } catch (error) {
          console.log(` Error fetching file size for ${path} : ${error}`);
        }
      });
      return resolve(bytes);
    });
  }
}
