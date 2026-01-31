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
import InfoScreen from './screens/InfoScreen.tsx'

import Header from './components/Header.tsx'
import Footer from './components/Footer.tsx'
import { socket, connectSocket, setMatchData } from './services/socketService';
import { ChatSidebar } from './components/ChatSidebar';

import "./css/App.css";

function App()
{
  // 1. LEER EL USUARIO DEL STORAGE ANTES DE INICIALIZAR EL REDUCER
  const savedUserNick = localStorage.getItem("pong_user_nick") || "";
  
  ////const [screen, dispatch] = useReducer(screenReducer, "menu" as Screen);
  //const [screen, dispatch] = useReducer(screenReducer, "login" as Screen); // Iniciamos en LOGIN por defecto
  
  // Si ya hay usuario, arrancamos en "menu". Si no, en "login".
  // Esto evita que React renderice 'LoginScreen' al refrescar y active el borrado de usuario.
  const [screen, dispatch] = useReducer(screenReducer, savedUserNick ? "menu" : "menu" as Screen);

  // // --- GESTIÓN DE USUARIO REAL,GESTIÓN DE ESTADOS GLOBALES ---
  const [currentUser, setCurrentUser] = useState<string>(savedUserNick);
  const [mode, setMode] = useState<GameMode>("ia");
  //ESTADO NUEVO: Guardamos el nombre del rival aquí
  const [opponentName, setOpponentName] = useState<string>("IA-Bot");
  const [ballInit, setBallInit] = useState<{x: number, y: number} | null>(null);
  const [playerSide, setPlayerSide] = useState<'left' | 'right'>('left');
  const [option, setOption] = useState<string>("");

  // Estado para la sala
  const [roomId, setRoomId] = useState<string>("");

  // 🔥 ESTADO PARA LA INVITACIÓN MODAL
  const [inviteRequest, setInviteRequest] = useState<{fromUserId: number, fromUserName: string} | null>(null);
  
  // -----------------------------------------------------------
  // 1. CONEXIÓN AUTOMÁTICA DEL SOCKET
  // -----------------------------------------------------------
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
  
  // -----------------------------------------------------------------------
  // 2. ESCUCHA GLOBAL DE SOCKET (PARTIDAS E INVITACIONES)
  // -----------------------------------------------------------------------
  useEffect(() => {
  const handleMatchFound = (payload: any) => {
          console.log("🔔 [App.tsx] Evento match_found recibido:", payload);

          if (payload.roomId) { 
              
              setRoomId(payload.roomId)
              // Si hay matchId lo guardamos, si no (privada), usamos 0
              setMatchData(payload.roomId, payload.matchId || 0);
              
              // Guardar Nombre Rival
              if (payload.opponent && payload.opponent.name) {
                  setOpponentName(payload.opponent.name);
              } else {
                  setOpponentName("Oponente Online");
              }

              // Guardar Física (si viene del backend)
              if (payload.ballInit) {
                  setBallInit(payload.ballInit);
              }

              // Guardar Lado
              if (payload.side) {
                  console.log("📍 Lado asignado a este cliente:", payload.side);
                  setPlayerSide(payload.side);
              }

              // Configurar modo remoto
              setMode("remote");

              // 🔥 IMPORTANTE: Asegurar que se cierra cualquier invitación pendiente
              setInviteRequest(null);

              // CAMBIO DE PANTALLA
              // Usamos dispatch, no navigate. El setTimeout ayuda a que los estados se asienten.
              setTimeout(() => {
                  console.log("🚀 Ejecutando cambio de pantalla a PONG...");
                  dispatch({ type: "PONG" }); 
              }, 50);
          } else {
             console.error("❌ Error: roomId no válido", payload);
          }
      };

      // 🔥 MANEJO DE INVITACIÓN CON MODAL PROPIO (NO window.confirm)
      const handleIncomingInvite = (data: { fromUserId: number, fromUserName: string }) => {
        console.log("🔔 Invitación recibida (Modal):", data);
        setInviteRequest(data); // Esto abrirá el pop-up visual
      };

      socket.on('match_found', handleMatchFound);
      socket.on('incoming_game_invite', handleIncomingInvite);

      return () => {
          socket.off('match_found', handleMatchFound);
          socket.off('incoming_game_invite', handleIncomingInvite);
      };
    }, []);

    // --- FUNCIÓN PARA ACEPTAR/RECHAZAR ---
const handleInviteResponse = (accept: boolean) => {
      // Si no hay invitación, no hacemos nada
      if (!inviteRequest) return;

      if (accept) {
          console.log("✅ Aceptando reto...");
          // 1. Avisamos al servidor
          socket.emit('accept_game_invite', { challengerId: inviteRequest.fromUserId });
          
          // 🔥 2. IMPORTANTE: Cerramos el modal VISUALMENTE ya.
          // No esperamos a que el servidor responda. Si hay error, ya lo manejaremos,
          // pero el usuario no debe ver el modal bloqueando la pantalla.
          setInviteRequest(null); 
      } else {
          console.log("❌ Rechazando reto.");
          setInviteRequest(null); // Cerramos el modal
      }
  };
   
// --- RENDERIZADO DE PANTALLAS ---
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
        case "info":
          return <InfoScreen dispatch={dispatch} option={option} />; 
        default:
          return null;
    }
  }

  return (
    <div className="app">
      {currentUser && <ChatSidebar />}
      {/* 🔥🔥 MODAL DE INVITACIÓN - ESTILOS INLINE PARA RAPIDEZ 🔥🔥 */}
      {inviteRequest && (
          <div style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
              display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
              <div style={{
                  backgroundColor: '#222', padding: '30px', borderRadius: '10px',
                  border: '2px solid #ea580c', textAlign: 'center', color: 'white',
                  maxWidth: '400px', boxShadow: '0 0 20px rgba(234, 88, 12, 0.5)'
              }}>
                  <h2 style={{marginTop: 0}}>⚔️ ¡DESAFÍO PONG!</h2>
                  <p style={{fontSize: '18px', margin: '20px 0'}}>
                      <strong>{inviteRequest.fromUserName}</strong> quiere jugar contigo.
                  </p>
                  <div style={{display: 'flex', gap: '20px', justifyContent: 'center'}}>
                      <button 
                          onClick={() => handleInviteResponse(true)}
                          style={{
                              backgroundColor: '#22c55e', color: 'white', border: 'none',
                              padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
                          }}
                      >
                          ACEPTAR
                      </button>
                      <button 
                          onClick={() => handleInviteResponse(false)}
                          style={{
                              backgroundColor: '#ef4444', color: 'white', border: 'none',
                              padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
                          }}
                      >
                          RECHAZAR
                      </button>
                  </div>
              </div>
          </div>
      )}

      <Header dispatch={dispatch} userName={currentUser} onLogout={handleLogout} />
      <main>{renderScreen()}</main>
      <Footer dispatch={dispatch} setOption={setOption}/>
    </div>
  );
}

export default App;
