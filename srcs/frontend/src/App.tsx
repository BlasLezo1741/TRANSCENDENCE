import { useReducer, useState, useEffect } from 'react';
import { screenReducer } from './ts/screenConf/screenReducer.ts';

import type { Screen, GameMode } from "./ts/types.ts"

import MenuScreen from './screens/MenuScreen.tsx'
import SignScreen from './screens/SignScreen.tsx'
import LoginScreen from './screens/LoginScreen.tsx'
import PongScreen from './screens/PongScreen.tsx'
// import SettingsScreen from './screens/SettingsScreen.tsx'

import Header from './components/Header/Header.tsx'
import Footer from './components/Footer/Footer.tsx'
import { StatusBadge } from './components/StatusBadge'; // Importamos el nuevo badge
import { socket, setMatchData } from './services/socketService';

import "./App.css";

function App()
{
  //const [screen, dispatch] = useReducer(screenReducer, "menu" as Screen);
  const [screen, dispatch] = useReducer(screenReducer, "login" as Screen); // Iniciamos en LOGIN por defecto
  
  // --- GESTIÓN DE USUARIO REAL ---
  // Intentamos leer del almacenamiento local al inicio, si no hay, es cadena vacía
  const [currentUser, setCurrentUser] = useState<string>(() => {
      return localStorage.getItem("pong_user_nick") || "";
  }); 
  const [mode, setMode] = useState<GameMode>("ia");
  //ESTADO NUEVO: Guardamos el nombre del rival aquí
  const [opponentName, setOpponentName] = useState<string>("IA-Bot");
  const [ballInit, setBallInit] = useState<{x: number, y: number} | null>(null);
  const [playerSide, setPlayerSide] = useState<'left' | 'right'>('left');
  
  // Estado para la sala
  const [roomId, setRoomId] = useState<string>("");
  // Si ya tenemos usuario guardado al cargar la página, vamos directos al menú
  useEffect(() => {
      if (currentUser && screen === 'login') {
          // Opcional: Si quieres saltar el login si ya hay usuario
          dispatch({ type: "MENU" });
      }
  }, []); 

  // ESCUCHA GLOBAL DE SOCKET EN APP  
  useEffect(() => {
      const handleMatchFound = (payload: any) => {
          console.log("🔔 [App.tsx] Evento match_found recibido:", payload);

          if (payload.roomId && payload.matchId !== undefined) {
              
              // 🔥 NUEVO: GUARDAR ROOM ID EN ESTADO
              setRoomId(payload.roomId)
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

              // 5. Configurar modo y cambiar pantalla
              setMode("remote");

              // 6. CAMBIO DE PANTALLA CON RETRASO (SOLUCIÓN)
              // Esperamos 50ms para asegurar que React actualice playerSide y opponentName
              // antes de montar el componente PongScreen.
              setTimeout(() => {
                  console.log("🚀 Ejecutando cambio de pantalla a PONG...");
                  dispatch({ type: "PONG" });
              }, 50);
          } else {
             console.error("❌ Error: roomId o matchId no válidos", payload);
          }
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
        return <MenuScreen dispatch={dispatch} setMode={setMode} userName={currentUser} />;
      case "sign":
        return <SignScreen dispatch={dispatch} />;
      case "login":
        //return <LoginScreen dispatch={dispatch} />;
        // Pasamos 'setCurrentUser' para que el Login pueda actualizar el estado de App
        return <LoginScreen dispatch={dispatch} setGlobalUser={setCurrentUser} />;
      case "pong":
        return <PongScreen
          dispatch={dispatch}
          mode={mode}
          userName={currentUser}
          opponentName={opponentName}
          ballInit={ballInit}
          playerSide={playerSide}
          roomId={roomId} 
        />;
      default:
          return null;
    }
  }

  return (
    <div>
      <StatusBadge /> 
      <div style={{position: 'absolute', top: 0, right: 0, color: 'lime', padding: '5px'}}>
          Soy: {currentUser}
      </div>
      <Header dispatch={dispatch}/>
      <main>{renderScreen()}</main>
      <Footer />
    </div>
  );
}

export default App;