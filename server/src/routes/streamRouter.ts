import express from 'express'
import { Path } from '../io/path'
import ffmpeg from 'fluent-ffmpeg'
import {ChildProcess, spawn} from 'child_process'
import { Queue } from '../ds/queue'
import { resolve } from 'path'
import os from 'os'
const router = express.Router()
type hlsJob={
    ffmpegJob:ChildProcess,
    path:string
    seek:number
    quality:number,
    streamFile:string,
    segWildcard:string
 }
 var isPlaying=false
 const hlsStreamJobQueue=new Queue<hlsJob>(Number.MAX_SAFE_INTEGER)
 router.get("/stream/isplaying",(req,res)=>{
    res.send(isPlaying)
})
router.get("/video/metaData",(req,res)=>{
    const{path}=req.query
    if(path!=null)
    getVideoMetaData(path.toString()).then(data=>{
       
      res.status(206).send(data)
    })
  })
  
  router.post("/exit/stream", (req,res)=>{
    const ffmpegJob=hlsStreamJobQueue.dequeue()
       if(ffmpegJob){
          if (!ffmpegJob.ffmpegJob.killed)
               ffmpegJob.ffmpegJob.kill()
          res.send("Stream Closed")
       }else
          res.send("Stream Already Closed")
       
  })
  
router.get("/video", (req,res)=>{
  const{path, quality,seek}=req.query

  if(path){
  
    const file=new Path(path.toString())
    //ignore folders to prevent server crashes 
    if(file.isFolder()) return 
  
      if(file.extension()==="mp4"){
       
      if(!isPlaying){
        console.log("Creating ffmpeg process")
        getVideoMetaData(path.toString()).then(data=>{
        
          const startTime=(data.format.duration?parseInt(data.format.duration.toString()):0)*
          (seek?parseInt(seek.toString()):1)/100
          const coded_height=data.streams[0].coded_height
          const coded_width=data.streams[0].coded_width
          const maxHeight=coded_height?coded_height:720
          const maxWidth=coded_width?coded_width:720
          const segListPath=os.homedir()+`/CurseFileServer/stream/${generateRandomString(20)}.m3u8`
          const segWildcard=`${os.homedir()}/CurseFileServer/stream/${generateRandomString(20)}`
          // create a new ffmpeg process 
          const ffmpeg = spawn('ffmpeg', [
            '-ss',startTime.toString(),
            '-i', path.toString(),
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-g','60',
            '-b:v', '1500k',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-f', 'segment',
            '-movflags', '+faststart',
            '-vf',`scale=-2:${quality?quality:getMaxQuality(maxWidth,maxHeight)}`,
         //   '-seg_duration', '10',
           // '-use_template', '1' ,
          //  '-use_timeline' ,'0',
            '-threads', '1',
          //  '-seekable',"1",
           // '-single_file',"1",
            //'-hls_time', '10',
            //'-hls_list_size', '0',
            '-segment_list', segListPath,
           // '-hls_start_number', '0',
           // '-hls_segment_type', 'fmp4',
          // '-segment_time','5 ',
           '-segment_list_flags','+live',
           '-segment_list_size','100',
            //'-hls_playlist_type', 'vod',
            `${segWildcard}_%03d.ts`
          ])

          const jobItem:hlsJob={ ffmpegJob:ffmpeg,
                          path:path.toString(),
                          seek:seek?parseInt(seek.toString()):0,
                          streamFile:segListPath,
                          segWildcard:segWildcard,
                          quality:quality?parseInt(quality.toString()):720}
                
          if(!hlsStreamJobQueue.isEmpty())
               hlsStreamJobQueue.dequeue()?.ffmpegJob.kill()
          hlsStreamJobQueue.enqueue(jobItem)
  
          ffmpeg.on('error', (error) => {
           console.log(`FFmpeg process error: ${error.message}`)
           isPlaying=false
          })

          ffmpeg.stderr.on('data', (data) => {
           // console.error(`FFmpeg process stderr: ${data}`)
           isPlaying=true
          })

          ffmpeg.on('exit', (code, signal) => {
            if(jobItem){
             console.log(`ffmpeg process exited with code ${code} and signal ${signal} jobQueue `+hlsStreamJobQueue.size());
            //delete previous segments and stream file
             deleteStreamSegments(jobItem.streamFile,jobItem.segWildcard)
            }
         
            isPlaying=false
          })
  
         isPlaying=true
          
        // wait for ffmpeg to create the m3u8 hls file 
        isHlsFileReady(segListPath,segWildcard).then(()=>{
          res.status(200).send({m3u8:new Path(segListPath).fileName().toString(), video_meta:data})
        }).catch(()=>{
         console.log("Failed to create LiveStream")
        })
      })

       
      }else {
        console.log("ffmpeg process already running")
      }

       
      }
     
    }

})

function deleteStreamSegments(streamPath:string,segWildcard:string):Promise<void>{
   return new Promise<void>(()=>{
       new Path(streamPath).deleteFileSync()
       let counter=0
       while(true){
        var path=`${segWildcard}_${'0'.repeat(3-counter.toString().length)}${counter}.ts`
        if(!new Path(path).deleteFileSync()){
           resolve()
           break
        }
        counter++
       }
      
   })
}

/*generate random string A-z 0-9*/
function generateRandomString(length:number):string{
  const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const len=chars.length;
  const randChars=Array(len).fill(' ').map((index)=>{
     const np=(Math.random()*len)%len
     return chars.charAt(np)
  })
  return randChars.reduce((acc,value)=>acc+value)
}

function getMaxQuality(width:number,height:number):number{
    if(width>=1920&&height>=720){
        return 1080
       }else if(width>=1600&&height>=900){
       return 1440
       }else if(width>=1280&&height>=720){
       return 720
       }else if(width>=854&&height>=480){
       return 480
       }else if(width>=640&&height>=360){
       return 360
       }else if(width>=426&&height>=240){
        return 240
       }else{
         return 144
     }
  }

  /*checks if the hls livestream file has been created and at least 3 segments
have been decoded*/
function isHlsFileReady(path:string,segWildcard:string):Promise<void>{
    return new Promise<void>((resolve, reject)=>{
      let counter=0
      // 20sec retry 
      const max_tick=20
      const sec=500
      // this checks if there are at least 3 segments that have been decoded
      const segCheck=():boolean=>{
        return [`${segWildcard}_000.ts`,
                `${segWildcard}_001.ts`,
                `${segWildcard}_002.ts`
      ].filter(segment=>Path.existsSync(segment)).length>=1
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
         // make this check every second 
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
  export default router