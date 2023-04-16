import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Axios from 'axios'


function fileView(value:any){
  const date:Date=new Date(value.birthTime)
  return<div className='f-container shadow'>
     
     <div className='file-list-view'>
        <img src={value.isDirectory?'./folder.png':"./file.png"}></img>
        <div>
        <h4 className='file-name'> {value.name}</h4>
        <p className='file-path'>{value.path+value.path}</p>
        </div>
        
    </div>
    <div className='file-list-view justify-between' >
    <p>{`${date.toLocaleDateString()} ${date.toLocaleTimeString()}`}</p>
    <p>{ !value.isDirectory?value.sizeStr:" "}</p>
    </div>
   
  </div>
}
function App() {
  const [count, setCount] = useState(0)
  const [files,setFiles]=useState([])
  const axios=Axios.create({ withCredentials:true})
  useEffect(()=>{
   Axios.get("http://localhost:8000/").then((response)=>{
       setFiles(response.data)
    console.log(response.data)
   })
  },[])
  return (
    <div className="App">
         <div className='v-container'>
            {
              files.map((file,index)=>{
                 return <div key={index}>{fileView(file)}</div>
              })
            }
         </div>
    </div>
  )
}

export default App
