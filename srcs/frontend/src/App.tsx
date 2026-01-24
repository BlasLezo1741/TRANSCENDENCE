import { useReducer, useState, useEffect } from 'react';
import { screenReducer } from './ts/screenConf/screenReducer.ts';

import type { Screen, GameMode } from "./ts/types.ts"

import MenuScreen from './screens/MenuScreen.tsx'
import SignScreen from './screens/SignScreen.tsx'
import LoginScreen from './screens/LoginScreen.tsx'
import PongScreen from './screens/PongScreen.tsx'
import ProfileScreen from './screens/ProfileScreen.tsx'
import StatsScreen from './screens/StatsScreen.tsx'
import SettingsScreen from './screens/SettingsScreen.tsx'

import Header from './components/Header/Header.tsx'
import Footer from './components/Footer/Footer.tsx'
import { StatusBadge } from './components/StatusBadge'; // Importamos el nuevo badge
import { socket, connectSocket, setMatchData } from './services/socketService';
import { ChatSidebar } from './components/ChatSidebar';

import "./App.css";

function App()
{
  // 1. LEER EL USUARIO DEL STORAGE ANTES DE INICIALIZAR EL REDUCER
  const savedUserNick = localStorage.getItem("pong_user_nick") || "";
  
  ////const [screen, dispatch] = useReducer(screenReducer, "menu" as Screen);
  //const [screen, dispatch] = useReducer(screenReducer, "login" as Screen); // Iniciamos en LOGIN por defecto
  
  // Si ya hay usuario, arrancamos en "menu". Si no, en "login".
  // Esto evita que React renderice 'LoginScreen' al refrescar y active el borrado de usuario.
  const [screen, dispatch] = useReducer(screenReducer, savedUserNick ? "menu" : "login" as Screen);

  // // --- GESTIÓN DE USUARIO REAL ---
  const [currentUser, setCurrentUser] = useState<string>(savedUserNick);
  const [mode, setMode] = useState<GameMode>("ia");
  //ESTADO NUEVO: Guardamos el nombre del rival aquí
  const [opponentName, setOpponentName] = useState<string>("IA-Bot");
  const [ballInit, setBallInit] = useState<{x: number, y: number} | null>(null);
  const [playerSide, setPlayerSide] = useState<'left' | 'right'>('left');
  
  // Estado para la sala
  const [roomId, setRoomId] = useState<string>("");
  
  // NUEVO (CRUCIAL): CONEXIÓN AUTOMÁTICA DEL SOCKET
  // Esto detecta si hay usuario (al hacer Login o al refrescar F5) y conecta el socket
  useEffect(() => {
    if (currentUser) {
        console.log("🔄 Usuario activo detectado. Conectando socket...");
        //connectSocket(); // <--- IMPORTANTE: Asegúrate de importar esto arriba
        // -----------------------------------------------------------
        // 🕵️ TRUCO PARA PROBAR: Leer ID de la URL
        // -----------------------------------------------------------
        const queryParams = new URLSearchParams(window.location.search);
        const urlId = queryParams.get('uid'); 
        
        // Si hay ?uid=X en la URL, usamos ese. 
        // Si no, intentamos leer del localStorage (o dejamos que el servicio lo busque).
        const idToConnect = urlId ? Number(urlId) : Number(localStorage.getItem("pong_user_id"));

        // Pasamos el ID explícito al servicio
        connectSocket(idToConnect);
        /*********************************** */
    }
  }, [currentUser]);

  // FUNCIÓN DE LOGOUT EXPLÍCITA
  // Pasa esta función a tu Header o donde tengas el botón de salir
  const handleLogout = () => {
      // 1. Limpiar Storage
      localStorage.removeItem("pong_user_nick");
      localStorage.removeItem("pong_user_id");
      // 2. Desconectar Socket
      socket.disconnect();
      // 3. Limpiar Estado
      setCurrentUser("");
      // 4. Cambiar Pantalla
      dispatch({ type: "LOGOUT" }); // O "LOGIN"
  };

  // ESCUCHA GLOBAL DE SOCKET EN APP  
  useEffect(() => {
      const handleMatchFound = (payload: any) => {
          console.log("🔔 [App.tsx] Evento match_found recibido:", payload);

          if (payload.roomId && payload.matchId !== undefined) {
              
              // NUEVO: GUARDAR ROOM ID EN ESTADO
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
        return <MenuScreen 
          dispatch={dispatch} 
          setMode={setMode} 
          userName={currentUser} 
          setOpponentName={setOpponentName} // <--- NUEVO
          setPlayerSide={setPlayerSide}     // <--- NUEVO
        />;
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
        case "profile":
          return <ProfileScreen />;
        case "stats":
          return <StatsScreen />;
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
      {/* 🔥 NUEVO: BARRA DE CHAT GLOBAL */}
      {/* La renderizamos solo si hay un usuario logueado */}
      {currentUser && <ChatSidebar />}
      {/* 2. El resto de la aplicación */}
      <Header 
        dispatch={dispatch} 
        userName={currentUser}
        onLogout={handleLogout}
      />
      <main>{renderScreen()}</main>
      <Footer />
    </div>
  );
}

export default App;