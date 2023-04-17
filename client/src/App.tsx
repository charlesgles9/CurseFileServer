import { useEffect, useState } from 'react'
import './App.css'
import Axios from 'axios'


function fileView(value:any,callback:()=>void){
  const date:Date=new Date(value.birthTime)
  return<div className='f-container shadow' onClick={()=>{callback()}}>
     
     <div className='file-list-view' >
        <img src={value.isDirectory?'./folder.png':"./file.png"}></img>
        <div>
        <h4 className='file-name'> {value.name}</h4>
        <p className='file-path'>{value.path}</p>
        </div>
        
    </div>
    <div className='file-list-view justify-between' >
    <p>{`${date.toLocaleDateString()} ${date.toLocaleTimeString()}`}</p>
    <p>{ !value.isDirectory?value.sizeStr:" "}</p>
    </div>
   
  </div>
}
function App() {

  const [files,setFiles]=useState([])
  const axios=Axios.create({ withCredentials:true})
  useEffect(()=>{
   axios.get("http://localhost:8000/").then((response)=>{
       setFiles(response.data)
   })
  },[])

  const opendir=(folder:any)=>{
    axios.get(`http://localhost:8000/opendir/`,{params:{path:folder.path}}).then((response)=>{
       setFiles(response.data)
   })
  }
  const closedir=(folder:any)=>{
    axios.get(`http://localhost:8000/closedir/`,{params:{path:folder.parent}}).then((response)=>{
      setFiles(response.data)
  })
  }

  return (
    <div className="App">
      <button onClick={()=>{closedir(files[0])}}>PREV</button>
      <ul className ="breadcrumb">
          <li><a href="#">Home</a></li>
          <li><a href="#">Pictures</a></li>
          <li><a href="#">Summer 15</a></li>
          <li>Italy</li>
           </ul>
         <div className='v-container'>
            {
              files.map((file,index)=>{
                 return <div key={index}>{fileView(file, ()=>{
                    opendir(file as any )
                 })}</div>
              })
            }
         </div>
    </div>
  )
}

export default App
