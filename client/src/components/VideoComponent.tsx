import { useEffect, useRef, useState } from "react"
import Axios from 'axios'
import 'video.js/dist/video-js.css'
import videojs from "video.js"
import HLS from 'hls.js'
import Hls from "hls.js";
import { useNavigate } from "react-router";

type QualityOptions={
  meta_data:any,
  callback:(quality:string)=>void
}

const constructUri=(path:string,quality:string,seek:number)=>{
  return Object.entries({path:path, quality:quality, seek:seek}).map(([key,value]) => `${key}=${value}`)
.join('&');
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
function QualityOption({meta_data,callback}:QualityOptions){
     let quality=[1080,1440,720,540,480,360,240,144]


     const [active,setActive]=useState(0)

     //filter out higher resolutions unavailable within the video threshold
     if(meta_data?.streams){
      const max=getMaxQuality(meta_data.streams[0].coded_width,
        meta_data.streams[0].coded_height)
       quality=quality.filter(q=>(q<=max))
     }
    return <div className="btn-group p-4 videoQualityOptions rounded-3" style={{backgroundColor:"var(--darkControlBg)"}}>
      {
        quality.map((value,index)=>{
          return  <button type="button" className={`btn btn-outline-danger rounded-2 m-1
          ${active==index?"active":"inactive"}`} onClick={()=>{setActive(index); callback(`${value}`)}}>{`${value}p`}</button>
        })
      }
</div>
}


function VideoControls(playerRef:React.RefObject<HTMLVideoElement>,info:any, seekTo:(position:number)=>void, replay:()=>void){
  const controlRef=useRef<HTMLProgressElement>(null)
  const [seek,setSeek]=useState<number>(0)
  const [progress,setProgress]=useState<number>(0)
  const [isTouching, setIsTouching] = useState(false)
  let offset=0
  let duration=0
   
  const secondsToString=(duration:number):string=>{
     // get the seconds 
      if(duration<60){
         const sec=duration.toFixed(0)
        return `00:00:${'0'.repeat(2-sec.length)}${sec}`
        // get the minutes and seconds 
      }else if(duration<60*60){
        return `00:${(duration/60).toFixed(0)}:${(duration%60).toFixed(0)}`
        // get the hours minutes and seconds 
      }else{
        // extract the highest possible hours
         const hrs=Math.floor((duration/3600))
         const min=(((duration-(hrs*3600))/60).toFixed(0))
         const sec=(((duration-(hrs*3600))%60).toFixed(0))
        return `${'0'.repeat(2-hrs.toFixed().length)}${hrs}:
        ${'0'.repeat(2-min.length)}${min}:${'0'.repeat(2-sec.length)}${sec}`
      }
  }
  const handleTouchStart = (event: React.TouchEvent<HTMLInputElement>) => {
    setIsTouching(true)
    handleSeekChange(event.touches[0])
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLInputElement>) => {
    if (isTouching) {
      handleSeekChange(event.touches[0])
      setIsTouching(false)
    }
  }

  const handleOnMouseDown=(event:React.MouseEvent<HTMLProgressElement>)=>{
      setIsTouching(true)
      if(!controlRef.current) return
      const rangeRect = controlRef.current?.getBoundingClientRect()
      const offsetX=event.clientX-rangeRect.left
      const percentage = Math.abs((offsetX / rangeRect.width) * 100)
      playerRef.current?.pause()
      seekTo(percentage)
      setSeek(percentage)  
  }

  const handleOnMouseUp=(event:React.MouseEvent<HTMLInputElement>)=>{
    setIsTouching(false)
  }

  const handleOnMouseMove=(event:React.MouseEvent<HTMLInputElement>)=>{
    if(!controlRef.current) return
    if(isTouching){
    const rangeRect = controlRef.current?.getBoundingClientRect()
    const offsetX=event.clientX-rangeRect.left
    const percentage = Math.abs((offsetX / rangeRect.width) * 100)
    playerRef.current?.pause()
    seekTo(percentage*duration/100)
    setSeek(percentage)  
   
    }
  }

  function handleSeekChange(touch:React.Touch ) {
    if(!controlRef.current) return
    const rangeRect = controlRef.current?.getBoundingClientRect()
    const offsetX = touch.clientX - rangeRect.left
    const percentage = Math.floor((offsetX / rangeRect.width) * 100)
    playerRef.current?.pause()
    //seekTo(percentage)
    setSeek(percentage)  
  }


  useEffect(()=>{
    playerRef.current?.addEventListener('timeupdate',()=>{
     // console.log(" Duration ",metaData?.format.duration)
     //console.log(info.metaData)
     if(playerRef.current)
     setProgress(playerRef.current?.currentTime)
   })

   
  },[])

   
  
   if(playerRef.current&&info){
    duration=info.format.duration
    offset=progress+(seek*duration/100)
   }
  
   let percentage=0.1

   if(duration!=0)
     percentage=Math.min(offset/duration*100+0.1,100)
   
    return <div className="container-fluid d-flex flex-column align-self-end video-controls border border-danger ">
      
      <div className="container-fluid  row justify-content-center m-1 ">
        <button className="col-1 ">PLAY</button>
        <div className="container-fluid d-flex align-items-center">
        <label className="col-1 text-center text-white" style={{width:"120px"}} >{secondsToString(offset)}</label>
      <progress   ref={controlRef} style={{width:"100%", height:"10px"}} max={100}  value={percentage} onMouseDown={handleOnMouseDown}></progress>
      <label className="col-1 text-center text-white" style={{width:"120px"}}>{secondsToString(duration)}</label>
      </div>
      </div>

      <div className="col-4 d-flex flex-row align-self-center justify-content-center">
      <button className="m-1" >PREV</button>
      <button className="m-1">STOP</button>
      <button className="m-1">NEXT</button>
      </div>
    
    
      </div>
    
}

function VideoComponent(){
    const axios=Axios.create({ withCredentials:true})
    const vpRef=useRef<HTMLVideoElement>(null)
    const container=useRef<HTMLDivElement>(null) 
    const [videoUrl,setvideoUrl]=useState<string|null>(null)
    const [metaData, setMetaData]=useState<any>()
    const [hlsInstance,setHlsInstance]=useState<HLS>(new Hls())
    const navigate=useNavigate()
    const url='http://localhost:8000/video'
    var path:string=""
    const savedPlayerState = localStorage.getItem('playerState')
 if (savedPlayerState) {
    const state = JSON.parse(savedPlayerState)
    path=state.path
 }

   const closeStream=()=>{
    axios.post('http://localhost:8000/exit/stream')
    .then(response=>{
       // ToDo: create a floating message 
       navigate("/")
    })
   }

  

   const createStream=(seek:number)=>{
    axios.get(url, {params:{path:path,quality:720,seek:seek}})
    .then((response)=>{
     // console.log("new Stream created ",response.data)
    //  setvideoUrl(`http://localhost:8000/${response.data.m3u8}`)
      if(vpRef.current&&videoUrl&&!hlsInstance.media){
       // hlsInstance.detachMedia()
        hlsInstance.attachMedia(vpRef.current)
        hlsInstance.on(HLS.Events.MEDIA_ATTACHED,()=>{
          hlsInstance.loadSource(videoUrl)
        })
  
        hlsInstance.on(HLS.Events.MANIFEST_PARSED,()=>{
          vpRef.current?.play()
        })
  
        hlsInstance.on(HLS.Events.BUFFER_APPENDED,()=>{
          
        })
      }
    })
   }
   const createStreamInitial=()=>{
    axios.get(url, {params:{path:path,quality:720,seek:0}})
    .then((response)=>{
      console.log(response.data)
     // setvideoUrl(`http://localhost:8000/${response.data.m3u8}`)
      setMetaData(response.data.video_meta)
      if(vpRef.current&&!hlsInstance.media)
      hlsInstance.attachMedia(vpRef.current)
      hlsInstance.on(HLS.Events.MEDIA_ATTACHED,()=>{
        hlsInstance.loadSource(`http://localhost:8000/${response.data.m3u8}`)
      })

      hlsInstance.on(HLS.Events.MANIFEST_PARSED,()=>{
        vpRef.current?.play()
      })

      hlsInstance.on(HLS.Events.BUFFER_APPENDED,()=>{
        
      })
    })

   }

   const replay=()=>{
    axios.post('http://localhost:8000/exit/stream')
    .then(response=>{
      createStream(0)
    })
   }

 

   useEffect(()=>{
    axios.get("http://localhost:8000/stream/isplaying")
    .then((res)=>{
      console.log("Is Playing: ",res.data)
       if(!res.data){
       
        createStreamInitial()
       }
    })
      
      
   },[])

  
  
/* {
           VideoControls(vpRef,{path:path, metaData:metaData},
             // change seek position
             (position)=>{
               console.log("Seek called")
              //close previous stream and decode from a new seek position
               axios.post('http://localhost:8000/exit/stream')
               .then(response=>{
                 // decode stream from a new seek position
                 createStream(position)
                  console.log(position) 
               })
               
             },
             // replay video 
             ()=>{
               replay()
             }
             )
         }*/

    const seekTo=()=>{
      console.log("Seek called",vpRef.current?.currentTime)
    }
    const handleTouchStart = (event: React.TouchEvent<HTMLVideoElement>) => {
     
      handleSeekChange(event.touches[0])
    }
    function handleSeekChange(touch:React.Touch ) {
      if(!vpRef.current) return
      const rangeRect = vpRef.current?.getBoundingClientRect()
      const offsetX = touch.clientX - rangeRect.left
      const percentage = Math.floor((offsetX / rangeRect.width) * 100)
      vpRef.current?.pause()
       
    }
  

    return <div className="container-fluid video-container d-flex flex-row  bg-dark" ref={container} style={{height:"100vh"}} id="videoContainer">
       
        <video ref={vpRef} style={{width:"100%", height:"100%", backgroundColor:"var(--secondary)"}}
         controls   ></video>
        
        <div className="align-self-top" style={{position:"absolute"}}>
        <QualityOption meta_data={metaData} callback={()=>{

       }}/>
        </div>
        {
          VideoControls(vpRef,metaData,(position:number)=>{
           /* axios.post('http://localhost:8000/exit/stream')
            .then(response=>{
              // decode stream from a new seek position
             // createStream(position)
               console.log(position) 
            })*/
          },()=>{})
         }
        <div className="align-self-top container-fluid d-flex flex-column" style={{position:"absolute"}}>
          <div  className="align-self-end">
          <button className="text-white bg-transparent" onClick={()=>{
           
             setvideoUrl(null)
             closeStream()
             localStorage.setItem('playerState', JSON.stringify({path:""}))
             hlsInstance.destroy()
         }}>Close</button>
         </div>
         </div>
        
        </div>
       
}

export default VideoComponent

