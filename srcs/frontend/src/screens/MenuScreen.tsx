import { useTranslation } from 'react-i18next';
import { joinQueue } from '../services/socketService';

import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode } from '../ts/types.ts';

type OptionsProps = ScreenProps & {
  setMode: React.Dispatch<React.SetStateAction<GameMode>>;
};

const MenuScreen = ({ dispatch, setMode }: OptionsProps) =>
{
    const { t } = useTranslation();
    const handleMode = (mode: GameMode) => {
        let socketMode = "";
        //Filtramos: Si no es contra la IA, necesitamos al servidor
        if (mode !== "ia")
        {
            if (mode === "local") socketMode = "1v1_local";
            else if (mode === "remote") socketMode = "1v1_remote";
            else if (mode === "tournament") socketMode = "tournament";
            console.log("🚀 Enviando al Socket:", socketMode);
            joinQueue("Jugador_Natalia", socketMode);
        }
        // Lógica actual de navegación
        setMode(mode);
        dispatch({ type: "PONG" });
    };

    return (
        <div>
            <h1>{t('modo')}</h1>
            <iframe
  src="http://localhost:4000/public-dashboards/c884460c9e5c426891797c029e78a282"
  width="100%"
  height="500"
  frameborder="0">
</iframe>
            <button onClick={() => handleMode("ia")}>player vs ia</button>
            <button onClick={() => handleMode("local")}>player vs player</button>
            <button onClick={() => handleMode("remote")}>player vs remote</button>
            <button onClick={() => handleMode("remote")}>tournament</button>

        </div>
    );
}

export default MenuScreen;