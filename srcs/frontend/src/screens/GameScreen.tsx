import Canvas from '../components/Canvas';

// Componente del juego
type GameProps = {
  onMenu: () => void;
};

export function GameScreen({ onMenu }: GameProps) {
  return (
    <div>
      <h1>Juego</h1>
      <Canvas />
      <button onClick={onMenu}>Volver al Menú</button>
    </div>
  );
}