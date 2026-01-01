import type { ScreenProps } from "../ts/screenConf/screenProps";

function GameScreen({ dispatch }: ScreenProps)
{
    return (
        <div>
            <h1>Pestaña de juegos</h1>
            
            <button onClick={() => dispatch({ type: "MODE" })}>
                PONG
            </button>

            <button onClick={() => dispatch({ type: "MENU" })}>
                Volver al Menu
            </button>
        </div>
    );
}

export default GameScreen;