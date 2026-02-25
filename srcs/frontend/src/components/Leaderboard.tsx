import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../services/user.service';
import { Avatar } from './Avatar'; 

interface LeaderboardPlayer {
    id: number;
    nick: string;
    avatar: string | null;
    wins: number;
}

export const Leaderboard = () => {
    const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
    const [loading, setLoading] = useState(true);

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

    if (loading) return <div className="text-white text-center p-4">Cargando ranking...</div>;

//     return (
//         <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-auto border border-gray-700 shadow-xl">
//             <h2 className="text-2xl font-bold text-white text-center mb-6">🏆 Top 10 Jugadores</h2>
//             <ul className="space-y-3">
//                 {players.map((player, index) => (
//                     <li key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
//                         <div className="flex items-center gap-4">
//                             {/* Color para los 3 primeros puestos */}
//                             <span className={`text-xl font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
//                                 #{index + 1}
//                             </span>
//                             <Avatar src={player.avatar} userId={player.id} size={40} />
//                             <span className="text-white font-medium">{player.nick}</span>
//                         </div>
//                         <div className="text-green-400 font-bold">
//                             {player.wins} <span className="text-xs text-gray-400 font-normal">victorias</span>
//                         </div>
//                     </li>
//                 ))}
//                 {players.length === 0 && (
//                     <p className="text-gray-400 text-center">No hay partidas registradas aún.</p>
//                 )}
//             </ul>
//         </div>
//     );
// };
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
                🏆 Top 10 Jugadores
            </h2>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {players.map((player, index) => {
                    // Colores especiales para los 3 primeros puestos
                    const rankColor = index === 0 ? '#fbbf24' : // Oro
                                      index === 1 ? '#e5e7eb' : // Plata
                                      index === 2 ? '#f59e0b' : // Bronce
                                      '#9ca3af';                // Gris para el resto

                    return (
                        <li key={player.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 20px',
                            marginBottom: '10px',
                            backgroundColor: '#1f2937', // Fondo gris oscuro para la fila
                            borderRadius: '8px',
                            borderLeft: `5px solid ${rankColor}`, // Línea de color a la izquierda
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}>
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
                                {player.wins} <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 'normal', display: 'block' }}>victorias</span>
                            </div>
                        </li>
                    );
                })}
                {players.length === 0 && (
                    <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>No hay partidas registradas aún.</p>
                )}
            </ul>
        </div>
    );
};