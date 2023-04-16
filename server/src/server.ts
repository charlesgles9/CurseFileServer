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
const cc=cors({origin:"http://127.0.0.1:5173",credentials:true})
app.use(cc)
const PORT=process.env.PORT||8000
const dirTree:DirTree=new DirTree()
app.get("/", (req:Request, res:Response):void=>{
    
    const path:Path= new Path(os.homedir())
    const dir:Directory=  dirTree.opendir(path) //new Directory(path.join("Documents"))
    dir.listFiles((value:Path)=> !value.isHidden() ).then((files)=>{
    /* 
     //this method creates a new folder in the directory Tree
    files.forEach(value=>dirTree.opendir(value))
    */
       const toObjectAsync=async(path:Path)=>{return path.toObject()}
       const objectPromises=files.map(toObjectAsync)
       Promise.all(objectPromises)
       .then((data)=>{
         res.send(data)
       })
    
    })
    .catch(error=>console.log(error))

})


app.listen(PORT,():void=>{
    console.log("Server started!")
})