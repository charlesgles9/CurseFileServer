import { useEffect, useRef, useState } from 'react'
import './App.css'
import Axios from 'axios'
import BreadCrumb from './components/BreadCrumb'
import { Navbar } from 'react-bootstrap'
import {Buffer}  from 'buffer'
import { HashMap } from './ds/hmap'
import ListView from './components/ListView'





function App() {
  
  const [fileTree,setFileTree]=useState<HashMap<string,any[]>>({})
  const [dir,setDir]=useState<any>({dir:"/", parent:undefined})
  const [fdirs,setfdirs]=useState<any[]>([])
  const drawerRef=useRef<HTMLDivElement>(null) 
  const axios=Axios.create({ withCredentials:true})


  const loadThumbnails=(data:any)=>{
    axios.get("http://localhost:8000/thumbnail",{params:{files:data.files.map((value:any)=>{return value.path})}}).then((response)=>{
      //add the thumbnails into memory
      const files=data.files.map((f:any,i:number)=>
       {f["thumb"]=response.data.buffers[i]!=null? `data:image/${f.extension};base64,`+
       Buffer.from(response.data.buffers[i],"binary").toString('base64'):null; return f})
      // don't use dir directly since user can change directories even when the
      // thumbnails loader hasn't sent a response from the server 
      const key=data.dir
      // replace the old key 
      setFileTree({...fileTree,key:files})
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
      
        loadThumbnails(data)

   })
   

  },[])

  const opendir=(folder:any)=>{
    // check if the folder has already been loaded 
    const obj=fileTree[folder.path]
    if(obj){
     setDir({dir:folder.path,parent:folder.parent})
     return 
    }
    // if no folder was previously loaded create a new one 
    axios.get(`http://localhost:8000/opendir/`,{params:{path:folder.path}}).then((response)=>{
      const data=response.data
      fileTree[data.dir]=data.files
      setFileTree(fileTree)
      setDir({dir:data.dir,parent:data.parent})
      loadThumbnails(data)

   })
  }
  const closedir=(folder:any)=>{
    console.log(folder.parent)
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
    
    <div className="App">
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
          
            
          <ListView files={fileTree[dir.dir]} callback={(file:any):void=>{opendir(file)}} 
          onScoll={(indices:number[])=>{

          }}/>
          
            
         </div>
         </div>
         </div>
    </div>
  )
}

export default App
