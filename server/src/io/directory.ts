import {Path} from './path'
import { FileFilter } from './fnf'
import * as fs from 'fs'
export class Directory{
    
    private path:Path
    private entries:Path[]=[]
  
    constructor(path:Path){
        this.path=path
       
    }

   public getPath():Path{
        return this.path
    }

    public async listFiles(fileFilter?:FileFilter<Path>):Promise<Path[]>{
       return new Promise<Path[]>((resolve,reject)=>{
          fs.readdir(this.path.toString(),(error,files)=>{
            if(error) return reject(error)
             //create a path object
              this.entries=files
             .map((value)=>new Path(`${this.path.toString()}/${value}`))
             //apply filter
             if(fileFilter)
                this.entries=this.entries.filter(fileFilter)
           
            
             return resolve(this.entries)
          })
       })
    }

   
    public async deleteFiles(...list:Path[]):Promise<Path[]>{
        return new Promise<Path[]>((resolve,reject)=>{

        })
    }

    public getEntries():Path[]{
        return this.entries
    }
}