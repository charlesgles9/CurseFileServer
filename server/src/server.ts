import express, {Request, Response, Application} from 'express'
import {Path} from './io/path'
import { Directory } from './io/directory'
import { DirTree } from './ds/dirtree'
import os from 'os'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { FileUtil } from './utils/fileutil'
import { ImgLoader } from './utils/ImgLoader'
import ffmpeg from 'fluent-ffmpeg'
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
      const startBytes=parseInt(start)
      //the total target size 
      const endBytes=end!==''?parseInt(end):size-1
      //chunk remaining to load 
      const chunkSize=endBytes-startBytes+1
      console.log(range)
      if(file.extension()==="mp4"){
        const headers={
          'Content-Range':`bytes ${startBytes}-${endBytes}/${size}`,
          'Accept-Ranges':'bytes',
          'Transfer-Encoding':'chunked',
          //prevent overflow 
          'Content-Length':Math.min(FileUtil.SIZE_MB,chunkSize),
          'Content-Type':`video/${file.extension()}`
        }
        res.writeHead(206,headers)
        const fileStream= Path.createReadStreamRanged(path.toString(),{start:startBytes,end:startBytes+FileUtil.SIZE_MB})
        fileStream.pipe(res)
      }else if(file.extension()==="mkv"){
        const decodeVideo=async ()=>{
        const metadata=await getVideoMetaData(path.toString())
        if(metadata.format.duration&&metadata.format.bit_rate&&metadata.format.size){
            const timeStamp=calculateTimestamps(metadata.format.duration,metadata.format.bit_rate,startBytes,startBytes+FileUtil.SIZE_MB*1,metadata.format.size)
            const output=file.parent().toString()+"/temp.output.mp4"
            //if(!new Path(output).exists())
       decodeMKVToMP4(res,file.toString(),output,{startTimestamp:timeStamp.startTimestamp, endTimestamp:timeStamp.endTimestamp,
        videoDuration:metadata.format.duration, startBytes:startBytes,endBytes:endBytes, size:metadata.format.size}).then(() => {
             console.log('MKV decoding to MP4 completed successfully.')
              // Additional logic after successful decoding
          }).catch((error: Error) => {
              console.error('MKV decoding to MP4 failed:', error)
              // Additional error handling
         })
        }
      }
        decodeVideo()
       
      }
     
    }else{
  
      res.writeHead(206,{
        'Content-Range':`bytes ${0}-${size}/${size}`,
        'Accept-Ranges':'bytes',
        'Content-Length':size,
        'Content-Type':`video/${file.extension()}`
      })

      if(file.extension()==="mp4"){
      const fileStream= Path.createReadStreamRanged(path.toString(),{start:0,end:size})
      fileStream.pipe(res)
      }else if(file.extension()=="mkv"){
       // decodeAndStreamMKV(file.toString(),file.parent().toString()+"/output.mp4",res,0,size)
      }
     }
   }

})


 function getVideoMetaData(file:string ):Promise<ffmpeg.FfprobeData>{

  return new Promise<ffmpeg.FfprobeData>((resolve, reject)=>{
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) {
        console.error('Error:', err.message)
        return
      }

     // console.log(metadata)
      resolve(metadata)
    
    })
  })
 
}


function calculateTimestamps(duration: number, bitrate: number, startByte: number, endByte: number,fileSize:number): { startTimestamp: number, endTimestamp: number } {
 
     const bytesPerSecond=(bitrate/8)
     const startTimestamp=startByte/bytesPerSecond
     const endTimestamp=endByte/bytesPerSecond
  return { startTimestamp, endTimestamp };
}

function decodeMKVToMP4(res:Response,inputPath: string, outputPath: string,options:any): Promise<void> {
  return new Promise<void>((resolve, reject) => {


    console.log("start ", options.startTimestamp)
    console.log("end ", options.endTimestamp)
    console.log("duration",options.endTimestamp-options.startTimestamp)
    
 const command= ffmpeg(Path.createReadStream(inputPath))
  .seekInput(options.startTimestamp)
  .setDuration(options.videoDuration)
  .format("matroska")
  .outputOptions('-c:v libx264')
  .outputOptions('-c:a aac')
  .outputOption('-preset ultrafast')
  .outputOptions('-movflags frag_keyframe+empty_moov')
  .on('error', (err) => {
    console.error('FFmpeg error:', err.message)
    command.kill('SIGKILL')
  })
  .on('end', () => {
    console.log('Transcoding completed successfully.')
    command.kill('SIGKILL')
    res.end()
    resolve()
   })
  
    res.setHeader('Content-Type', 'video/mp4')
    res.setHeader('Accept-Ranges','bytes')
    res.setHeader('Content-Range',`bytes ${options.startBytes}-${options.size}/*`)
   command.pipe(res)
  
  })
    /*ffmpeg(Path.createReadStream(inputPath))
    .setStartTime(startTimestamp)
    .setDuration(endTimestamp)
    .outputOptions('-c:v libx264')
    .outputOptions('-c:a aac')
    .outputOptions('-movflags +faststart')
    .outputOptions('-strict -2')
    .format('mp4')
    .on('error', (err) => {
      console.error(err)
      res.end()
    }).on('close', ()=>{
      resolve()
    })
    .pipe(res)*/
    
    /*const ffmpeg = spawn('ffmpeg', [
      '-ss', `${startTimestamp}`,
      '-to', `${endTimestamp}`,
      '-i', inputPath,
      '-y',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      '-c:a', 'aac',
      '-strict', '-2',
      '-movflags', '+faststart',
      outputPath
    ])

    
    /*'-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '22',
    '-c:a', 'aac',
    '-strict', '-2',
    '-movflags', '+faststart',*/
   /* ffmpeg.stderr.on('data', (data: Buffer) => {
      console.error(`FFmpeg stderr: ${data}`)
    })

    ffmpeg.on('close', (code: number) => {
      if (code === 0) {
        const fileStream =Path.createReadStream(outputPath)
        fileStream.pipe(res)
        console.log('MKV decoding to MP4 completed successfully.')
        resolve()
      } else {
        reject(new Error(`MKV decoding to MP4 failed with code ${code}`))
      }
    })*/
  
}




app.listen(PORT,():void=>{
    console.log("Server started!")
})