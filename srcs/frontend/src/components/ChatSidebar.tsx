import React, { useState, useEffect } from 'react';
import { socket } from '../services/socketService';

// --- TIPOS MOCK ---
interface ChatContact {
    id: number;
    name: string;
    status: 'online' | 'offline' | 'ingame';
    unread: number;
}

interface ChatMessage {
    id: number;
    senderId: number;
    text: string;
    time: string;
}

export const ChatSidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'dms' | 'channels'>('dms');
    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
    const [msgInput, setMsgInput] = useState("");

    // DATOS MOCK
    const MOCK_FRIENDS: ChatContact[] = [
        { id: 1, name: "User 1", status: 'online', unread: 2 },
        { id: 2, name: "User 2", status: 'ingame', unread: 0 },
        { id: 3, name: "User 3", status: 'offline', unread: 0 },
    ];

    const MOCK_CHANNELS: ChatContact[] = [
        { id: 99, name: "#General", status: 'online', unread: 5 },
        { id: 98, name: "#PongRoom", status: 'online', unread: 0 },
    ];

    const MOCK_MESSAGES: ChatMessage[] = [
        { id: 1, senderId: 2, text: "Hola! Una partida?", time: "10:30" },
        { id: 2, senderId: 1, text: "Venga, dale", time: "10:32" },
        { id: 3, senderId: 2, text: "Creo la sala...", time: "10:33" },
    ];

    // --- ESTILOS EN LÍNEA PARA FORZAR POSICIONAMIENTO ---
    
    // 1. Botón Flotante: Forzamos fixed abajo derecha
    const buttonStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 50, // Alto, pero menos que el modal si hubiera
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#2563EB', // Azul
        color: 'white',
        fontSize: '24px',
        border: 'none',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    // 2. Barra Lateral: Fixed a la derecha, pero DEBAJO del Header
    const sidebarStyle: React.CSSProperties = {
        position: 'fixed',
        right: 0,
        // AJUSTE CLAVE: top 64px (asumiendo que el header mide unos 60-64px)
        top: '90px', 
        // Restamos los 64px del header a la altura total
        height: 'calc(100vh - 90px)', 
        width: '320px',
        backgroundColor: '#06b6d4', // Gray 900
        borderLeft: '4px solid #374151',
        zIndex: 40, // MENOS que el Header (que le pondremos 50)
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 15px rgba(0,0,0,0.5)',
        color: '#111827',
        fontFamily: 'sans-serif'
    };

    // 3. Estilo de cada Fila de Usuario (Caja blanca)
    const rowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        padding: '10px',
        margin: '5px',
        backgroundColor: 'white',
        borderRadius: '8px',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #cffafe'
    };

    // 4. Estilo del Avatar (Círculo gris)
    const avatarStyle: React.CSSProperties = {
        width: '40px',
        height: '40px',
        backgroundColor: '#e5e7eb',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '12px',
        fontWeight: 'bold',
        color: '#374151',
        border: '1px solid #d1d5db',
        flexShrink: 0 // Evita que se aplaste
    };

    // 5. Estilo de la Bolita Roja
    const badgeStyle: React.CSSProperties = {
        backgroundColor: '#ef4444',
        color: 'white',
        fontSize: '10px',
        fontWeight: 'bold',
        padding: '2px 6px',
        borderRadius: '99px',
        marginLeft: 'auto', // Lo empuja a la derecha
        minWidth: '18px',
        textAlign: 'center'
    };

    useEffect(() => {
        // 1. Escuchar la respuesta del servidor (PONG)
        socket.on('pong_chat', (payload) => {
            console.log("🟢 [FRONTEND] Respuesta recibida del Gateway:", payload);
            alert("¡Conexión exitosa con el Chat! Mira la consola.");
        });

        // Limpieza al cerrar componente
        return () => {
            socket.off('pong_chat');
        };
    }, []);

    // Función auxiliar para probar conexión manual
    const sendTestPing = () => {
        console.log("📡 [FRONTEND] Enviando ping...");
        socket.emit('ping_chat', { mensaje: "Hola desde el botón azul!" });
    };

    // --- RENDERIZADO ---

    // if (!isOpen) {
    //     return (
    //         <button style={buttonStyle} onClick={() => setIsOpen(true)}>
    //             💬
    //         </button>
    //     );
    // }
    if (!isOpen) {
        return (
            <button 
                style={buttonStyle} 
                onClick={() => {
                    setIsOpen(true);
                    sendTestPing(); // <--- AÑADIDO
                }}
            >
                💬
            </button>
        );
    }

