import { useReducer, useState, useEffect } from 'react';
import { screenReducer } from './ts/screenConf/screenReducer.ts';

import type { Screen, GameMode } from "./ts/types.ts"

import MenuScreen from './screens/Menu/MenuScreen.tsx'
import SignScreen from './screens/SignScreen.tsx'
import LoginScreen from './screens/LoginScreen.tsx'
import PongScreen from './screens/PongScreen.tsx'
import ProfileScreen from './screens/ProfileScreen.tsx'
import SettingsScreen from './screens/SettingsScreen.tsx'

import Header from './components/Header/Header.tsx'
import Footer from './components/Footer/Footer.tsx'
import { StatusBadge } from './components/StatusBadge'; // Importamos el nuevo badge
import { socket, setMatchData } from './services/socketService';

import "./App.css";

function App()
{
  const [screen, dispatch] = useReducer(screenReducer, "menu" as Screen);
  const [mode, setMode] = useState<GameMode>("ia");
  //ESTADO NUEVO: Guardamos el nombre del rival aquí
  const [opponentName, setOpponentName] = useState<string>("IA-Bot");
  const [ballInit, setBallInit] = useState<{x: number, y: number} | null>(null);
  const [playerSide, setPlayerSide] = useState<'left' | 'right'>('left');
  
  // TRUCO TEMPORAL: Usuario desde URL
  // Cuando abras la ventana incógnito, CAMBIA ESTO MANUALMENTE a "user_2" en el código.
  // En el futuro esto vendrá del LoginScreen.
  //const currentUser = "user_1";
  const queryParams = new URLSearchParams(window.location.search);
  const currentUser = queryParams.get("user") || "user_1";

  // 🔥 NUEVO: ESCUCHA GLOBAL DE SOCKET EN APP  
  useEffect(() => {
      const handleMatchFound = (payload: any) => {
          console.log("🔔 [App.tsx] Evento match_found recibido:", payload);

          if (payload.roomId && payload.matchId) {
              // 1. Guardar IDs
              setMatchData(payload.roomId, payload.matchId);
              
              // 2. Guardar Nombre Rival
              if (payload.opponent && payload.opponent.name) {
                  setOpponentName(payload.opponent.name);
              } else {
                  setOpponentName("Oponente Online");
              }

              // 3. Guardar Física
              if (payload.ballInit) {
                  setBallInit(payload.ballInit);
              }

              // 4. Guardar Lado (CRUCIAL)
              if (payload.side) {
                  console.log("📍 Lado asignado a este cliente:", payload.side);
                  setPlayerSide(payload.side);
              }
          }

          // 5. Configurar modo y cambiar pantalla
          setMode("remote");
          dispatch({ type: "PONG" });
      };

      // Activar listener
      socket.on('match_found', handleMatchFound);

      // Limpiar listener al desmontar
      return () => {
          socket.off('match_found', handleMatchFound);
      };
    }, []); // Array vacío = se ejecuta al montar App una vez

  function renderScreen()
  {
    switch (screen)
    {
      case "menu":
        return <MenuScreen
          dispatch={dispatch}
          setMode={setMode}
          userName={currentUser}
        />;
      case "sign":
        return <SignScreen dispatch={dispatch} />;
      case "login":
        return <LoginScreen dispatch={dispatch} />;
      // case "settings":
      //   return <SettingsScreen dispatch={dispatch} />;
      case "pong":
        return <PongScreen
          dispatch={dispatch}
          mode={mode}
          userName={currentUser}
          opponentName={opponentName}
          ballInit={ballInit}
          playerSide={playerSide}
        />;
      case "profile":
        return <ProfileScreen />;
      case "settings":
        return <SettingsScreen />;
      default:
          return null;
    }
  }

  return (
    <div className="app">
      {/* 1. Ponemos el indicador arriba de todo */}
      <StatusBadge />
      {/* 2. El resto de la aplicación */}
      <Header dispatch={dispatch} userName={currentUser}/>
      <main>{renderScreen()}</main>
      <Footer />
    </div>
  );
}

export default App;