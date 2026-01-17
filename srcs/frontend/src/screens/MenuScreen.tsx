import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { joinQueue, socket, setMatchData } from '../services/socketService';

import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode } from '../ts/types.ts';

type OptionsProps = ScreenProps & {
  setMode: React.Dispatch<React.SetStateAction<GameMode>>;
  userName: string;
};

const MenuScreen = ({ dispatch, setMode, userName }: OptionsProps) => {   
    const { t } = useTranslation();

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