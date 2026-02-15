import React, { useState } from 'react';
import Canvas from '../components/Canvas.tsx';
import { useTranslation } from 'react-i18next';
import type { ScreenProps } from '../ts/screenConf/screenProps.ts';
import type { GameMode } from '../ts/types.ts';
import { Countdown } from '../components/Countdown';
import '../css/PongScreen.css';
import { getAvatarUrlById, getDefaultAvatar } from '../assets/avatars';

type PongScreenProps = ScreenProps & {
  mode: GameMode;
  userName: string;
  opponentName: string;
  userAvatar?: string | null;      // Mi avatar
  opponentAvatar?: string | null;  // Avatar del rival
  ballInit: { x: number, y: number } | null;
  playerSide: 'left' | 'right';
  roomId: string;
};

const PongScreen = ({ dispatch, mode, userName, opponentName, userAvatar, opponentAvatar, ballInit, playerSide, roomId }: PongScreenProps) =>
{
  const { t } = useTranslation();
  // Si yo estoy a la izquierda: [Yo] vs [Rival]
  // Si yo estoy a la derecha:   [Rival] vs [Yo]
  const leftPlayer = playerSide === 'left' ? userName : opponentName;
  const rightPlayer = playerSide === 'left' ? opponentName : userName;

  const leftAvatarRaw = playerSide === 'left' ? userAvatar : opponentAvatar;
  const rightAvatarRaw = playerSide === 'left' ? opponentAvatar : userAvatar;
  // 4. Función Helper (La misma que en Chat/Perfil)
  const resolveAvatar = (avatarRaw?: string | null, seedId: number = 0) => {
      if (!avatarRaw) return getDefaultAvatar(seedId); 
      if (avatarRaw.startsWith('http') || avatarRaw.startsWith('/')) return avatarRaw;
      const customUrl = getAvatarUrlById(avatarRaw);
      return customUrl || getDefaultAvatar(seedId);
  };


  const [isCountingDown, setIsCountingDown] = useState(true);

return (
    <div className="game">
      
      {/* NUEVA CABECERA CON AVATARES */}
      <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          width: '800px', // Mismo ancho que el canvas
          marginBottom: '10px',
          padding: '10px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: '10px',
          color: 'white'
      }}>
          {/* JUGADOR IZQUIERDA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img 
                  src={resolveAvatar(leftAvatarRaw, 1)} 
                  alt={leftPlayer} 
                  style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #007bff' }}
              />
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{leftPlayer}</span>
          </div>

          {/* INFORMACIÓN CENTRAL */}
          <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{t('juego_mode')}{mode}</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '5px' }}>VS</div>
          </div>

          {/* JUGADOR DERECHA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: 'row-reverse' }}>
              <img 
                  src={resolveAvatar(rightAvatarRaw, 2)} 
                  alt={rightPlayer} 
                  style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #ff4444' }}
              />
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{rightPlayer}</span>
          </div>
      </div>
      
      {/* ... (Resto del Canvas y Countdown sigue igual) ... */}
      <div style={{ position: 'relative', width: '800px', height: '600px' }}>
          {isCountingDown && (
              <Countdown onComplete={() => setIsCountingDown(false)} />
          )}

          <Canvas
            mode={mode}
            dispatch={dispatch}
            userName={userName}
            opponentName={opponentName}
            ballInit={ballInit}
            playerSide={playerSide} 
            roomId={roomId}
            isGameActive={!isCountingDown}
          />
      </div>
    </div>
  );

}

export default PongScreen;