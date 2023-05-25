import { useEffect, useRef, useState } from 'react'
import './App.css'
import Axios from 'axios'
import BreadCrumb from './components/BreadCrumb'
import {Buffer}  from 'buffer'
import { HashMap } from './ds/hmap'
import ListView from './components/ListView'
import VideoComponent from './components/VideoComponent'


function App() {
  
  const [fileTree,setFileTree]=useState<HashMap<string,any[]>>({})
  const [dir,setDir]=useState<any>({dir:"/", parent:undefined})
  const [fdirs,setfdirs]=useState<any[]>([])
  const drawerRef=useRef<HTMLDivElement>(null) 
  const axios=Axios.create({ withCredentials:true})
  const listRef=useRef<HTMLDivElement>(null)
  const [showVideoView,setShowVideoView]=useState({show:false,path:"/",playing:false})
  const loadThumbnails=(data:any,items:number[])=>{
    if(data.files?.length<items.length||!data.key) return
    // only pick visible items 
    const filteredFiles=items.map((index)=>{return {index:index,data:data.files[index]}})
    // make sure the selected items thumbnails are not loaded 
    const unLoadedFiles=filteredFiles.filter(value=> value.data.thumb==null&&!value.data.isDirectory&&!value.data.pending)
    if(unLoadedFiles.length==0)return
   // this pending flag make's sure a thumbnail isn't loaded twice
    unLoadedFiles.forEach((file)=>{
      data.files[file.index].pending=true
    })
     //load thumbnails
      axios.get("http://localhost:8000/thumbnail",{params:{files:unLoadedFiles.map((value:any)=>{return value.data.path})}}).then((response)=>{
      //add the thumbnails into memory
      unLoadedFiles.map((f,i)=>
      {f.data["thumb"]=response.data.buffers[i]!=null? `data:image/${f.data.extension};base64,`+
      Buffer.from(response.data.buffers[i],"binary").toString('base64'):null; return f})
      //update file list 
      unLoadedFiles.forEach((file)=>{
        file.data.pending=false
        data.files[file.index]=file.data
      })
      // don't use 'dir' directly since user can change directories even when the
      // thumbnails loader hasn't sent a response from the server 
      // instead reference it from the data object
      const key=data.dir
      // replace the old key and update the list 
      setFileTree({...fileTree,key:data})
})
  }

  useEffect(()=>{
   
    // fetch all foldes in the home directory
   axios.get("http://localhost:8000/").then((response)=>{
       const data=response.data
       setDir({dir:data.dir,parent:data.parent})
       fileTree[data.dir]=data.files
       setFileTree(fileTree)
       //populate the fdir with the default values
       const dvalues=["Music","Videos","Pictures","Documents","Downloads"]
       if(data.files.length>0){
         const values=dvalues.map((value)=>{return {path:`${data.dir}/${value}`,name:value }})
         setfdirs(values)
       }
   })
   

  },[])

  const opendir=(folder:any)=>{
  
    // check if the folder has already been loaded 
    const obj=fileTree[folder.path]
    if(obj){
     setDir({dir:folder.path,parent:folder.parent})
     // scroll to top
     listRef.current?.scrollTo(0,0)
     return 
    }
    
    // if no folder was previously loaded create a new one 
    axios.get(`http://localhost:8000/opendir/`,{params:{path:folder.path} }).then((response)=>{
       // scroll to top
       listRef.current?.scrollTo(0,0)
      const data=response.data
      fileTree[data.dir]=data.files
      setFileTree(fileTree)
      setDir({dir:data.dir,parent:data.parent})
   })
  }


  const openFile=(file:any)=>{

    console.log("called!")
     switch(file.extension){

      case 'mp4':
        setShowVideoView({show:true,path:file.path,playing:false})
        break
      case 'mkv':
        break
      case 'webm':
        break

     }
  }

   
  const closedir=(folder:any)=>{
    const  obj=fileTree[folder.parent]
    if(obj){
      setDir({dir:folder.parent, parent:folder.parent.substring(0,folder.parent.lastIndexOf("/"))})
      return  
    }
    axios.get(`http://localhost:8000/closedir/`,{params:{path:folder.dir}}).then((response)=>{
      const data=response.data
      setDir({dir:data.dir,parent:data.parent})
  })
  }


  console.log("Rerender")

   const toggleDrawer=()=>{
    const element=drawerRef.current
    if(element?.classList.contains("close-drawer")){
      element?.classList.remove("close-drawer")
      element?.classList.add("open-drawer")
    }else{
      element?.classList.remove("open-drawer")
      element?.classList.add("close-drawer")
    }
     
   }
  
  return (
    <>
 
    <div className="App">
    <VideoComponent  show={showVideoView.show} path={showVideoView.path} playing={showVideoView.playing}
     callback={(playing)=>{
       setShowVideoView({...showVideoView,playing:playing})
    } } closePlayer={()=>{setShowVideoView({show:false,playing:false,path:'/'})}}/>
      <nav className="navbar fixed-top navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid  ">
      <div className='d-flex'>
      <button  className='bg-dark' type="button" 
          onClick={()=>{
            toggleDrawer()
            
          }}>
            <span className="navbar-toggler-icon"></span>
        </button>
      <div className='navbar-nav' style={{marginLeft:"50px"}}>
          <div className='d-flex'>
        <img className="col-4 m-2 " onClick={()=>{closedir(dir)}} style={{width:"40px"}} src='/back.png'></img>
        <div className='d-flex align-self-end'>
        <BreadCrumb path={dir.dir}/>
        </div>
        </div>
        </div>
      </div>  
    </div>
        
      </nav>
      <div className='drawer-container'>
            <div ref={drawerRef} className='drawer bg-dark close-drawer'>
              <div className='drawer-items '>
                <div className='m-1'>
                <div className='d-flex flex-column  '>
                    {
                      fdirs.map((value)=>{
                        return   <div className='btn  text-white text-uppercase text-start drawer-item'>
                          <a key={value.path} 
                        onClick={()=>{opendir(value)}}>{value.name} </a>
                       
                      </div>
                      })
                    }
               </div>
                </div>
             
              </div>
            </div>
        </div>
         <div className='container-fluid padding-lg'>
          <div className='row justify-content-center'>

          <div className='col-sm-4 shadow-lg'>
          
            {
          <ListView listRef={listRef}files={fileTree[dir.dir]} id={dir.dir} 
          callback={(file:any):void=>{
            if(file.isDirectory) 
               opendir(file) 
            else 
              openFile(file)
          }} 
          onScoll={(files:any,id:any,indices:number[])=>{
             //  loadThumbnails({files:files,key:id},indices)
          }}/>
        }
          
            
         </div>
         </div>
         </div>
    </div>
   
    </>)
}

export default App
