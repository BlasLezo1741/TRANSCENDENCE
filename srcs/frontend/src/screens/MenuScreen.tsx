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

const MenuScreen = ({ dispatch, ia, setIa, mode, setMode, setDifficult, userName, setOpponentName, setPlayerSide, isAuthenticated }: OptionsProps) => {   
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
                setStatusText(t('errors.mustBeLogged'));
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
        } 
/*         else {
            setOpponentName(t('guest'));
        } */
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

    const showBtn = () => {
  return (
    <>
      <h1 className="text-center text-xl font-semibold mb-4">{t('modo')}</h1>

      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setIa(true)}
          className="px-4 py-2 bg-gray-300 hover:bg-white rounded"
        >
          {t('player_vs_ia')}
        </button>
        <button
          onClick={() => handleMode("local")}
          className="px-4 py-2 bg-gray-300 hover:bg-white rounded"
        >
          {t('player_vs_player')}
        </button>
        <button
          onClick={() => handleMode("remote")}
          className="px-4 py-2 bg-gray-300 hover:bg-white rounded"
        >
          {t('player_vs_remote')}
        </button>
      </div>
    </>
  );
};

const showImg = () => {
  return (
    <>
      <h1 className="text-center text-xl font-semibold mb-4">{t('difficulty')}</h1>

      <div className="flex justify-center gap-4 flex-wrap mb-6">
        <img
          src={easy}
          alt={t('alt_easy')}
          onClick={() => handleDiff("easy")}
          className="cursor-pointer w-[200px] h-[150px] sm:w-[150px] sm:h-[120px] xs:w-[100px] xs:h-[80px] object-cover rounded"
        />
        <img
          src={normal}
          alt={t('alt_normal')}
          onClick={() => handleDiff("normal")}
          className="cursor-pointer w-[200px] h-[150px] sm:w-[150px] sm:h-[120px] xs:w-[100px] xs:h-[80px] object-cover rounded"
        />
        <img
          src={hard}
          alt={t('alt_hard')}
          onClick={() => handleDiff("hard")}
          className="cursor-pointer w-[200px] h-[150px] sm:w-[150px] sm:h-[120px] xs:w-[100px] xs:h-[80px] object-cover rounded"
        />
        <img
          src={impossible}
          alt={t('alt_impossible')}
          onClick={() => handleDiff("impossible")}
          className="cursor-pointer w-[200px] h-[150px] sm:w-[150px] sm:h-[120px] xs:w-[100px] xs:h-[80px] object-cover rounded"
        />
      </div>
    </>
  );
};

return (
  <section className="w-4/5 mx-auto flex flex-col justify-center items-center relative">
    {bgImage && (
      <img
        className="w-[800px] h-[600px] sm:w-[600px] sm:h-[400px] xs:w-[300px] xs:h-[200px] mx-auto object-cover mb-6"
        src={bgImage}
        alt={t('alt_main_image')}
      />
    )}

    {ia ? showImg() : showBtn()}

    <div className="flex justify-center items-center mt-4">
      <p className="mr-2">{statusText}</p>
      {modeActive && (
        <img
          className="w-8 h-8 cursor-pointer"
          src={cross}
          alt={t('alt_cancel')}
          onClick={cancelProcess}
        />
      )}
    </div>
  </section>
);
}

export default MenuScreen;