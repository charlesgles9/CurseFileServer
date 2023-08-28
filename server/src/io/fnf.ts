export interface FileFilter<T>{
      (value:T, index:number,list:T[]):boolean
}

