import { useReducer, useState, useEffect, useRef } from 'react';
import { screenReducer } from './ts/screenConf/screenReducer.ts';
import { useTranslation } from 'react-i18next';

import type { Screen, GameMode, GameDifficult, ScrollOpt } from "./ts/types.ts"

import MenuScreen from './screens/MenuScreen.tsx'
import SignScreen from './screens/SignScreen.tsx'
import LoginScreen from './screens/LoginScreen.tsx'
import PongScreen from './screens/PongScreen.tsx'
import ProfileScreen from './screens/ProfileScreen.tsx'
import InfoScreen from './screens/InfoScreen.tsx'
import type { States } from './screens/InfoScreen.tsx';
import OAuthTermsScreen from './screens/OAuthTermsScreen.tsx'

import Header from './components/Header.tsx'
import Footer from './components/Footer.tsx'
import { socket, connectSocket, setMatchData } from './services/socketService';
import { ChatSidebar } from './components/ChatSidebar.tsx';
import { getMyProfile } from './services/user.service';
import { applyUserLanguage } from './i18n.ts';

import "./css/App.css";

import { getDefaultAvatar } from './assets/avatars';

import { useModal } from './context/ModalContext';

function App()
{
  const { t } = useTranslation();
  const { hideModal } = useModal();
  // 1. LEER EL USUARIO DEL STORAGE ANTES DE INICIALIZAR EL REDUCER
  const savedUserNick = localStorage.getItem("pong_user_nick") || "";
  const savedUserId   = Number(localStorage.getItem("pong_user_id")) || undefined;
  
  // Si ya hay usuario, arrancamos en "menu". Si no, en "menu".
  // Esto evita que React renderice 'LoginScreen' al refrescar y active el borrado de usuario.
  const [screen, dispatch] = useReducer(screenReducer, savedUserNick ? "menu" : "menu" as Screen);

  //Para saber en que pantalla estoy
  const screenRef = useRef(screen);
  useEffect(() => { screenRef.current = screen; }, [screen]);

  // --- GESTIÓN DE USUARIO REAL, GESTIÓN DE ESTADOS GLOBALES ---
  const [currentUser, setCurrentUser] = useState<string>(savedUserNick);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>(savedUserId);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);
  // True once syncProfile has resolved at least once for the current session.
  // Prevents Header from flashing the wrong bank-fallback avatar before the
  // real avatarUrl has been fetched from the API.
  const [profileSynced, setProfileSynced] = useState<boolean>(!savedUserNick);
  const [mode, setMode] = useState<GameMode>("ia");
  const [difficult, setDifficult] = useState<GameDifficult>("");
  // Guardamos el nombre del rival aquí
  const [opponentName, setOpponentName] = useState<string>("IA-Bot");
  // AVATAR
  const [opponentAvatar, setOpponentAvatar] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<number | null>(null);
  
  const [ballInit, setBallInit] = useState<{x: number, y: number} | null>(null);
  const [playerSide, setPlayerSide] = useState<'left' | 'right'>('left');
  const [option, setOption] = useState<States>("a");

  const [ia, setIa] = useState<boolean>(false);
  const [chatOpen, setChatOpen] = useState<boolean>(false);

  // Estado para la sala
  const [roomId, setRoomId] = useState<string>("");

  // Pending OAuth token (new OAuth user coming from LoginScreen who hasn't accepted terms yet)
  const [pendingOAuthToken, setPendingOAuthToken] = useState<string>("");
  // Error message coming back from OAuth callback (e.g. email conflict)
  const [oauthError, setOAuthError] = useState<string>("");

  const [scrollClass, setScroll] = useState<ScrollOpt>("scroll");

  // ESTADO PARA LA INVITACIÓN MODAL
  const [inviteRequest, setInviteRequest] = useState<{fromUserId: number, fromUserName: string} | null>(null);
  
  // ESTADO PARA EL MODAL DE AVISOS/ERRORES
  const [inviteError, setInviteError] = useState<string | null>(null);

  // -----------------------------------------------------------
  // 0. VERIFICACIÓN OAUTH AL CARGAR LA APP (ANTES QUE TODO) (EVITA DOBLE CLICK EN LOGIN PARA OAUTH)
  // -----------------------------------------------------------
  useEffect(() => {
    // Check URL for OAuth token on app load
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      try {
        // Decode JWT payload to get user info
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          window.atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );

        const payload = JSON.parse(jsonPayload); // { sub: 1, nick: 'foo', ... }

        // 1. Save data to localStorage
        localStorage.setItem("pong_token", token);
        localStorage.setItem("pong_user_nick", payload.nick);
        localStorage.setItem("pong_user_id", payload.sub.toString());

        // 2. Update Global State
        // NOTE: avatarUrl is NOT in the JWT — syncProfile useEffect will fetch it from
        // the API automatically when currentUser becomes truthy, so we don't set it here.
        setCurrentUser(payload.nick);
        setCurrentUserId(Number(payload.sub));
        //console.log("🔓 OAuth Login successful:", payload.nick);

        // 3. Clean URL (remove token from address bar)
        window.history.replaceState({}, document.title, window.location.pathname);

        // 4. Navigate to Menu
        dispatch({ type: "MENU" });

      } catch (err) {
        console.error("❌ Error processing OAuth token:", err);
      }
    }

    

    // New OAuth user — two possible flows depending on where they came from:
    //
    // A) SignScreen → user already accepted terms before clicking OAuth.
    //    SignScreen sets 'oauthTermsAccepted' in sessionStorage before redirecting.
    //    sessionStorage survives the provider round-trip (same tab) and is consumed
    //    here exactly once, so subsequent flows are never affected.
    //    → call /auth/oauth-complete directly, skip OAuthTermsScreen.
    //
    // B) LoginScreen → user is new and has NOT accepted terms yet.
    //    No sessionStorage flag is set.
    //    → show OAuthTermsScreen to collect acceptance first.
    const pendingToken = params.get('oauth_pending');

    if (pendingToken) {
      window.history.replaceState({}, document.title, window.location.pathname);

      // Read and immediately consume the flag — prevents it from affecting
      // any future OAuth flow in the same browser tab.
      const termsAccepted = sessionStorage.getItem('oauthTermsAccepted') === 'true';
      sessionStorage.removeItem('oauthTermsAccepted');

      if (termsAccepted) {
        // Came from SignScreen — complete registration directly
        fetch('/auth/oauth-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pendingToken }),
        })
          .then(r => r.json())
          .then(result => {
            if (result.ok) {
              const jwt = result.token;
              const payload = JSON.parse(atob(jwt.split('.')[1]));
              localStorage.setItem('pong_user_nick', payload.nick);
              localStorage.setItem('pong_user_id', String(payload.sub));
              localStorage.setItem('pong_token', jwt);
              setCurrentUser(payload.nick);
              setCurrentUserId(Number(payload.sub));
              //console.log("🔓 OAuth registration complete (SignScreen):", payload.nick);
              dispatch({ type: 'MENU' });
            } else {
              console.error("❌ oauth-complete failed:", result.msg);
              dispatch({ type: 'LOGIN' });
            }
          })
          .catch(err => {
            console.error("❌ Error calling /auth/oauth-complete:", err);
            dispatch({ type: 'LOGIN' });
          });
      } else {
        // Came from LoginScreen — show terms screen first
        setPendingOAuthToken(pendingToken);
        dispatch({ type: "OAUTH_TERMS" });
      }
    }

    // OAuth callback error (e.g. email already registered under a different account)
    const oauthError = params.get('oauth_error');
    if (oauthError) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setOAuthError(decodeURIComponent(oauthError));
      dispatch({ type: "LOGIN" });
    }
  }, []); // Run only once on mount

  useEffect(() => {
    let newScrollClass = ["pong", "profile", "info"].includes(screen) ? "no-scroll" : "scroll";
    
    // Solo actualizar el estado si realmente ha cambiado
    if (scrollClass !== newScrollClass)
	{	
		// if (screen === "pong")
		// 	newScrollClass += " overflow-x-hidden";
     	setScroll(newScrollClass);
    }
  }, [screen, scrollClass]); 

  // -----------------------------------------------------------
  // 1. CONEXIÓN AUTOMÁTICA DEL SOCKET
  // -----------------------------------------------------------
  useEffect(() => {
    if (currentUser) {
        //console.log("🔄 Active user detected. Connecting socket...");
        const queryParams = new URLSearchParams(window.location.search);
        const urlId = queryParams.get('uid'); 
        const idToConnect = urlId ? Number(urlId) : Number(localStorage.getItem("pong_user_id"));
        connectSocket(idToConnect);
    }
  }, [currentUser]);

  // -----------------------------------------------------------
  // 2. FETCH AVATAR + USER ID + LANGUAGE ON LOGIN / REFRESH
  // Runs whenever currentUser becomes truthy (login, OAuth, page refresh).
  // This is the single source of truth for avatarUrl — the JWT and
  // localStorage never carry it, so we always fetch it from the API.
  //
  // Language priority (Option B):
  //   - On login: apply the DB language, unless the user already made a manual
  //     choice this session (sessionStorage flag 'languageManuallySet').
  //   - On refresh: if the user manually switched language this session, respect
  //     that choice and skip the DB language.
  //   - On logout: the flag is cleared, so the next login resets to DB language.
  // -----------------------------------------------------------
  useEffect(() => {
    if (!currentUser) return;

    const syncProfile = async () => {
      try {
        const profile = await getMyProfile();
        if (profile) {
          setCurrentUserId(profile.id);
          setCurrentUserAvatarUrl(profile.avatarUrl ?? null);
          // Also keep localStorage id in sync (matters after normal login)
          localStorage.setItem("pong_user_id", String(profile.id));

          // Apply the user's DB language only if they have not manually
          // switched language during this session.
          if (!sessionStorage.getItem('languageManuallySet')) {
            applyUserLanguage(profile.lang);
          }
        }
      } catch (err) {
        // Non-fatal: avatar just won't show until profile is visited
        console.warn("⚠️ [App] Could not sync profile on login:", err);
      } finally {
        // Always mark as synced so Header stops showing the loading placeholder
        setProfileSynced(true);
      }
    };

    syncProfile();
  }, [currentUser]);

  // FUNCIÓN DE LOGOUT EXPLÍCITA
  const handleLogout = () => {
      // 1. Limpiar Storage
      localStorage.removeItem("pong_user_nick");
      localStorage.removeItem("pong_user_id");
      localStorage.removeItem("pong_token");
      // 2. Clear the manual language flag so the next login resets to DB language
      sessionStorage.removeItem('languageManuallySet');
      // 3. Desconectar Socket
      socket.disconnect();
      // 4. Limpiar Estado
      setCurrentUser("");
      setCurrentUserId(undefined);
      setCurrentUserAvatarUrl(null);
      setProfileSynced(false);
      // 5. Cambiar Pantalla
      dispatch({ type: "LOGOUT" });
  };
  
  // -----------------------------------------------------------------------
  // 3. ESCUCHA GLOBAL DE SOCKET (PARTIDAS E INVITACIONES)
  // -----------------------------------------------------------------------
  useEffect(() => {
  const handleMatchFound = (payload: any) => {
          //console.log("🔔 [App.tsx] Event match_found received:", payload);
          //console.log("🕵️ [App.tsx] Data from rival:", payload.opponent);

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

              // Guardar ID Rival
              if (payload.opponent && payload.opponent.id) {
                  //console.log("✅ ID del oponente:", payload.opponent.id);
                  setOpponentId(payload.opponent.id);
              } else {
                  console.error("❌ ID NO ENCONTRADO en el payload. Opponent es:", payload.opponent)
                  setOpponentId(null);
              }

              // Guardar Avatar Rival
              if (payload.opponent && payload.opponent.avatar) {
                  //console.log("📸 Avatar del oponente recibido:", payload.opponent.avatar);
                  setOpponentAvatar(payload.opponent.avatar);
              } else {
                  setOpponentAvatar(null);
              }

              // Guardar Física (si viene del backend)
              if (payload.ballInit) {
                  setBallInit(payload.ballInit);
              }

              // Guardar Lado
              if (payload.side) {
                  //console.log("📍 Lado asignado a este cliente:", payload.side);
                  setPlayerSide(payload.side);
              }

              // Configurar modo remoto
              setMode("remote");

              // CERRAR TODO LO QUE PUDIERA ESTAR ABIERTO
              setInviteRequest(null);
              setInviteError(null);
              // Cerramos el chat ANTES de pintar la pantalla del juego
              setChatOpen(false);
              hideModal();

              // CAMBIO DE PANTALLA
              setTimeout(() => {
                  //console.log("🚀 Ejecutando cambio de pantalla a PONG...");
                  dispatch({ type: "PONG" }); 
              }, 50);
          } else {
             console.error("❌ Error: roomId no válido", payload);
          }
      };

      // MANEJO DE INVITACIÓN CON MODAL PROPIO Y PROTECCIÓN DE PARTIDA
      const handleIncomingInvite = (data: { fromUserId: number, fromUserName: string }) => {
        // Si el usuario ya está jugando, rechazamos silenciosamente
        if (screenRef.current === "pong") {
          socket.emit('decline_game_invite', { challengerId: data.fromUserId, reason: 'busy' });
          return;
        }
        // Si está en el menú, perfil, etc... le mostramos el modal
        setInviteRequest(data);
      };
      // MANEJADOR PARA CUANDO EL RIVAL RECHAZA O ESTÁ OCUPADO
      const handleInviteError = (data: { msg: string }) => {
        setInviteError(data.msg);
    };

      socket.on('match_found', handleMatchFound);
      socket.on('incoming_game_invite', handleIncomingInvite);
      socket.on('invite_error', handleInviteError);

      return () => {
          socket.off('match_found', handleMatchFound);
          socket.off('incoming_game_invite', handleIncomingInvite);
          socket.off('invite_error', handleInviteError);
      };
    }, []);

    // -----------------------------------------------------------------------
  // 3. LIMPIEZA DE ESTADO AL VOLVER AL MENÚ
  // -----------------------------------------------------------------------
  useEffect(() => {
    // Si la pantalla actual es el menú, reseteamos todos los estados del juego
    // para que la próxima partida empiece totalmente limpia.
    if (screen === "menu") {
      // Avisamos al servidor SOLO cuando de verdad volvemos al menú
      if (roomId && mode === "remote") {
        //console.log("Avisando al servidor para abandonar la sala:", roomId);
        socket.emit('leave_game', { roomId: roomId });
    }
      setBallInit(null);
      setRoomId("");
      setOpponentId(null);
      setOpponentName("");
      setOpponentAvatar(null);
      setPlayerSide("left");
      
      // Si usabas setMatchData para guardar info, también la limpiamos
      // setMatchData("", 0); // Descomenta esto si tienes una función para resetear matchData
    }
  }, [screen]); // <--- Se ejecuta automáticamente cada vez que la variable 'screen' cambia

    // --- FUNCIÓN PARA ACEPTAR/RECHAZAR ---
