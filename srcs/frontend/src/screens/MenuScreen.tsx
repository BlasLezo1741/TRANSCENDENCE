import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { joinQueue, socket, setMatchData } from '../services/socketService.ts';

import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode } from '../ts/types.ts';

import cross from '../assets/x_chatgpt.png';

import bg_image from '../assets/Imagen_pong_v2.png';
//import bg_image from '../assets/Flag_of_Catalonia.png';

import "../css/MenuScreen.css";

type OptionsProps = ScreenProps & {
  setMode: React.Dispatch<React.SetStateAction<GameMode>>;
  userName: string;
  // Añadidos para controlar el estado offline
  setOpponentName: React.Dispatch<React.SetStateAction<string>>;
  setPlayerSide: React.Dispatch<React.SetStateAction<'left' | 'right'>>;
};

const MenuScreen = ({ dispatch, setMode, userName, setOpponentName, setPlayerSide }: OptionsProps) => {   
    const { t } = useTranslation();

    const [statusText, setStatusText] = useState<string>("");
    const [modeActive, setModeActive] = useState<"offline" | "online" | null>(false);
    
    const countDownRef = useRef<NodeJS.Timeout | null>(null);

    // LÓGICA DE BOTONES
    const handleMode = (mode: GameMode) =>
    {
        if (modeActive) return;

        if (mode === "remote")
        {
            const socketMode = "1v1_remote";
            console.log("🚀 Enviando al Socket (Online):", socketMode);
            
            joinQueue(userName, socketMode); 

            console.log("⏳ Esperando a que el servidor encuentre rival...");

            setStatusText("Buscando jugador...");
            setModeActive("online");

            // 🛑 STOP: No hacemos setMode ni dispatch aquí. Esperamos al useEffect.
            return; 
        }

        // Offline
        console.log("⚡ Iniciando modo Offline:", mode);

        // 1. Forzamos que en local SIEMPRE seas la izquierda
        setPlayerSide('left');

        // 2. Definimos el nombre del rival según el modo
        if (mode === 'ia') {
            setOpponentName("IA-Bot");
        } else {
            setOpponentName("Invitado"); // O "Player 2"
        }
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

    return (
        <section className="menu">
            <img className="bg_image" src={bg_image} alt="Imagen central"/>
            
            <h1>{t('modo')}</h1>

            <div className="bt">
                <button onClick={() => handleMode("ia")}>player vs ia</button>
                <button onClick={() => handleMode("local")}>player vs player</button>
                <button onClick={() => handleMode("remote")}>player vs remote</button>
                {/* <button onClick={() => handleMode("tournament")}>tournament</button> */}
            </div>

            <div className="search">
                <p>{statusText}</p>
                {modeActive && 
                (
                    <img className="cross" src={cross} alt="Cancelar" onClick={cancelProcess}/>
                )}
            </div>

        </section>
            
    );
}
export default MenuScreen;