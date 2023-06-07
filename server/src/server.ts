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
import {spawn} from 'child_process'
import { stdout } from 'process'
import { Queue } from './ds/queue'

const app:Application=express()

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use(cors({origin:"http://127.0.0.1:5173",credentials:true}))
app.use(express.static(os.homedir()+"/CurseFileServer/stream")); // Replace with the path to the directory containing the HLS files

const PORT=process.env.PORT||8000
const dirTree:DirTree=new DirTree()
const ffmpegJobQueue=new Queue(Number.MAX_SAFE_INTEGER)
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

app.get("/stream", (req,res)=>{
   
})

app.get("/video/metaData",(req,res)=>{
  const{path}=req.query
  if(path!=null)
  getVideoMetaData(path.toString()).then(data=>{
     
    res.status(206).send(data)
  })
})


app.get("/video", (req,res)=>{
  const{path, quality,seek}=req.query

  if(path!=null){
    console.log(quality)
    const file=new Path(path.toString())
    //ignore folders to prevent server crashes 
    if(file.isFolder()) return 
    const size= file.size()
    const range="bytes=0-"//req.headers.range
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
          'Content-Length':Math.min(FileUtil.SIZE_MB*10,chunkSize),
          'Content-Type':`video/${file.extension()}`
        }
        res.setHeader('Content-Type','application/vnd.apple.mpegurl')
        res.setHeader('Content-Range',`bytes ${startBytes}-${endBytes}/${size}`)
      
      if(ffmpegJobQueue.isEmpty()){
        console.log("Creating ffmpeg process")
        const ffmpeg = spawn('ffmpeg', [
          '-i', path.toString(),
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
         // '-g','48',
         // '-b:v', '1000k',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-f', 'segment',
       //   '-seg_duration', '10',
         // '-use_template', '1' ,
        //  '-use_timeline' ,'0',
          '-threads', '8',
        //  '-seekable',"1",
         // '-single_file',"1",
          //'-hls_time', '10',
          //'-hls_list_size', '0',
          '-segment_list', os.homedir()+"/CurseFileServer/stream/output.m3u8",
         // '-hls_start_number', '0',
         // '-hls_segment_type', 'fmp4',
         '-segment_time','10',
         //'-segment_list_flags','+live',
         '-segment_list_size','1000',
          '-hls_playlist_type', 'vod',
          `${os.homedir()}/CurseFileServer/stream/segments_%03d.ts`
        ]);

        ffmpeg.on('error', (error) => {
         // console.log(`FFmpeg process error: ${error.message}`);
        });
        ffmpeg.stderr.on('data', (data) => {
         // console.error(`FFmpeg process stderr: ${data}`);
        });
        ffmpeg.on('exit', (code, signal) => {
        //  console.log(`ffmpeg process exited with code ${code} and signal ${signal}`);
          ffmpegJobQueue.remove(ffmpeg)
          ffmpeg.kill('SIGTERM')
        });

      ffmpegJobQueue.enqueue(ffmpeg)
      }else {
        console.log("ffmpeg process already running")
      }


      getVideoMetaData(path.toString()).then(data=>{
        
        isHlsFileReady(`${os.homedir()}/CurseFileServer/stream/output.m3u8`).then(()=>{
          res.status(206).send({m3u8:"output.m3u8", video_meta:data})
        }).catch(()=>{
         console.log("Failed to create LiveStream")
        })
        
      })
       

       // const fileStream= Path.createReadStreamRanged(path.toString(),{start:startBytes,end:startBytes+FileUtil.SIZE_MB})
      //  fileStream.pipe(res)
      }else if(file.extension()==="mkv"){
        const decodeVideo=async ()=>{
        const metadata=await getVideoMetaData(path.toString())
        if(metadata.format.duration&&metadata.format.bit_rate&&metadata.format.size){
            const timeStamp=calculateTimestamps(metadata.format.duration,metadata.format.bit_rate,startBytes,startBytes+FileUtil.SIZE_MB*10,metadata.format.size)
            const output=file.parent().toString()+"/temp.output.mp4"
            //if(!new Path(output).exists())
       decodeMKVToMP4(res,file.toString(),output,{startTimestamp:timeStamp.startTimestamp, endTimestamp:timeStamp.endTimestamp,
        videoDuration:metadata.format.duration, startBytes:startBytes,endBytes:endBytes,quality:quality, size:metadata.format.size, seek:seek}).then(() => {
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
      }else if(file.extension()=="mp4"){
       // decodeAndStreamMKV(file.toString(),file.parent().toString()+"/output.mp4",res,0,size)
      }
     }
   }

})


function isHlsFileReady(path:string):Promise<void>{
    return new Promise<void>((resolve, reject)=>{
      let counter=0
      const max_tick=20
      const sec=1000

      // this checks if there are at least 3 segments that have been decoded
      const segCheck=():boolean=>{
        return [`${os.homedir()}/CurseFileServer/stream/segments_000.ts`,
                `${os.homedir()}/CurseFileServer/stream/segments_001.ts`,
                `${os.homedir()}/CurseFileServer/stream/segments_002.ts`
      ].filter(segment=>Path.existsSync(segment)).length==3
      }
      //this function checks if at least the m3u8 file has been
      //created by ffmpeg
       const check=()=>{
        if(Path.existsSync(path)&&segCheck())
           resolve()
        else if(counter>max_tick)
           reject()
       else 
         counter++
       setTimeout(check,sec)
       }
       check()
    })
}

 function getVideoMetaData(file:string ):Promise<ffmpeg.FfprobeData>{

  return new Promise<ffmpeg.FfprobeData>((resolve, reject)=>{
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) {
        console.error('Error:', err.message)
        return
      }

    //  console.log(metadata)
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
  console.log("seek ",options.seek)
  const path=os.homedir()+"/CurseFileServer/stream/stream.ts"
 // const cachePath=Path.createFolder(path)
 
 /* if(cachePath!==null){
    const command = ffmpeg(inputPath)
    .addOption('-preset', 'ultrafast')
    .addOption('-g', '48')
    .addOption('-sc_threshold', '0')
    .addOption('-map', '0')
    .addOption('-map', '-0:2') // Exclude audio channel 2 from mapping
    .addOption('-flags', '-global_header')
    .addOption('-f', 'segment')
    .addOption('-c:v', 'libx264') 
    .addOption('-an') // Disable audio
    .addOption('-segment_time', '10')
    .addOption('-segment_list', 'playlist.m3u8')
    .addOption('-hls_list_size', '4')
    .addOption('-segment_format', 'mpegts')
    .addOption('-segment_list_flags', '+live')
    .addOption('-segment_list_type', 'm3u8')
    .output(`${path}/output_%03d.ts`)
    .on('error', (err) => {
      console.error('FFmpeg error:', err)
    })
    .on('end', () => {
      console.log('Transcoding finished')
    })

  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
  

   command.run()

  }*/
  const ffmpegArgs = [
    '-i', inputPath,
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-hls_time', 10,
    '-hls_list_size', 0,
    '-start_number', 0,
    '-f', 'hls',
    path,
  ];

/*  const ffmpegProcess = spawn('ffmpeg', [
    '-i', inputPath,
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-hls_time', '10',
    '-hls_list_size', '0',
    '-start_number', '0',
    '-f', 'hls',
 
    path,
  ]);
  ffmpegProcess.stdout.on('data', (data) => {
    // Handle the output data, check if it contains information about a newly decoded segment
    // Example: Extract the segment filename from the data and send it to the client
    const outputData = data.toString('utf8');
    console.log("Hello")
  });
  ffmpegProcess.stderr.on('data', (data) => {
   // console.error(`FFmpeg stderr: ${data}`);
  })
  ffmpegProcess.on('error', (err) => {
    console.error('FFmpeg error:', err);
  });

  ffmpegProcess.on('close', (code) => {
    console.log('Transcoding finished with code:', code);
  });
  res.writeHead(200,{
    'Content-Type':'application/vnd.apple.mpegurl',
    'Transfer-Encoding':'chunked',
  })*/

//  ffmpegProcess.stdout.pipe(res)
  
  const command= ffmpeg(Path.createReadStream(inputPath))
  .setStartTime(options.startTimestamp)
  .setDuration(options.endTimestamp-options.startTimestamp)
  .outputFormat("matroska")
  .outputOptions('-c:v libx264')
  .outputOptions('-c:a aac')
  .outputOptions('-g', '48')
  .addOutputOptions(`-vf scale=-2:${options.quality?options.quality:'720'}`)
  .outputOption('-preset ultrafast')
  .outputOptions('-movflags +faststart')
  .on('error', (err) => {
    console.error('FFmpeg error:', err.message)
    command.kill('SIGKILL')
    res.end()
  })

  .on('close',()=>{
    res.end()
  })
  .on('end', () => {
    console.log('Transcoding completed successfully.')
    //command.kill('SIGKILL')
   // res.end()
    resolve()
   })



    
    res.writeHead(206,{
      'Content-Type':'x-matroska',
      'Transfer-Encoding':'chunked',
      'Content-Length':options.size,
      'Accept-Ranges':'bytes',
      'Content-Range':`bytes ${options.startBytes}-${options.endBytes}/${options.size}`
    })
   
   command.pipe(res, { end: true });
  
  })
    
  
}




app.listen(PORT,():void=>{
    console.log("Server started!")
})