return (
        <div style={sidebarStyle}>
            {/* CABECERA */}
            <div style={{ height: '50px', backgroundColor: '#0e7490', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', color: 'white' }}>
                <h2 style={{ fontWeight: 'bold' }}>
                    {selectedChatId ? `CHAT #${selectedChatId}` : "SOCIAL HUB"}
                </h2>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* CONTENIDO */}
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#cffafe' }}>
                
                {selectedChatId === null ? (
                    <>
                        {/* TABS */}
                        <div style={{ display: 'flex', backgroundColor: '#0891b2' }}>
                            <button 
                                onClick={() => setActiveTab('dms')}
                                style={{ flex: 1, padding: '10px', border: 'none', background: activeTab === 'dms' ? '#cffafe' : 'transparent', color: activeTab === 'dms' ? '#0e7490' : 'white', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                AMIGOS
                            </button>
                            <button 
                                onClick={() => setActiveTab('channels')}
                                style={{ flex: 1, padding: '10px', border: 'none', background: activeTab === 'channels' ? '#cffafe' : 'transparent', color: activeTab === 'channels' ? '#0e7490' : 'white', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                CANALES
                            </button>
                        </div>

                        {/* LISTA DE CONTACTOS */}
                        <div style={{ padding: '8px' }}>
                            {(activeTab === 'dms' ? MOCK_FRIENDS : MOCK_CHANNELS).map((chat) => (
                                <div 
                                    key={chat.id} 
                                    onClick={() => setSelectedChatId(chat.id)}
                                    style={rowStyle} // <-- Aquí usamos la constante
                                >
                                    {/* AVATAR */}
                                    <div style={avatarStyle}>
                                        {chat.name.charAt(0)}
                                    </div>
                                    
                                    {/* INFO */}
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{chat.name}</span>
                                            {chat.unread > 0 && (
                                                <span style={badgeStyle}>
                                                    {chat.unread}
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Clic para hablar...</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    // VISTA DE CONVERSACIÓN
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ padding: '10px', backgroundColor: '#a5f3fc', display: 'flex', alignItems: 'center' }}>
                            <button onClick={() => setSelectedChatId(null)} style={{ border: 'none', background: 'none', fontWeight: 'bold', color: '#0e7490', cursor: 'pointer', marginRight: '10px' }}>
                                ⬅ VOLVER
                            </button>
                            <span style={{fontWeight: 'bold', color: '#155e75'}}>Chat con {selectedChatId}</span>
                        </div>
                        
                        {/* Mensajes */}
                        <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
                            {MOCK_MESSAGES.map((msg) => (
                                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.senderId === 1 ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ 
                                        padding: '8px 12px', 
                                        borderRadius: '12px', 
                                        backgroundColor: msg.senderId === 1 ? '#0891b2' : 'white',
                                        color: msg.senderId === 1 ? 'white' : 'black',
                                        maxWidth: '85%',
                                        fontSize: '14px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                    }}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div style={{ padding: '10px', backgroundColor: 'white', borderTop: '1px solid #cffafe' }}>
                            <form style={{ display: 'flex', gap: '8px' }} onSubmit={(e) => { e.preventDefault(); setMsgInput(""); }}>
                                <input 
                                    style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#111827', borderRadius: '99px', padding: '8px 16px', border: '1px solid #d1d5db', outline: 'none' }}
                                    placeholder="Escribe un mensaje..."
                                    value={msgInput}
                                    onChange={e => setMsgInput(e.target.value)}
                                />
                                <button type="submit" style={{ backgroundColor: '#0891b2', color: 'white', width: '40px', height: '40px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    ➤
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};