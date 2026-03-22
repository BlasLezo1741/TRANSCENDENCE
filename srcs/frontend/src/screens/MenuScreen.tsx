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
            //console.log("🚀 Enviando al Socket (Online):", socketMode);
            
            joinQueue(userName, socketMode); 

            //console.log("⏳ Esperando a que el servidor encuentre rival...");

            setStatusText(t('searching_player'));
            setModeActive("online");

            return; 
        }

        // Offline
        //console.log("⚡ Iniciando modo Offline:", mode);

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
        //console.log("❌ Proceso cancelado");
    }

    const showBtn = () => {
  return (
    <>
      <h1 className="text-center text-xl font-semibold mb-4">{t('modo')}</h1>

      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setIa(true)}
          className="btn bg-gray-300 hover:bg-white hover:text-black"
        >
          {t('player_vs_ia')}
        </button>
        <button
          onClick={() => handleMode("local")}
          className="btn bg-gray-300 hover:bg-white hover:text-black"
        >
          {t('player_vs_player')}
        </button>
        <button
          onClick={() => handleMode("remote")}
          className="btn bg-gray-300 hover:bg-white hover:text-black"
        >
          {t('player_vs_remote')}
        </button>
      </div>
    </>
  );
};

const imgClass = "cursor-pointer w-[300px] h-[200px] sm:w-[250px] sm:h-[220px] xs:w-[220px] xs:h-[190px] object-contain rounded-lg"

const showImg = () => {
  return (
    <>
      <h1 className="text-center text-xl font-semibold mb-4">{t('difficulty')}</h1>

      <div className="flex justify-center gap-4 flex-wrap mb-6">
        <img
          src={easy}
          alt={t('alt_easy')}
          onClick={() => handleDiff("easy")}
          className={imgClass}
        />
        <img
          src={normal}
          alt={t('alt_normal')}
          onClick={() => handleDiff("normal")}
          className={imgClass}
        />
        <img
          src={hard}
          alt={t('alt_hard')}
          onClick={() => handleDiff("hard")}
          className={imgClass}
        />
        <img
          src={impossible}
          alt={t('alt_impossible')}
          onClick={() => handleDiff("impossible")}
          className={imgClass}
        />
      </div>
    </>
  );
};

return (
  <section className="w-full mx-auto flex flex-col justify-center items-center relative">
    {bgImage && (
      <img
        className="w-full h-auto max-w-[800px] max-h-[600px] mx-auto object-cover mb-6"
        src={bgImage}
        alt={t('alt_main_image')}
      />
    )}

    {ia ? showImg() : showBtn()}

    {statusText && (
      <div className="!mt-8 flex flex-row items-center justify-center">
        
        {/* TEXTO: Mantiene el color naranja, el grosor y el parpadeo (animate-pulse) */}
        <p className="text-orange-400 font-extrabold text-2xl !m-0 tracking-widest animate-pulse text-center">
          {statusText}
        </p>

        {/* BOTÓN CANCELAR: Separado a la derecha (!ml-8) con más padding interno (!p-3) */}
        {modeActive && (
          <div className="!ml-8 flex items-center justify-center">
            <div 
              role="button" 
              onClick={cancelProcess} 
              title={t('alt_cancel')} 
              className="bg-gray-800/80 hover:bg-red-600 !rounded-full !p-2 transition-colors cursor-pointer border border-gray-600 hover:border-red-400 flex items-center justify-center !w-10 !h-10"
            >
              <img className="w-5 h-5 object-contain brightness-200" src={cross} alt="Cancelar" />
            </div>
          </div>
        )}
      </div>
    )}
	<br/>
  </section>
);
}

export default MenuScreen;
