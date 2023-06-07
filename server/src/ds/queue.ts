export class Queue<T>{

    private data:T[]
    private pool:number
    constructor(pool:number)
    constructor(pool:number,values?:T[])
    constructor(pool:number=Number.MAX_SAFE_INTEGER,values?:T[]){
        this.data=[]
        this.pool=pool
        if(values) this.data.push(...values)
        
    }

     public enqueue(item:T){
        if(this.pool>this.size())
           this.data.push(item)
     }

     public dequeue():T|undefined{
        return this.data.shift()
     }

     public remove(item:T):boolean{
      const index=this.data.indexOf(item)
        this.data.slice(index,1)
        return index!=-1
     }
     
     public isEmpty():boolean{
        return this.data.length==0
     }

     public size():number{
        return this.data.length
     }

     public peek(): T| undefined{
        return this.data[0]
     }
}