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
        <div className="bg-[#111827] rounded-xl p-5 w-full mx-auto border border-[#374151]">
            <h2 className="text-[1.8rem] font-bold text-[#06b6d4] text-center mb-6 flex items-center justify-center gap-2.5">
                🏆 {t('leader.top10')}
            </h2>

            <ul className="list-none p-0 m-0">
                {players.map((player, index) => {
                    const rankColor = index === 0 ? '#fbbf24' : 
                                      index === 1 ? '#e5e7eb' : 
                                      index === 2 ? '#f59e0b' : 
                                      '#9ca3af';                

                    return (
                        <li key={player.id} className="flex items-center justify-between p-3.5 mb-3 bg-[#1f2937] rounded-lg border-l-4" style={{ borderLeftColor: rankColor, boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>
                            
                            <div className="flex items-center gap-4">
                                <span className="text-[1.4rem] font-extrabold w-[35px] text-center" style={{ color: rankColor }}>
                                    #{index + 1}
                                </span>
                                
                                <Avatar src={player.avatar} userId={player.id} size={40} />
                                
                                <span className="text-white font-bold text-[1.2rem] leading-none mt-1">
                                    {player.nick}
                                </span>
                            </div>
                            
                            <div className="flex items-center justify-end gap-2 !pr-12 min-w-[150px]">
                                <span className="text-[#4ade80] font-bold text-[1.3rem] leading-none">
                                    {player.wins}
                                </span>
                                <span className="text-[0.85rem] text-[#9ca3af] font-semibold uppercase tracking-wider leading-none mt-1">
                                    {t('leader.wins')}
                                </span>
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