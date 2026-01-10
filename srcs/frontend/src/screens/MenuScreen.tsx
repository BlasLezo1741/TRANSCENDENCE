import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { joinQueue, socket, setMatchData } from '../services/socketService';

import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode } from '../ts/types.ts';

// type OptionsProps = ScreenProps & {
//   setMode: React.Dispatch<React.SetStateAction<GameMode>>;
//   setOpponentName: (name: string) => void;
//   userName: string;
//   setBallInit: (vector: {x: number, y: number}) => void;
//   setPlayerSide: (side: 'left' | 'right') => void;
// };

type OptionsProps = ScreenProps & {
  setMode: React.Dispatch<React.SetStateAction<GameMode>>;
  userName: string;
};

// const MenuScreen = ({ dispatch, setMode }: OptionsProps) =>
// {
//     const { t } = useTranslation();
//     const handleMode = (mode: GameMode) => {
//         let socketMode = "";
//         //Filtramos: Si no es contra la IA, necesitamos al servidor
//         if (mode !== "ia")
//         {
//             if (mode === "local") socketMode = "1v1_local";
//             else if (mode === "remote") socketMode = "1v1_remote";
//             else if (mode === "tournament") socketMode = "tournament";
//             console.log("🚀 Enviando al Socket:", socketMode);
//             joinQueue(userName, socketMode);
//         }
//         // Lógica actual de navegación
//         setMode(mode);
//         dispatch({ type: "PONG" });
//     };

//     return (
//         <div>
//             <h1>{t('modo')}</h1>

//             <button onClick={() => handleMode("ia")}>player vs ia</button>
//             <button onClick={() => handleMode("local")}>player vs player</button>
//             <button onClick={() => handleMode("remote")}>player vs remote</button>
//             <button onClick={() => handleMode("remote")}>tournament</button>
//         </div>
//     );
// }
    //const MenuScreen = ({ dispatch, setMode, setOpponentName, userName, setBallInit, setPlayerSide }: OptionsProps) => {
 const MenuScreen = ({ dispatch, setMode, userName }: OptionsProps) => {   
    const { t } = useTranslation();
    
    // NOTA: EL LISTENER 'match_found' SE HA MOVIDO A App.tsx
    // Aquí solo emitimos la intención de jugar.

    // //const [opponentName, setOpponentName] = useState<string>("Oponente");
    
    // // 1. ESCUCHAR LA RESPUESTA DEL SERVIDOR (Solo para Online)
    // useEffect(() => {
    //     const handleMatchFound = (payload: any) => {
    //         console.log("✅ ¡Partida Online Encontrada!", payload);
    //         //Guardo los DATOS AQUÍ
    //         if (payload.roomId && payload.matchId) {
    //             setMatchData(payload.roomId, payload.matchId);
    //             // GUARDAMOS EL NOMBRE DEL RIVAL (Viene del backend)
    //             if (payload.opponent && payload.opponent.name) {
    //                 setOpponentName(payload.opponent.name);
    //             }
    //             if (payload.ballInit) {
    //                 console.log("🎱 Física recibida del servidor:", payload.ballInit);
    //                 setBallInit(payload.ballInit);
    //             }
    //             if (payload.side) {
    //                 console.log("📍 Lado asignado:", payload.side);
    //                 setPlayerSide(payload.side);
    //             }
    //         } else {
    //             console.error("⚠️ Error: El payload de match_found viene incompleto", payload);
    //         }
        
    //         // Inicio el juego
    //         setMode("remote"); 
    //         dispatch({ type: "PONG" });
    //     };

    //     socket.on('match_found', handleMatchFound);

    //     return () => {
    //         socket.off('match_found', handleMatchFound);
    //     };
    // }, [dispatch, setMode, setOpponentName, setBallInit, setPlayerSide]);


    // LÓGICA DE BOTONES
    const handleMode = (mode: GameMode) => {
        
        // --- CASO A: MODOS ONLINE (Requieren espera y servidor) ---
        if (mode === "remote" || mode === "tournament") {
            const socketMode = mode === "remote" ? "1v1_remote" : "tournament";
            console.log("🚀 Enviando al Socket (Online):", socketMode);
            
            joinQueue(userName, socketMode); 

            console.log("⏳ Esperando a que el servidor encuentre rival...");
            // 🛑 STOP: No hacemos setMode ni dispatch aquí. Esperamos al useEffect.
            return; 
        }

        // --- CASO B: MODOS OFFLINE (IA y Local) -> Arrancan al instante ---
        // En local, el rival está en tu teclado, no necesitamos cola de espera.
        console.log("⚡ Iniciando modo Offline:", mode);
        //setOpponentName(mode === 'ia' ? "IA-Bot" : "Invitado Local");
        setMode(mode);
        dispatch({ type: "PONG" });
    };

    return (
        <div>
            <h1>{t('modo')}</h1>

            <button onClick={() => handleMode("ia")}>player vs ia</button>
            <button onClick={() => handleMode("local")}>player vs player</button>
            <button onClick={() => handleMode("remote")}>player vs remote</button>
            <button onClick={() => handleMode("tournament")}>tournament</button>
        </div>
    );
}
export default MenuScreen;