import * as fs from "fs";
import { statSync } from "fs";
import { FileUtil } from "../utils/fileutil";
import { resolve } from "path";
export class Path {
  private path: String;
  constructor(path: String) {
    this.path = path;
  }
  public get(): String {
    return this.path;
  }

  public parts(): String[] {
    return this.path.split("/");
  }

  public fileName(): String {
    return this.path.substring(this.path.lastIndexOf("/") + 1);
  }

  public extension(): String {
    return this.path.substring(this.path.lastIndexOf(".") + 1);
  }

  static getExtension(path: string) {
    return path.substring(path.lastIndexOf(".") + 1);
  }
  public parent(): String {
    return this.path.substring(0, this.path.lastIndexOf("/"));
  }
  public parentName(): String {
    return new Path(
      this.path.substring(0, this.path.lastIndexOf("/"))
    ).fileName();
  }
  public join(...parts: String[]): Path {
    return new Path(
      `${this.path}/` + parts.reduce((prev, curr) => `${prev}/${curr}`)
    );
  }

  public exists(): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.access(Buffer.from(this.path), (error) => {
        if (error) {
          reject(error);
        } else resolve();
      });
    });
  }

  public static existsSync(path: string): boolean {
    try {
      fs.accessSync(path);
      return true;
    } catch (err) {
      return false;
    }
  }
  public toString(): string {
    return this.path.toString();
  }

  public toObject(): any {
    const stats = this.getStats();
    return {
      name: this.fileName(),
      path: this.path,
      parent: this.parent(),
      birthTime: stats.birthtimeMs,
      size: stats.size,
      isDirectory: stats.isDirectory(),
      extension: this.extension(),
      sizeStr: FileUtil.convertBytesWordNotation(stats.size),
    };
  }

  public size(): number {
    const stats = this.getStats();
    return stats.size;
  }

  public getStats(): fs.Stats {
    return Path.existsSync(this.toString())
      ? statSync(this.toString())
      : new fs.Stats();
  }

  public isFile(): boolean {
    if (!Path.existsSync(this.toString())) return false;
    try {
      const stats = this.getStats(); // console.log(stats)
      return stats.isFile();
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  public isFolder(): boolean {
    if (!Path.existsSync(this.toString())) return false;
    try {
      const stats = this.getStats(); // console.log(stats)
      return stats.isDirectory();
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  public isHidden(): boolean {
    return this.fileName()[0] === ".";
  }

  public deleteFile(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        fs.unlinkSync(this.toString());
        console.log(`successfully deleted-> ${this.toString()}`);
        resolve(true);
      } catch (err) {
        console.log(`failed to delete: ${this.toString()}`);
        resolve(false);
      }
    });
  }
  public deleteFileSync(): boolean {
    try {
      fs.unlinkSync(this.toString());
      console.log(`successfully deleted-> ${this.toString()}`);
      return true;
    } catch (err) {
      console.log(`failed to delete: ${this.toString()}`);
      return false;
    }
  }

  public static deleteFolderItemsRecursive(folderPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (fs.existsSync(folderPath)) {
        //if it's a file exit
        if (new Path(folderPath).isFile()) return reject();
        fs.readdirSync(folderPath).forEach((file) => {
          const curPath = new Path(folderPath).join(file).toString();

          if (fs.lstatSync(curPath).isDirectory()) {
            this.deleteFolderItemsRecursive(curPath);
          } else {
            fs.unlinkSync(curPath);
            console.log("File deleted:", curPath);
          }
        });

        console.log("Folder Items Deleted:", folderPath);
        resolve();
      }
    });
  }

  public static createFolder(folder: string): string | undefined {
    if (fs.existsSync(folder)) return folder;
    return fs.mkdirSync(folder, { recursive: true });
  }

  public static createReadStreamRanged(
    path: string,
    range: any
  ): fs.ReadStream {
    return fs.createReadStream(path, range);
  }

  public static createReadStream(path: string): fs.ReadStream {
    return fs.createReadStream(path);
  }
}
