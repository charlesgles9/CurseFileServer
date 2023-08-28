import { useEffect, useRef, useState } from 'react'
import {Routes,Route } from 'react-router-dom';
import Home from './home';
import { ProviderContext } from './ProviderContext';
import VideoView from './video';
import './App.css'

function App() {

  const [path, setPath]=useState<string>()
  return <ProviderContext.Provider value={{path:path, setPath:setPath}}> <div>
        
  <Routes>
         <Route  path='/' element={<Home/>}></Route>
         <Route  path='/video' element={<VideoView/>}></Route>
  </Routes>
  
  </div></ProviderContext.Provider>
 
}

export default App
