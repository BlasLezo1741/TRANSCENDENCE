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

    if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>{t('history.loading')}</div>;

    return (
        <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto' }}>
            <h2 style={{ 
                color: '#06b6d4', 
                textAlign: 'center', 
                marginBottom: '20px', 
                fontSize: '1.5rem', 
                fontWeight: 'bold' 
            }}>
                {t('history.lastMatches')}
            </h2>
            
            {history.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>
                    {t('history.notYet')}
                </p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {history.map((match) => (
                        <li key={match.id} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            backgroundColor: '#1f2937',
                            marginBottom: '15px',
                            borderRadius: '12px',
                            borderLeft: `6px solid ${match.won ? '#4ade80' : '#ef4444'}`,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                            overflow: 'hidden'
                        }}>
                            {/* BANDA SUPERIOR: Estado y Fecha */}
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                padding: '8px 20px', 
                                backgroundColor: 'rgba(0,0,0,0.2)',
                                fontSize: '0.8rem',
                                color: '#9ca3af',
                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <span style={{ 
                                    fontWeight: '900', 
                                    color: match.won ? '#4ade80' : '#ef4444',
                                    letterSpacing: '1px'
                                }}>
                                    {match.won ? t('history.win') : t('history.defeat')}
                                </span>
                                <span>{new Date(match.date).toLocaleDateString()}</span>
                            </div>

                            {/* CUERPO: El Enfrentamiento (Versus) */}
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-around', 
                                padding: '15px 10px' 
                            }}>
                                
                                {/* LADO IZQUIERDO: TÚ */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '120px' }}>
                                    <Avatar 
                                        src={myProfile?.avatarUrl} 
                                        userId={myProfile?.id || 0} 
                                        size={50} 
                                    />
                                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'bold' }}>{t('history.you')}</span>
                                </div>

                                {/* CENTRO: MARCADOR */}
                                <div style={{ textAlign: 'center', minWidth: '100px' }}>
                                    <div style={{ 
                                        fontSize: '2rem', 
                                        fontWeight: '900', 
                                        color: 'white', 
                                        letterSpacing: '4px',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                    }}>
                                        {match.myScore} - {match.opponentScore}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#4b5563', marginTop: '4px', fontWeight: 'bold' }}>vs</div>
                                </div>

                                {/* LADO DERECHO: RIVAL */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '120px' }}>
                                    <Avatar 
                                        src={match.opponentAvatar} 
                                        userId={match.opponentId} 
                                        size={50} 
                                    />
                                    <span style={{ 
                                        fontSize: '0.85rem', 
                                        color: '#d1d5db', 
                                        fontWeight: 'bold',
                                        maxWidth: '110px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        textAlign: 'center'
                                    }}>
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