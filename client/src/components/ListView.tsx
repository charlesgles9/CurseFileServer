import React, { useEffect, useRef } from "react"
import isElementVisible from "./ViewPort"


function setPlaceHolderIcon(value:any):string{
    // if server has finished loading the thumbnail return it
    if(value.thumb!=null)
       return value.thumb
    // default directory object 
    if(value.isDirectory)
       return './folder.png'
       // set default thumb
      switch(value.extension.toLocaleLowerCase()){
      case 'png':
        return './image.png'
      case 'jpg':
        return './image.png'
      case 'zip':
        return './zip.png'
      case 'json':
        return './json.png'
      case 'doc':
      case 'docx':
         return './word.png'
      case 'xls':
        return './sheet.png'   
      case 'pdf':
        return './pdf.png'     
      case 'iso':
        return './iso.png'   
      case 'subtitle':
        return './subtitle.png'  
      case 'mkv':
      case '3gp':
      case 'webm':      
      case 'mp4':
        return './video.png'  
      case 'log':
      case 'txt':
        return './txt.png'
      case 'sh':
        return './bash.png'  
      default:
        return './file.png'
  
     }
  }
  
  function fileView(value:any,callback:()=>void){
    const date:Date=new Date(value.birthTime)
    const src=setPlaceHolderIcon(value)
     
    return<div className='shadow p-2 rounded m-1' onClick={()=>{callback()}}>
       
       <div className='row p-1' >
          <img className={`p-2 col-5 ${value.thumb?'rounded-circle':'rounded-none'}`} style={{width:"70px", height:"70px"}} src={src}></img>
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

  type ListProps={
    files:any,
    callback:(file:any)=>void,
    onScoll:(itemIndices:number[])=>void
  }

function ListView({files,callback, onScoll}:ListProps){
        
    const elementRef=useRef<HTMLDivElement>(null)
 
    const itemVisibilityCheck=()=>{
      if(!elementRef.current){
         onScoll([])
         return 
      }
      const items=[]
      Array.from(elementRef.current.children).forEach((item,index)=>{
       if(isElementVisible(item as HTMLElement)){
          items.push(index)
       }
      })
    }
    const handleOnScroll=(event:React.UIEvent<HTMLElement>)=>{
      itemVisibilityCheck()
    }

  
    if(elementRef.current)
       itemVisibilityCheck()

    return <div ref={elementRef} id="listView" style={{ height:'85vh',overflowY:'scroll'} } onScroll={handleOnScroll} >
         {
             (files as [])?.map((file,index)=>{
                 return <div  key={index}>{fileView(file, ()=>{
                    callback(file)
                 })}</div>
              })
            }
            </div>
}

export default ListView