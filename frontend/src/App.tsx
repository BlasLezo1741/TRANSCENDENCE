import { useReducer } from 'react';
import { useState } from 'react';
import { screenReducer } from './ts/screenConf/screenReducer.ts';

import type { Screen, GameMode } from "./ts/types.ts"

import MenuScreen from './screens/MenuScreen.tsx'
import OptionScreen from './screens/OptionScreen.tsx'
import PongScreen from './screens/PongScreen.tsx'

import Header from './components/Header.tsx'
import Footer from './components/Footer.tsx'

function App()
{
  const [screen, dispatch] = useReducer(screenReducer, "menu" as Screen);

  const [mode, setMode] = useState<GameMode>("ia");

  function renderScreen()
  {
    switch (screen)
    {
      case "menu":
        return <MenuScreen dispatch={dispatch} />;
      case "options":
        return <OptionScreen dispatch={dispatch} setMode={setMode} />;
      case "pong":
        return <PongScreen dispatch={dispatch} mode={mode}/>;
      default:
        return null;
    }
  }
  
  return (
    <div>{renderScreen()}</div>
  )

  // return (
  //   <div>
  //     <Header />
  //     <main>{renderScreen()}</main>
  //     <Footer />
  //   </div>
  // );
}

export default App;