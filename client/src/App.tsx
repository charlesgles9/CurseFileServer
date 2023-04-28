import { useEffect, useRef, useState } from 'react'
import './App.css'
import Axios from 'axios'
import BreadCrumb from './components/BreadCrumb'
import { Navbar } from 'react-bootstrap'


function fileView(value:any,callback:()=>void){
  const date:Date=new Date(value.birthTime)
  return<div className='shadow p-2 rounded m-1' onClick={()=>{callback()}}>
     
     <div className='row p-1' >
        <img className='p-1 col-5' style={{width:"70px"}} src={value.isDirectory?'./folder.png':"./file.png"}></img>
        <div className='col-5'>
        <h4 className='file-name fs-5'> {value.name}</h4>
        <p className='file-path'>{value.path}</p>
        </div>
        
    </div>
    <div className='row  justify-content-between pt-2' >
      <div className='col-7'>
      <p>{`${date.toLocaleDateString()} ${date.toLocaleTimeString()}`}</p>
      </div>
       <div className='col-3'>
       <p>{ !value.isDirectory?value.sizeStr:" "}</p>
       </div>
   
    </div>         
   
  </div>
}



function App() {

  const [files,setFiles]=useState([])
  const [dir,setDir]=useState<string>("/")
  const [fdirs,setfdirs]=useState<any[]>([])
  const drawerRef=useRef<HTMLDivElement>(null) 
  const axios=Axios.create({ withCredentials:true})
  useEffect(()=>{
    // fetch all foldes in the home directory
   axios.get("http://localhost:8000/").then((response)=>{
       const data=response.data
       setFiles(data.files)
       setDir(data.dir)
       //populate the fdir with the default values
       const dvalues=["Music","Videos","Pictures","Documents","Downloads"]
       if(data.files.length>0){
         const values=dvalues.map((value)=>{return {path:`${data.dir}/${value}`,name:value }})
         setfdirs(values)
       }

   })
   

  },[])

  const opendir=(folder:any)=>{
    axios.get(`http://localhost:8000/opendir/`,{params:{path:folder.path}}).then((response)=>{
      const data=response.data
       setFiles(data.files)
       setDir(data.dir)
   })
  }
  const closedir=(folder:any)=>{
    axios.get(`http://localhost:8000/closedir/`,{params:{path:folder}}).then((response)=>{
      const data=response.data
      setFiles(data.files)
      setDir(data.dir)
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
        <BreadCrumb path={dir}/>
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
              files.map((file,index)=>{
                 return <div key={index}>{fileView(file, ()=>{
                    opendir(file as any )
                 })}</div>
              })
            }
         </div>
         </div>
         </div>
    </div>
  )
}

export default App
