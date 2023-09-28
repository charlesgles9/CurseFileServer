import sharp from "sharp";
import { Path } from "../io/path";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import os, { type } from "os";
import Hash from "./hash";
export class ImgLoader {
  private static secret: string = "curse_thumbnail";
  static isImage(extension: string): boolean {
    return (
      extension.includes("png") ||
      extension.includes("jpg") ||
      extension.includes("jpeg") ||
      extension.includes("webm")
    );
  }

  static isVideo(extension: string): boolean {
    return (
      extension.includes("mp4") ||
      extension.includes("mkv") ||
      extension.includes("webm") ||
      extension.includes("ts")
    );
  }

  static loadImageThumbnail(files: string[]): Promise<(Buffer | null)[]> {
    const fetchThumbnail = async (file: string) => {
      if (ImgLoader.isImage(Path.getExtension(file).toLocaleLowerCase())) {
        const targetPath = new Path(os.homedir())
          .join("CurseFileServer", ".thumbnails")
          .toString();
        const outPath = Path.createFolder(targetPath);
        if (outPath) {
          const hashValue = Hash(ImgLoader.secret, file);
          // use the hashed value as the filename
          const filePath = new Path(`${outPath}`).join(
            hashValue.toString() + ".jpg"
          );
          // if the file is already cached then return the cached file
          if (Path.existsSync(filePath.toString())) {
            return await sharp(filePath.toString()).toBuffer();
            // create the cached file and return the buffer
          } else {
            const imgbuffer = await sharp(file).resize(200).toBuffer();
            // write the new buffer to file
            fs.writeFileSync(filePath.toString(), imgbuffer);
            return imgbuffer;
          }
        }

        return await sharp(file).resize(200).toBuffer();
      } else if (
        ImgLoader.isVideo(Path.getExtension(file).toLocaleLowerCase())
      ) {
        return await this.extractVideoThumbnail(file);
      } else return null;
    };
    return new Promise((resolve, reject) => {
      const promises = files
        .map((value) => fetchThumbnail(value))
        .filter((value) => value != undefined || value != null);
      const array_buffers = Promise.all(promises);
      resolve(array_buffers);
    });
  }

  // extract video thumbnail and cache it
  private static extractVideoThumbnail = (
    file: string
  ): Promise<Buffer | null> => {
    return new Promise((resolve, reject) => {
      if (new Path(file).isFolder()) return resolve(null);
      const targetPath = new Path(os.homedir())
        .join("CurseFileServer", ".thumbnails")
        .toString();
      const outPath = Path.createFolder(targetPath);
      if (!outPath)
        console.error("Error creating thumbnail output path!" + targetPath);
      const folder = new Path(`${outPath}`).toString();
      // this is the hash value that will be used to save our thumbnails
      const hashValue = Hash(ImgLoader.secret, file);
      // use the hashed value as the filename
      const filePath = new Path(`${outPath}`).join(
        hashValue.toString() + ".jpg"
      );

      const filename = filePath.fileName().toString();
      //load image from path using sharp
      const loadffmpegThumbnail = async (path: string) => {
        //load the ffmpeg thumbnail
        const buffer = await sharp(path).resize(200).toBuffer();
        resolve(buffer);
      };

      // debug  console.log(filePath.toString());
      if (!Path.existsSync(filePath.toString())) {
        const ffmpeg_instance = ffmpeg(file)
          .screenshots({
            count: 1,
            timestamps: ["00:00:05"],
            size: "320x240",
            folder: folder,
            filename: filename,
          })
          .on("end", () => {
            // debug console.log(`${folder}/${filename}`)
            loadffmpegThumbnail(
              `${new Path(folder).join(filename).toString()}`
            );
          })
          .on("error", (error) => {
            console.log(`Error converting video thumbnail ${error.message}`);
          });

        //load the cached  thumbnail instead no need for conversion
      } else {
        loadffmpegThumbnail(filePath.toString());
      }
    });
  };
}
