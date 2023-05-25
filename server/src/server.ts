import express, {Request, Response, Application} from 'express'
import {Path} from './io/path'
import { Directory } from './io/directory'
import { DirTree } from './ds/dirtree'
import os from 'os'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { FileUtil } from './utils/fileutil'
import { ImgLoader } from './utils/ImgLoader'

const app:Application=express()

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use(cors({origin:"http://127.0.0.1:5173",credentials:true}))
const PORT=process.env.PORT||8000
const dirTree:DirTree=new DirTree()
app.get("/", (req:Request, res:Response):void=>{
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

app.get("/writable/dirs/", (req, res)=>{
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

app.get("/opendir/",(req,res)=>{
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

app.get("/closedir/",(req,res)=>{
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

app.get("/thumbnail", (req,res)=>{
    const {files}=req.query 
    ImgLoader.loadImageThumbnail(files as string[])
    .then((buffers=>{
       res.send({buffers:buffers,parent:new Path((files as string[])[0]).parent().toString()})
    })).catch((error)=>{
       console.log(error.message)
    })
})


app.get("/video", (req,res)=>{
  const{path}=req.query
   if(path!=null){
    const file=new Path(path.toString())
    //ignore folders to prevent server crashes 
    if(file.isFolder()) return 
    const size= file.size()
    const range=req.headers.range
    if(range){
      const [start,end]=range.replace('bytes=','').trim().split('-')
      //offset from the start of the file
      const startBytes=parseInt(start,10)
      //the total target size 
      const endBytes=end!==''?parseInt(end,10):size-1
      //chunk remaining to load 
      const chunkSize=endBytes-startBytes+1
      const headers={
        'Content-Range':`bytes ${startBytes}-${endBytes}/${size}`,
        'Accept-Ranges':'bytes',
        //prevent overflow 
        'Content-Length':Math.min(FileUtil.SIZE_MB,chunkSize),
        'Content-Type':'video/mp4'
      }
      res.writeHead(206,headers)
      const fileStream= Path.createReadStreamRanged(path.toString(),{start:startBytes,end:startBytes+FileUtil.SIZE_MB})
      fileStream.pipe(res)
    }else{
  
      res.writeHead(206,{
        'Content-Range':`bytes ${0}-${size}/${size}`,
        'Accept-Ranges':'bytes',
        'Content-Length':size,
        'Content-Type':'video/mp4'
      })

      const fileStream= Path.createReadStreamRanged(path.toString(),{start:0,end:size})
      fileStream.pipe(res)
     }
   }

})


app.listen(PORT,():void=>{
    console.log("Server started!")
})