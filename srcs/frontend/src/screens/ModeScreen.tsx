import type { ScreenProps } from "../ts/screenConf/screenProps.ts";
import type { GameMode } from "../ts/types.ts";

type OptionsProps = ScreenProps & {
  setMode: React.Dispatch<React.SetStateAction<GameMode>>;
};

function ModeScreen({ dispatch, setMode }: OptionsProps)
{
  const handleMode = (mode: GameMode) => {
    setMode(mode);
    dispatch({ type: "PONG" });
  };

  return (
    <div>
      <h1>Elige el modo de juego</h1>

      <button onClick={() => handleMode("ia")}>player vs ia</button>
      <button onClick={() => handleMode("local")}>player vs player</button>
      <button onClick={() => handleMode("remote")}>player vs remote</button>
      <button onClick={() => handleMode("remote")}>tournament</button>

      <button onClick={() => dispatch({ type: "MENU" })}>
        Volver al Menu
      </button>

      <button onClick={() => dispatch({ type: "GAME" })}>
        Volver al Game
      </button>

    </div>
  );
}

export default ModeScreen;
