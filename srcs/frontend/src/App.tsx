import { useReducer, useState } from 'react';
import { screenReducer } from './ts/screenConf/screenReducer.ts';

import type { Screen, GameMode } from "./ts/types.ts"

import MenuScreen from './screens/MenuScreen.tsx'
import SignScreen from './screens/SignScreen.tsx'
import LoginScreen from './screens/LoginScreen.tsx'
import PongScreen from './screens/PongScreen.tsx'
// import SettingsScreen from './screens/SettingsScreen.tsx'

import Header from './components/Header.tsx'
// import Footer from './components/Footer.tsx'
import { StatusBadge } from './components/StatusBadge'; // Importamos el nuevo badge

function App()
{
  const [screen, dispatch] = useReducer(screenReducer, "menu" as Screen);
  const [mode, setMode] = useState<GameMode>("ia");
  //ESTADO NUEVO: Guardamos el nombre del rival aquí
  const [opponentName, setOpponentName] = useState<string>("IA-Bot");
  
  // TRUCO TEMPORAL: 
  // Cuando abras la ventana incógnito, CAMBIA ESTO MANUALMENTE a "user_2" en el código.
  // En el futuro esto vendrá del LoginScreen.
  //const currentUser = "user_1";
  const queryParams = new URLSearchParams(window.location.search);
  const currentUser = queryParams.get("user") || "user_1";

  function renderScreen()
  {
    switch (screen)
    {
      case "menu":
        return <MenuScreen dispatch={dispatch} setMode={setMode} setOpponentName={setOpponentName} />;
      case "sign":
        return <SignScreen dispatch={dispatch} />;
      case "login":
        return <LoginScreen dispatch={dispatch} />;
      // case "settings":
      //   return <SettingsScreen dispatch={dispatch} />;
      case "pong":
         return <PongScreen dispatch={dispatch} mode={mode} userName={currentUser} opponentName={opponentName} />;
      default:
          return null;
    }
  }

  return (
    <div>
      {/* 1. Ponemos el indicador arriba de todo */}
      <StatusBadge /> 
      {/* Opcional: Mostrar quién soy para no liarnos */}
      <div style={{position: 'absolute', top: 0, right: 0, color: 'lime', padding: '5px'}}>
          Soy: {currentUser}
      </div>
      <Header dispatch={dispatch}/>
      {/* 2. El resto de la aplicación */}
      <main>{renderScreen()}</main>
    </div>
  );
}

export default App;