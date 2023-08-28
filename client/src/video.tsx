import { useContext } from "react";
import VideoComponent from "./components/VideoComponent";
import { ProviderContext } from "./ProviderContext";


function VideoView(){
    const {path,setPath} =useContext<any>(ProviderContext)

    // store the path to cache incase the page refreshed
    if(path){
        localStorage.setItem('playerState', JSON.stringify({path:path}))
    }
    return <div className="container-fluid bg-dark">
           <VideoComponent/>
    </div>
    
}

export default VideoView