import sharp from "sharp";
import { Path } from "../io/path";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";

export class ImgLoader {
  static isImage(extension: string): boolean {
    return (
      extension.includes("png") ||
      extension.includes("jpg") ||
      extension.includes("jpeg")
    );
  }

  static isVideo(extension: string): boolean {
    return (
      extension.includes("mp4") ||
      extension.includes("mkv") ||
      extension.includes("webm")
    );
  }

  static loadImageThumbnail(files: string[]): Promise<(Buffer | null)[]> {
    const fetchThumbnail = async (file: string) => {
      if (ImgLoader.isImage(Path.getExtension(file).toLocaleLowerCase())) {
        return await sharp(file).resize(200).toBuffer();
      } else if (
        ImgLoader.isVideo(Path.getExtension(file).toLocaleLowerCase())
      ) {
        return await this.extractVideoThumbnail(file);
      } else return null;
    };
    return new Promise((resolve, reject) => {
      const promises = files.map((value) => fetchThumbnail(value));
      const array_buffers = Promise.all(promises);

      resolve(array_buffers);
    });
  }

  private static extractVideoThumbnail = (file: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      const folder = new Path(file).parent().toString();
      const filename = new Path(file).fileName().toString() + ".jpg";
      ffmpeg(file)
        .screenshots({
          count: 1,
          timestamps: ["00:00:05"],
          size: "320x240",
          folder: folder,
          filename: filename,
        })
        .on("end", () => {
          // debug console.log(`${folder}/${filename}`)
          const loadffmpegThumbnail = async () => {
            //load the ffmpeg thumbnail
            const buffer = await sharp(`${folder}/${filename}`)
              .resize(200)
              .toBuffer();
            //delete the temporary file
            new Path(`${folder}/${filename}`).deleteFile();
            resolve(buffer);
          };

          loadffmpegThumbnail();
        })
        .on("error", (error) => {
          console.log(`Error converting video thumbnail ${error.message}`);
        });
    });
  };
}
