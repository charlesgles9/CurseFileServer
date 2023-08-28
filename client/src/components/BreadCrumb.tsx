

function CrumbItem(list:string[],value:string,index:number){
  //  list.slice(0,index+1).join("/") 
  return <li className="breadcrumb-item " key={index} ><a className="breadcrumb-text text-white fw-bold pt-2" href="#"> {value}</a></li>
}

function BreadCrumb(object:any){
    // split the path to array chunks
    var list:string[]=(object.path).split("/")
    // reduce the length of the breadCrumb path list in the UI
    if(list.length>4){
    const start=2+list.length-4
    const stop=2+list.length-1
        list=list.slice(start,stop)
        list.unshift("...")
    }else if(list.length>=2){
      list=list.slice(2,list.length)
    }
   
    return(<ol className ="breadcrumb " >
           {
            (list.map((value,index)=>{
               return CrumbItem(list,value,index)
            }))
           }
     </ol>)
   

}

export default BreadCrumb