import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { joinQueue, socket, setMatchData } from '../services/socketService';

import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode } from '../ts/types.ts';

import bg_image from '../assets/Flag_of_Catalonia.png';
import cross from '../assets/react.svg';

import "./MenuScreen.css";

type OptionsProps = ScreenProps & {
  setMode: React.Dispatch<React.SetStateAction<GameMode>>;
  userName: string;
};

const MenuScreen = ({ dispatch, setMode, userName }: OptionsProps) => {   
    const { t } = useTranslation();

    const [statusText, setStatusText] = useState<string>("");
    const [modeActive, setModeActive] = useState<"offline" | "online" | null>(false);
    
    const countDownRef = useRef<NodeJS.Timeout | null>(null);
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

    const startCountDown = (seconds: number) =>
    {
        setStatusText(seconds.toString());
        if (seconds > 0)
            countDownRef.current = setTimeout(() => startCountDown(seconds - 1), 1000);
        else
        {
            setStatusText("");
            setMode("offline");
            setMode(mode);
            dispatch({ type: "PONG" });
            setModeActive(null);
        }
    };

    const cancelProcess = () =>
    {
        if (modeActive === "offline" && countDownRef.current)
            clearTimeout(countDownRef.current);

        //else if (modeActive === "online")
        //    leaveQueue?.();

        setStatusText("");
        setModeActive(null)
        console.log("❌ Proceso cancelado");
    }

/*
    return (
        <div>
            <h1>{t('modo')}</h1>

            <button onClick={() => handleMode("ia")}>player vs ia</button>
            <button onClick={() => handleMode("local")}>player vs player</button>
            <button onClick={() => handleMode("remote")}>player vs remote</button>
            <button onClick={() => handleMode("tournament")}>tournament</button>
        </div>
    );
*/

    return (
        <section className="menu">
            <img className="bg_image" src={bg_image} alt="Imagen central"/>
            
            <h1>{t('modo')}</h1>

            <div className="bt">
                <button onClick={() => handleMode("ia")}>player vs ia</button>
                <button onClick={() => handleMode("local")}>player vs player</button>
                <button onClick={() => handleMode("remote")}>player vs remote</button>
                <button onClick={() => handleMode("tournament")}>tournament</button>
            </div>

            <div className="search">
                <p>{statusText}</p>
                {modeActive && 
                (
                    <img src={cross} alt="Cancelar" onClick={cancelProcess}/>
                )}
            </div>

        </section>
            
    );
}
export default MenuScreen;