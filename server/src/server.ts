import express, {Request, Response, Application} from 'express'
import {Path} from './io/path'
import { Directory } from './io/directory'
import { DirTree } from './ds/dirtree'
import os, { type } from 'os'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import videoRouter from './routes/streamRouter'
import router from './routes/fileSystemRouter'
const app:Application=express()


app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use(cors({origin:"http://127.0.0.1:5173",credentials:true}))
app.use(express.static(os.homedir()+"/CurseFileServer/stream")) // Replace with the path to the directory containing the HLS files
app.use('/', videoRouter)
app.use('/',router)
const PORT=process.env.PORT||8000

app.listen(PORT,():void=>{
    console.log("Server started!")
})