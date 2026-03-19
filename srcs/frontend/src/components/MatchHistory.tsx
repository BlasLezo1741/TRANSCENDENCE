import React, { useEffect, useState } from 'react';
import { getMatchHistory } from '../services/user.service'; 
import { Avatar } from './Avatar';
import { useTranslation } from 'react-i18next'; 

interface MatchRecord {
    id: number;
    date: string;
    mode: string;
    myScore: number;
    opponentId: number;
    opponent: string;
    opponentAvatar: string | null;
    opponentScore: number;
    opponentStatus: number;
    won: boolean;
}

interface MatchHistoryProps {
    myProfile: any; 
}


export const MatchHistory = ({ myProfile }: MatchHistoryProps) => {
    const [history, setHistory] = useState<MatchRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();

    useEffect(() => {
        getMatchHistory()
            .then(data => {
                setHistory(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error cargando historial", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-white text-center p-5">{t('history.loading')}</div>;

    return (
        <div className="w-full max-w-[650px] mx-auto">
            <h2 className="text-teal-400 text-center mb-5 text-2xl font-bold">
                {t('history.lastMatches')}
            </h2>
            
            {history.length === 0 ? (
                <p className="text-gray-400 text-center p-5">
                    {t('history.notYet')}
                </p>
            ) : (
                <ul class="list-none p-0 m-0">
                    {history.map((match) => (
                        <li key={match.id} class={`flex flex-col bg-gray-800 mb-4 rounded-xl border-l-6 ${match.won ? 'border-l-green-400' : 'border-l-red-500'} shadow-lg overflow-hidden`}>
                            {/* BANDA SUPERIOR: Estado y Fecha */}
                            <div class="flex justify-between p-2.5 px-5 bg-black/20 text-xs text-gray-400 border-b border-white/5">
                                <span class={`font-extrabold ${match.won ? 'text-green-400' : 'text-red-500'} tracking-[1px]`}>
                                    {match.won ? t('history.win') : t('history.defeat')}
                                </span>
                                <span>{new Date(match.date).toLocaleDateString()}</span>
                            </div>

                            {/* CUERPO: El Enfrentamiento (Versus) */}
                            <div class="flex items-center justify-around p-4 px-2.5">
                                
                                {/* LADO IZQUIERDO: TÚ */}
                                <div class="flex flex-col items-center gap-2.5 w-[120px]">
                                    <Avatar 
                                        src={myProfile?.avatarUrl} 
                                        userId={myProfile?.id || 0} 
                                        size={50} 
                                    />
                                    <span class="text-xs text-gray-400 font-bold">{t('history.you')}</span>
                                </div>

                                {/* CENTRO: MARCADOR */}
                                <div class="text-center min-w-[100px]">
                                    <div class="text-4xl font-extrabold text-white tracking-[4px] shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                        {match.myScore} - {match.opponentScore}
                                    </div>
                                    <div class="text-[0.65rem] text-gray-600 mt-1 font-bold">vs</div>
                                </div>

                                {/* LADO DERECHO: RIVAL */}
                                <div class="flex flex-col items-center gap-2.5 w-[120px]">
                                    <Avatar 
                                        src={match.opponentAvatar} 
                                        userId={match.opponentId} 
                                        size={50} 
                                    />
                                    <span class="text-[0.85rem] text-gray-300 font-bold max-w-[110px] whitespace-nowrap overflow-hidden text-ellipsis text-center">
                                        {match.opponentStatus === 6 ? t('history.deletedAccount') : match.opponent}
                                    </span>
                                </div>

                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};