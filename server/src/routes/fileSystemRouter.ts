import express, { Request, Response, Application } from "express";
import { ImgLoader } from "../utils/ImgLoader";
import { Path } from "../io/path";
import { Directory } from "../io/directory";
import { DirTree } from "../ds/dirtree";
import os, { type } from "os";

const router = express.Router();
const dirTree: DirTree = new DirTree();
router.get("/", (req: Request, res: Response): void => {
  const path: Path = new Path(os.homedir());
  const dir: Directory = dirTree.opendir(path); //new Directory(path.join("Documents"))
  dir
    .listFiles((value: Path) => !value.isHidden())
    .then((files) => {
      /*  //this method creates a new folder in the directory Tree
       files.forEach(value=>dirTree.opendir(value))*/
      const toObjectAsync = async (path: Path) => {
        return path.toObject();
      };
      const objectPromises = files.map(toObjectAsync);
      Promise.all(objectPromises).then((data) => {
        res.send({
          files: data,
          dir: dir.getPath().toString(),
          parent: dir.getPath().parent().toString(),
        });
      });
    })
    .catch((error) => console.log(error));
});

router.get("/writable/dirs/", (req, res) => {
  const baseDir = "/";
  const dir: Directory = new DirTree().opendir(new Path(baseDir));
  dir
    .listFiles((value: Path) => !value.isHidden())
    .then((files) => {
      const toObjectAsync = async (path: Path) => {
        return path.toObject();
      };
      const objectPromises = files.map(toObjectAsync);
      Promise.all(objectPromises).then((data) => {
        res.send({ files: data, dir: dir.getPath().toString() });
      });
    })
    .catch((error) => console.log(error));
});

router.get("/opendir/", (req, res) => {
  const { path } = req.query;
  const file = new Path(path as string);
  if (file.isFolder()) {
    const dir: Directory = dirTree.opendir(file);
    dir
      .listFiles((value: Path) => !value.isHidden())
      .then((files) => {
        const toObjectAsync = async (path: Path) => {
          return path.toObject();
        };
        const objectPromises = files.map(toObjectAsync);
        Promise.all(objectPromises).then((data) => {
          res.send({
            files: data,
            dir: dir.getPath().toString(),
            parent: dir.getPath().parent().toString(),
          });

          /*  dir.listFilesRecursive((value:Path)=> !value.isHidden()).then(files=>{
          Directory.fileListSize(files).then(bytes=>{
            console.log(bytes)
            console.log(FileUtil.convertBytesWordNotation(bytes))
          })
          
       })*/
        });
      })
      .catch((error) => console.log(error));
  }
});

router.get("/closedir/", (req, res) => {
  const { path } = req.query;
  if (path != os.homedir()) {
    //close the current directory
    dirTree.closeDir(new Path(path as string));
    // open the next directory if not null
    const entries = dirTree.getCurrentDirectory()?.getEntries();
    const toObjectAsync = async (path: Path) => {
      return path.toObject();
    };
    const objectPromises = entries?.map(toObjectAsync);
    if (objectPromises)
      Promise.all(objectPromises).then((data) => {
        const path = dirTree.getCurrentDirectory()?.getPath();
        res.send({
          files: data,
          dir: path?.toString(),
          parent: path?.parent().toString(),
        });
      });
  }
});

router.post("/thumbnail", (req, res) => {
  const { files } = req.body;
  console.log("Loading thumbnails...");
  ImgLoader.loadImageThumbnail(files as string[])
    .then((buffers) => {
      res.send({
        buffers: buffers,
        parent: new Path((files as string[])[0]).parent().toString(),
      });
      console.log("Thumbnails loaded...");
    })
    .catch((error) => {
      res.status(500).send("Error Loading thumbnail");
      console.log("Error loading thumbnails : " + error.message);
    });
});

router.get("/download", (req, res) => {
  const { filePath } = req.query;
  if (!filePath) return;
  const file = new Path(filePath.toString());
  const rangeHeader = req.headers["range"]?.toString().replace("bytes=", "");
  const match = rangeHeader?.split("-");
  const start = match ? parseInt(match[0]) : 0;
  console.log(start + " " + match);
  res.setHeader(
    "Content-Disposition",
    `attachment: filename=${file.fileName()}`
  );
  res.setHeader("Content-Range", `bytes ${start}/${file.size()}`);
  res.setHeader("Content-Length", file.size());
  const stream = Path.createReadStreamRanged(file.toString(), {
    start: start,
    end: file.size(),
  });
  stream.pipe(res);

  stream.on("error", (err) => {
    console.log(`Error reading file: ${err.message}`);
  });

  stream.on("end", () => {
    console.log("Download complete");
  });
});
export default router;
