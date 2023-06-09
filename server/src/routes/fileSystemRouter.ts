import express, {Request, Response, Application} from 'express'
import { ImgLoader } from '../utils/ImgLoader'
import { Path } from '../io/path'
import { Directory } from '../io/directory'
import { DirTree } from '../ds/dirtree'
import os, { type } from 'os'

const router = express.Router()
const dirTree:DirTree=new DirTree()
router.get("/", (req:Request, res:Response):void=>{
    const path:Path= new Path(os.homedir())
    const dir:Directory=  dirTree.opendir(path) //new Directory(path.join("Documents"))
    dir.listFiles((value:Path)=> !value.isHidden() ).then((files)=>{
    /*  //this method creates a new folder in the directory Tree
       files.forEach(value=>dirTree.opendir(value))*/
       const toObjectAsync=async(path:Path)=>{return path.toObject()}
       const objectPromises=files.map(toObjectAsync)
       Promise.all(objectPromises)
       .then((data)=>{
         res.send({files:data,dir:dir.getPath().toString(),parent:dir.getPath().parent().toString()})
       })
       
    })
    .catch(error=>console.log(error))
   
})

router.get("/writable/dirs/", (req, res)=>{
   const baseDir="/"
   const dir:Directory=new DirTree().opendir(new Path(baseDir))
     dir.listFiles((value:Path)=>!value.isHidden()).then((files)=>{
      const toObjectAsync=async(path:Path)=>{return path.toObject()}
      const objectPromises=files.map(toObjectAsync)
      Promise.all(objectPromises)
      .then((data)=>{
        res.send({files:data,dir:dir.getPath().toString()})
      })
     }).catch(error=>console.log(error))
})

router.get("/opendir/",(req,res)=>{
   const {path}=req.query
   const file=new Path(path as string)
  if(file.isFolder()){
   const dir:Directory=dirTree.opendir(file)
   dir.listFiles((value:Path)=> !value.isHidden() ).then((files)=>{
       const toObjectAsync=async(path:Path)=>{return path.toObject()}
       const objectPromises=files.map(toObjectAsync)
       Promise.all(objectPromises)
       .then((data)=>{
        res.send({files:data,dir:dir.getPath().toString(),parent:dir.getPath().parent().toString()})
        
      /*  dir.listFilesRecursive((value:Path)=> !value.isHidden()).then(files=>{
          Directory.fileListSize(files).then(bytes=>{
            console.log(bytes)
            console.log(FileUtil.convertBytesWordNotation(bytes))
          })
          
       })*/
    
       })
    })
    .catch(error=>console.log(error))
  
  }
  
})

router.get("/closedir/",(req,res)=>{
    const {path}=req.query
  if(path!=os.homedir()){
    //close the current directory
    dirTree.closeDir(new Path(path as string))
    // open the next directory if not null
    const entries=dirTree.getCurrentDirectory()?.getEntries()
    const toObjectAsync=async(path:Path)=>{return path.toObject()}
    const objectPromises=entries?.map(toObjectAsync)
    if(objectPromises)
    Promise.all(objectPromises).then((data)=>{
        const path=dirTree.getCurrentDirectory()?.getPath()
        res.send({files:data,dir:path?.toString(),parent:path?.parent().toString()})
    })
}
    
})

router.get("/thumbnail", (req,res)=>{
    const {files}=req.query 
    ImgLoader.loadImageThumbnail(files as string[])
    .then((buffers=>{
       res.send({buffers:buffers,parent:new Path((files as string[])[0]).parent().toString()})
    })).catch((error)=>{
       console.log(error.message)
    })
})
export default router
