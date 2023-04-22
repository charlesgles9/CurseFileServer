

function CrumbItem(value:string,index:number){
  return <li key={index}><a href="#">{value}</a></li>
}

function BreadCrumb(object:any){
    // split the path to array chunks
    const list:string[]=(object.path).split("/")
    return <div>
        <ul className ="breadcrumb">
           {
            list.map((value,index)=>{
               return CrumbItem(value,index)
            })
           }
     </ul>
     </div>

}

export default BreadCrumb