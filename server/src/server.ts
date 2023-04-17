import express, {Request, Response, Application} from 'express'
import {Path} from './io/path'
import { Directory } from './io/directory'
import { DirTree } from './ds/dirtree'
import os from 'os'
import cors from 'cors'
import cookieParser from 'cookie-parser'
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
         res.send(data)
       })
    })
    .catch(error=>console.log(error))
})

app.get("/opendir/",(req,res)=>{
   const {path}=req.query
   const dir:Directory=dirTree.opendir(new Path(path as string))
   dir.listFiles((value:Path)=> !value.isHidden() ).then((files)=>{
       const toObjectAsync=async(path:Path)=>{return path.toObject()}
       const objectPromises=files.map(toObjectAsync)
       Promise.all(objectPromises)
       .then((data)=>{
         res.send(data)
       })
    })
    .catch(error=>console.log(error))
})

app.get("/closedir/",(req,res)=>{
    const {path}=req.query
    //close the current directory
    dirTree.closeDir(new Path(path as string))
    // open the next directory
    const entries=dirTree.getCurrentDirectory()?.getEntries()
    const toObjectAsync=async(path:Path)=>{return path.toObject()}
    const objectPromises=entries?.map(toObjectAsync)
    if(objectPromises)
    Promise.all(objectPromises).then((data)=>{
        res.send(data)
    })
    
})
app.listen(PORT,():void=>{
    console.log("Server started!")
})