import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../services/user.service';
import { Avatar } from './Avatar'; 
import { useTranslation } from 'react-i18next';

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
        <div className="bg-[#111827] rounded-xl p-5 w-full max-w-[550px] mx-auto border border-[#374151]">
            <h2 className="text-[1.8rem] font-bold text-[#06b6d4] text-center mb-6 flex items-center justify-center gap-2.5">
                🏆 {t('leader.top10')}
            </h2>

            <ul className="list-none p-0 m-0">
                {players.map((player, index) => {
                    // Colores especiales para los 3 primeros puestos
                    const rankColor = index === 0 ? '#fbbf24' : // Oro
                                      index === 1 ? '#e5e7eb' : // Plata
                                      index === 2 ? '#f59e0b' : // Bronce
                                      '#9ca3af';                // Gris para el resto

                    return (
                        <li key={player.id} className="flex items-center justify-between p-3.5 mb-2.5 bg-[#1f2937] rounded-lg border-l-4" style={{ borderLeftColor: rankColor, boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>
                            {/* SECCIÓN IZQUIERDA: Puesto, Avatar y Nombre */}
                            <div className="flex items-center gap-3.5">
                                
                                {/* 1. Rango (Puesto destacado) */}
                                <span className="text-[1.4rem] font-extrabold text-[rankColor] w-[40px] text-center">
                                    #{index + 1}
                                </span>
                                
                                {/* 2. Avatar */}
                                <Avatar src={player.avatar} userId={player.id} size={40} />
                                
                                {/* 3. Nick */}
                                <span className="text-white font-bold text-[1.2rem]">
                                    {player.nick}
                                </span>
                            </div>
                            
                            {/* SECCIÓN DERECHA: Victorias */}
                            <div className="text-[#4ade80] font-bold text-[1.2rem] text-right">
                                {player.wins} <span className="text-[0.85rem] text-[#9ca3af] font-normal block">{t('leader.wins')}</span>
                            </div>
                        </li>
                    );
                })}
                {players.length === 0 && (
                    <p className="text-[#9ca3af] text-center py-5">{t('leader.noMatches')}</p>
                )}
            </ul>
        </div>
    );
};