import DialogComponent from "./DialogComponent";
import { useEffect, useRef, useState } from "react"
import Axios from 'axios'
type DialogOptions={
    show:boolean
    path:string
    playing:boolean
    closePlayer:()=>void
    callback:(playing:boolean)=>void
}

function VideoComponent({show,path,playing,callback,closePlayer}:DialogOptions){
    const axios=Axios.create({ withCredentials:true})
    const vpRef=useRef<HTMLVideoElement>(null)
    const container=useRef<HTMLDivElement>(null)
    const [videoUrl,setvideoUrl]=useState<string>("")
   useEffect(()=>{
     if(!playing){
  
     callback(true)
   
   if(container===null) return 
   
   setvideoUrl(`http://localhost:8000/video?path=${path}`)
   
     }
   },[show])
   
   console.log(videoUrl)
 
    const VideoView=()=>{
        return <div className="d-flex flex-column w-100 h-100" >
         <button className="align-self-end" onClick={()=>{closePlayer()}}>Close Player</button>
         <div className="container-fluid" ref={container} style={{width:"100%", height:"100%"}} id="videoContainer">

         {
            videoUrl?(<video style={{width:"100%", height:"100%"}} ref={vpRef} src={videoUrl} controls></video>):<></>
         }
         </div>
        
         </div>
    }
    return <>
        <DialogComponent content={<VideoView/>} show={show}/>
    </>
}

export default VideoComponent