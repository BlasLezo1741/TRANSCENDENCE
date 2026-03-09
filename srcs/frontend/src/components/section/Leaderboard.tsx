import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../../services/user.service';
import { Avatar } from './Avatar'; 
import { useTranslation } from 'react-i18next';
import Li from '../objects/Li.tsx';
interface LeaderboardPlayer {
    id: number;
    nick: string;
    avatar: string | null;
    wins: number;
}

export const Leaderboard = () => {
    const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();

    useEffect(() => {
        getLeaderboard()
            .then(data => {
                setPlayers(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error cargando leaderboard", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-white text-center p-4">{t('leader.loading')}</div>;

return (
        <div style={{
            backgroundColor: '#111827', // Fondo súper oscuro para contrastar
            borderRadius: '12px',
            padding: '20px',
            width: '100%',
            maxWidth: '550px',
            margin: '0 auto',
            border: '1px solid #374151'
        }}>
            <h2 style={{ 
                fontSize: '1.8rem', 
                fontWeight: 'bold', 
                color: '#06b6d4', // Color cyan para que coincida con tu título de "Estadísticas"
                textAlign: 'center', 
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
            }}>
                🏆 {t('leader.top10')}
            </h2>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {players.map((player, index) => {
                    // Colores especiales para los 3 primeros puestos
                    const rankColor = index === 0 ? '#fbbf24' : // Oro
                                      index === 1 ? '#e5e7eb' : // Plata
                                      index === 2 ? '#f59e0b' : // Bronce
                                      '#9ca3af';                // Gris para el resto

                    return (
                        <Li 
                            key={player.id}
                            /* style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 20px',
                            marginBottom: '10px',
                            backgroundColor: '#1f2937', // Fondo gris oscuro para la fila
                            borderRadius: '8px',
                            borderLeft: `5px solid ${rankColor}`, // Línea de color a la izquierda
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} */
                        >
                            {/* SECCIÓN IZQUIERDA: Puesto, Avatar y Nombre */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                
                                {/* 1. Rango (Puesto destacado) */}
                                <span style={{ 
                                    fontSize: '1.4rem', 
                                    fontWeight: '900', 
                                    color: rankColor,
                                    width: '40px', // Ancho fijo para alinear todos los avatares
                                    textAlign: 'center'
                                }}>
                                    #{index + 1}
                                </span>
                                
                                {/* 2. Avatar */}
                                <Avatar src={player.avatar} userId={player.id} size={45} />
                                
                                {/* 3. Nick */}
                                <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                    {player.nick}
                                </span>
                            </div>
                            
                            {/* SECCIÓN DERECHA: Victorias */}
                            <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'right' }}>
                                {player.wins} <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 'normal', display: 'block' }}>{t('leader.wins')}</span>
                            </div>
                        </Li>
                    );
                })}
                {players.length === 0 && (
                    <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>{t('leader.noMatches')}</p>
                )}
            </ul>
        </div>
    );
};