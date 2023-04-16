export class FileUtil{
   
    static SIZE_KB=1024
    static SIZE_MB=this.SIZE_KB*this.SIZE_KB
    static SIZE_GB=this.SIZE_MB*this.SIZE_MB
    static SIZE_TB=this.SIZE_GB*this.SIZE_GB
    static convertBytesWordNotation(bytes:number):string{
        if(bytes<this.SIZE_KB)      return `${bytes} bytes`
        else if(bytes<this.SIZE_MB) return `${(bytes/this.SIZE_KB).toFixed(2)} Kb`
        else if(bytes<this.SIZE_GB) return `${(bytes/this.SIZE_MB).toFixed(2)} Mb`
        else if(bytes<this.SIZE_TB) return `${(bytes/this.SIZE_GB).toFixed(2)} Gb`
        else                        return `${(bytes/this.SIZE_TB).toFixed(2)} TB`
        
    }

}