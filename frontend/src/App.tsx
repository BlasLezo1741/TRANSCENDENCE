import { useState } from 'react';
import { MenuScreen } from './screens/MenuScreen.tsx'
import { GameScreen } from './screens/GameScreen.tsx'

type Screen = "menu" | "game";

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  
  return (
    <div>
        {screen === "menu" && <MenuScreen onGame={() => setScreen("game")} />}
        {screen === "game" && <GameScreen onMenu={() => setScreen("menu")} />}
    </div>
  );
}

export default App;