const handleInviteResponse = (accept: boolean) => {
      if (!inviteRequest) return;

      if (accept) {
          //console.log("✅ Aceptando reto...");
          socket.emit('accept_game_invite', { challengerId: inviteRequest.fromUserId });
          setInviteRequest(null); 
      } else {
          //console.log("❌ Rechazando reto.");
          setInviteRequest(null);
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
          ia={ia}
          setIa={setIa}
          mode={mode}
          setMode={setMode}
          setDifficult={setDifficult}
          userName={currentUser} 
          setOpponentName={setOpponentName}
          setPlayerSide={setPlayerSide}
          isAuthenticated={!!currentUser}
        />;
      case "sign":
        return <SignScreen dispatch={dispatch} />;
      case "login":
        return <LoginScreen dispatch={dispatch} setGlobalUser={setCurrentUser} oauthError={oauthError} clearOAuthError={() => setOAuthError("")} />;
      case "pong":
        const finalUserAvatar = currentUserAvatarUrl || (currentUserId ? getDefaultAvatar(currentUserId) : null);
        const finalOpponentAvatar = opponentAvatar || (opponentId ? getDefaultAvatar(opponentId) : null);
        const PongScreenComp = PongScreen as any;
        return <PongScreenComp
          dispatch={dispatch}
          mode={mode}
          difficult={difficult}
          userName={currentUser}
          opponentName={opponentName}
          userAvatar={finalUserAvatar} 
          opponentAvatar={finalOpponentAvatar}
          ballInit={ballInit}
          playerSide={playerSide}
          roomId={roomId}
          chatOpen={chatOpen}
        />;
      case "profile":
        return <ProfileScreen
          setGlobalUser={setCurrentUser}
          setGlobalUserId={setCurrentUserId}
          setGlobalAvatarUrl={setCurrentUserAvatarUrl}
        />;
      case "info":
        return <InfoScreen dispatch={dispatch} option={option} />;
      case "oauth_terms":
        // Only reached from LoginScreen OAuth flow (new user, terms not yet accepted)
        return <OAuthTermsScreen
          dispatch={dispatch}
          pendingToken={pendingOAuthToken}
          setGlobalUser={setCurrentUser}
        />;
      default:
        return null;
    }
  }

  return (
    <div translate="no" className={`w-full min-h-screen mx-auto border border-black bg-black grid grid-rows-[auto_50px_1fr_auto] ${scrollClass}`}>
      {currentUser && <ChatSidebar chatOpen={chatOpen} setChatOpen={setChatOpen} />}
      {/* 🔥🔥 MODAL DE INVITACIÓN (Estilo Unificado Premium) 🔥🔥 */}
      {inviteRequest && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center !bg-black/80 backdrop-blur-sm !p-6">
              
              {/* Contenedor principal idéntico al ModalContext */}
              <div className="!bg-[#111827] !border-2 !border-orange-600 !rounded-3xl !shadow-[0_0_30px_rgba(234,88,12,0.5)] !w-full !max-w-xl flex flex-col overflow-hidden">
                  
                  {/* Cabecera */}
                  <div className="!p-6 !border-b !border-orange-600/30 text-center !bg-black/30">
                      <h2 className="!m-0 !text-2xl !font-extrabold !text-white !tracking-wider !uppercase !leading-tight">
                          ⚔️ {t('app.pongChallenge')}
                      </h2>
                  </div>

                  {/* Cuerpo del Mensaje */}
                  <div className="!px-10 !pt-12 !pb-8 text-center">
                      <p className="!text-gray-100 !text-base !leading-loose !tracking-wide !m-0">
                          {/* He puesto el nombre del retador en color naranja para destacarlo */}
                          <strong className="text-orange-500">
                              {inviteRequest.fromUserName === 'app.afriend' ? t('app.afriend') : inviteRequest.fromUserName}
                          </strong> {t('app.wantPlay')}
                      </p>
                  </div>

                  {/* Botones (Gris y Naranja) */}
                  <div className="!px-10 !pb-10 !pt-4 flex justify-center !gap-6">
                      
                      {/* Botón Rechazar (Gris Neutro) */}
                      <button 
                          onClick={() => handleInviteResponse(false)}
                          className="!px-10 !py-3.5 !min-w-[180px] !rounded-full !bg-gray-700/50 hover:!bg-gray-600 !text-white !font-bold !text-sm !uppercase !tracking-wider !transition-colors !border !border-gray-600 !m-0"
                      >
                          {t('modal.reject_btn')}
                      </button>

                      {/* Botón Aceptar (Naranja Premium) */}
                      <button 
                          onClick={() => handleInviteResponse(true)}
                          className="!px-10 !py-3.5 !min-w-[180px] !rounded-full !bg-orange-600 hover:!bg-orange-700 !text-white !font-extrabold !text-sm !uppercase !tracking-wider !transition-transform hover:scale-105 !shadow-lg !shadow-orange-600/30 !m-0 !border-none"
                      >
                          {t('modal.accept_btn')}
                      </button>
                      
                  </div>
              </div>
          </div>
      )}
      {inviteError && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center transform transition-all scale-100">
                  
                  {/* Icono decorativo */}
                  <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 border border-gray-700">
                      <span className="text-4xl">⛔</span>
                  </div>

                  <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">
                      {t('error') || 'Aviso'}
                  </h2>
                  
                  <p className="text-gray-300 text-lg mb-8">
                      {inviteError}
                  </p>

                  {/* Botón Aceptar (Gris Neutro unificado con tu diseño) */}
                  <button 
                      onClick={() => setInviteError(null)}
                      className="!px-10 !py-3.5 !min-w-[180px] !rounded-full !bg-gray-700/50 hover:!bg-gray-600 !text-white !font-bold !text-sm !uppercase !tracking-wider !transition-colors !border !border-gray-600 !m-0"
                  >
                      {t('modal.accept_btn') || 'OK'}
                  </button>
              </div>
          </div>
      )}
      <Header dispatch={dispatch} setIa={setIa} userName={currentUser} userId={currentUserId} userAvatarUrl={currentUserAvatarUrl} profileSynced={profileSynced} onLogout={handleLogout} />
      <main className={scrollClass}>{renderScreen()}</main>
      <Footer dispatch={dispatch} setOption={setOption}/>
    </div>
  );
}

export default App;
