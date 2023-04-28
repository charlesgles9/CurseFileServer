import { Directory } from "../io/directory"
import { Path } from "../io/path"
class dirNode<T>{
 public data:T
 public next:dirNode<T> |null

 constructor(data:T){
    this.data=data
    this.next=null
 }
}


export class DirTree{

    private head:dirNode<Directory> | null
    private tail:dirNode<Directory> | null

     constructor(){
        this.head=null
        this.tail= null
     }

   public isEmpty():boolean{
    return this.head===null
   }

   public opendir(path:Path):Directory{
     const node= new dirNode<Directory>(new Directory(path))
     if(this.tail===null){
        this.head=node
        this.tail=node
     }else{
        this.tail.next=node
        this.tail=node
     }
     return node.data
   }

   public closeDir(path:Path){
    if(this.head===null) return 
    if(this.head.data.getPath().toString()===path.toString()){
        this.head=this.head.next
        if(this.head===null) 
        this.tail=null
        return
    }
      
    let current = this.head
    while (current.next !== null) {
        // remove this node 
      if (current.next.data.getPath().toString() === path.toString()) {
        current.next = current.next.next
        if (current.next === null) {
          this.tail = current
        }
        return
      }
      current = current.next
    }

   }

   public toArray():Directory[]{
    let current = this.head
        const dirs = []
    while (current !== null) {
        dirs.push(current.data)
        current = current.next
    }
     return dirs
   }

   public getCurrentDirectory():Directory |undefined{
      return this.tail?.data||this.head?.data
   }

   public print(): void {
    let current = this.head
    const dirs = []
    while (current !== null) {
      dirs.push(current.data.getPath().fileName())
      current = current.next
    }
    console.log(dirs.join(' -> '))
  }
}