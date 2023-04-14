import express, {Request, Response, Application} from 'express';
import {Path} from './io/path'
import { Directory } from './io/directory';
import { DirTree } from './ds/dirtree';

const app:Application=express()

const PORT=process.env.PORT||8000

app.get("/", (req:Request, res:Response):void=>{
    const path:Path= new Path("/home/chucky/Documents")
    res.send("Hello world from typescript")
    const dirTree:DirTree=new DirTree()
    const dir:Directory=  dirTree.opendir(path) //new Directory(path.join("Documents"))
    dir.listFiles((value:Path)=> value.isFolder()).then((files)=>{
     console.log(files)
     files.forEach(value=>dirTree.opendir(value))
    
    }).catch(error=>console.log(error))

    
})

app.listen(PORT,():void=>{
    console.log("Server started!")
})