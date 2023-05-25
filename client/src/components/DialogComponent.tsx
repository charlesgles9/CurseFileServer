type DialogOptions={
    content:any,
    show:boolean
}
function DialogComponent({content,show}:DialogOptions){
    
    return <div className="dialog-container">
           <dialog  className="dialog-content" open={show}>
             {
                content
             }
           </dialog>
    </div>
}


export default DialogComponent