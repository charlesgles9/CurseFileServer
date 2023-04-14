import * as fs from 'fs'
import { statSync } from 'fs';
export class Path{

    private path:String
    constructor(path:String ){
        this.path=path
    }
    public get():String{
       return this.path
    }

    public parts():String[]{
        return this.path.split("/")
    }

    public fileName():String{
        return this.path.substring(this.path.lastIndexOf("/")+1)
    }

    public extension():String{
        return this.path.substring(this.path.lastIndexOf(".")+1)
    }

    public parent():String{
        return this.path.substring(0,this.path.lastIndexOf("/"))
    }

    public join(...parts:String[]):Path{
      return new Path(`${this.path}/`+parts.reduce((prev,curr)=>`${prev}/${curr}`))
    }

    public exists():Promise<void>{
        return new Promise((resolve,reject)=>{
            fs.access(Buffer.from(this.path),(error)=>{
                if(error){
                    reject(error)
                }else
                  resolve()
            })
        })
    }

    public toString():string{
        return this.path.toString()
    }

    public isFile():boolean{
        try {
            const stats = statSync(this.toString()) // console.log(stats)
            return stats.isFile()
          } catch (err) {
            console.error(err)
            return false
          }
    }

    public isFolder():boolean{
        return !this.isFile()
    }
}