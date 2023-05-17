import sharp from "sharp"
import { Path } from "../io/path"

export class ImgLoader{

   static  load(files:string[]):Promise<(Buffer | null)[]>{
      const fetchThumbnail=  async (file:string)=>{
        if(Path.getExtension(file).includes("png"))
            return  await sharp(file).resize(200).toBuffer() 
            else 
            return null
      }
      return new Promise((resolve,reject)=>{
         const promises=files.map(value=>fetchThumbnail(value))
         const array_buffers= Promise.all(promises)
        resolve(array_buffers)
      })
   }
}

