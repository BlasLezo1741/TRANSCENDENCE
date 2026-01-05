import type { ScreenProps } from "../ts/screenConf/screenProps.ts";
import type { GameMode } from "../ts/types.ts";
import Header from "../components/Header";
import { useTranslation } from 'react-i18next';
import { joinQueue } from '../services/socketService';

type OptionsProps = ScreenProps & {
  setMode: React.Dispatch<React.SetStateAction<GameMode>>;
};

function ModeScreen({ dispatch, setMode }: OptionsProps)
{
  const { t } = useTranslation();
  const handleMode = (mode: GameMode) => {
//Filtramos: Si no es contra la IA, necesitamos al servidor
  if (mode !== "ia") {
    // Mapeamos el modo del Frontend al modo que entiende el Backend (DTO)
    // 'local' y 'remote' cuentan como partidas '1v1'
    // 'tournament' se envía como tal
    const socketMode = (mode === "tournament") ? "tournament" : "1v1";
    
    // 3. Llamamos al socket con el modo dinámico
    joinQueue("Jugador_Natalia", socketMode);
  }

    // Lógica actual de navegación
    setMode(mode);
    dispatch({ type: "PONG" });
  };

  return (
    <div>
      <Header />
      <h1>{t('modo')}</h1>

      <button onClick={() => handleMode("ia")}>player vs ia</button>
      <button onClick={() => handleMode("local")}>player vs player</button>
      <button onClick={() => handleMode("remote")}>player vs remote</button>
      <button onClick={() => handleMode("remote")}>tournament</button>

      <button onClick={() => dispatch({ type: "MENU" })}>
      {t('menu')}
      </button>

      <button onClick={() => dispatch({ type: "GAME" })}>
      {t('juegos')}
      </button>

    </div>
  );
}

export default ModeScreen;
