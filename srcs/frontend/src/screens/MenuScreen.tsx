import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { joinQueue, socket, setMatchData } from '../services/socketService.ts';
import { getLocalizedImagePath } from '../ts/utils/loadImageLang.ts';

import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameDifficult, GameMode } from '../ts/types.ts';

import cross from '../assets/x_chatgpt.png';

import easy from '../assets/Easy_chatgpt.png';
import normal from '../assets/Normal_chatgpt.png';
import hard from '../assets/Hard_chatgpt.png';
import impossible from '../assets/Impossible_chatgpt.png';

import "../css/MenuScreen.css";

type OptionsProps = ScreenProps & {
  ia: boolean;
  setIa: React.Dispatch<React.SetStateAction<boolean>>;
  mode: GameMode;
  setMode: React.Dispatch<React.SetStateAction<GameMode>>;
  setDifficult: React.Dispatch<React.SetStateAction<GameDifficult>>;
  userName: string;
  setOpponentName: React.Dispatch<React.SetStateAction<string>>;
  setPlayerSide: React.Dispatch<React.SetStateAction<'left' | 'right'>>;
  isAuthenticated: boolean; // para validar el tipo de conexion admitida
};

const MenuScreen = ({ dispatch, ia, setIa, mode, setMode, setDifficult, userName, setOpponentName, setPlayerSide }: OptionsProps) => {   
    const { t, i18n } = useTranslation(); // Add i18n to access current language
    const [statusText, setStatusText] = useState<string>("");
    const [modeActive, setModeActive] = useState<"offline" | "online" | null>(null);
    const [bgImage, setBgImage] = useState<string>("");
    
    const countDownRef = useRef<NodeJS.Timeout | null>(null);

    // Load the background image based on current language
    useEffect(() => {
        const imagePath = getLocalizedImagePath('image_pong.png', i18n.language);
        setBgImage(imagePath);
    }, [i18n.language]); // Re-run when language changes

    // LÓGICA DE BOTONES
    const handleMode = (mode: GameMode) =>
    {
        if (modeActive) return;

        if (mode === "remote")
        {
            if (!isAuthenticated) {
                setStatusText("Debes estar logueado para jugar online.");
                // Opcional: Borrar el mensaje después de 3 segundos
                setTimeout(() => setStatusText(""), 3000);
                return; 
            }
            const socketMode = "1v1_remote";
            console.log("🚀 Enviando al Socket (Online):", socketMode);
            
            joinQueue(userName, socketMode); 

            console.log("⏳ Esperando a que el servidor encuentre rival...");

            setStatusText(t('searching_player'));
            setModeActive("online");

            return; 
        }

        // Offline
        console.log("⚡ Iniciando modo Offline:", mode);

        setPlayerSide('left');

        if (mode === 'ia') {
            setOpponentName("IA-Bot");
        } else {
            setOpponentName(t('guest'));
        }
        setMode(mode);
        dispatch({ type: "PONG" });
    };

    const handleDiff = (diff: GameDifficult) =>
    {
        setDifficult(diff);
        setIa(false);
        handleMode("ia");
    };

    const startCountDown = (seconds: number) =>
    {
        setStatusText(seconds.toString());
        if (seconds > 0)
            countDownRef.current = setTimeout(() => startCountDown(seconds - 1), 1000);
        else
        {
            setStatusText("");
            // setMode("offline"); // This mode does not exist
            setMode(mode);
            dispatch({ type: "PONG" });
            setModeActive(null);
        }
    };

    const cancelProcess = () =>
    {
        if (modeActive === "offline" && countDownRef.current)
            clearTimeout(countDownRef.current);

        setStatusText("");
        setModeActive(null)
        console.log("❌ Proceso cancelado");
    }

    const showBtn = () =>
    {
        return (
            <>
                <h1>{t('modo')}</h1>

                <div className="bt">
                    <button onClick={() => setIa(true)}>{t('player_vs_ia')}</button>
                    <button onClick={() => handleMode("local")}>{t('player_vs_player')}</button>
                    <button onClick={() => handleMode("remote")}>{t('player_vs_remote')}</button>
                </div>
            </>
        );
    };

    const showImg = () =>
    {
        return (
            <>
                <h1>{t('difficulty')}</h1>

                <div className="imagenes">
                    <img
                        src={easy}
                        alt={t('alt_easy')}
                        onClick={() => handleDiff("easy")}/>
                    <img
                        src={normal}
                        alt={t('alt_normal')}
                        onClick={() => handleDiff("normal")} />
                    <img
                        src={hard}
                        alt={t('alt_hard')}
                        onClick={() => handleDiff("hard")} />
                    <img
                        src={impossible}
                        alt={t('alt_impossible')}
                        onClick={() => handleDiff("impossible")} />
                </div>
            </>
        );
    };

    return (
        <section className="menu">
            {bgImage && <img className="bg_image" src={bgImage} alt={t('alt_main_image')}/>}
            
            { ia ? showImg() : showBtn() }

            <div className="search">
                <p>{statusText}</p>
                {modeActive && 
                (
                    <img className="cross" src={cross} alt={t('alt_cancel')} onClick={cancelProcess}/>
                )}
            </div>

        </section>
            
    );
}
export default MenuScreen;