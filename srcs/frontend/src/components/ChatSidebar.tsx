import React, { useState, useEffect, useCallback } from 'react';
import { socket, sendDirectMessage } from '../services/socketService';

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
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [contacts, setContacts] = useState<ChatContact[]>([]); 
    
// -----------------------------------------------------------
    // 🆔 IDENTIFICACIÓN DEL USUARIO
    // 1. Prioridad: URL (?uid=X) -> Para pruebas rápidas en incógnito
    // 2. Prioridad: LocalStorage -> Para el uso normal de la App
    // -----------------------------------------------------------
    const queryParams = new URLSearchParams(window.location.search);
    const urlId = queryParams.get('uid'); 
    
    // // Si la URL tiene ?uid=2, usa 2. Si no, usa 1 por defecto.
    // const CURRENT_USER_ID = urlId ? Number(urlId) : 1; 
    const storedId = localStorage.getItem("pong_user_id"); // <--- LEER EL ID REAL
    // Si hay URL, úsala. Si no, usa el guardado. Si no hay nada, es 0.
    const CURRENT_USER_ID = urlId ? Number(urlId) : (storedId ? Number(storedId) : 0);
    
    // Debug para ver quién eres realmente
    console.log("🕵️ Usuario del Chat identificado como ID:", CURRENT_USER_ID);

    console.log("🕵️ MODO DEBUG: Soy el usuario ID:", CURRENT_USER_ID); // <--- Mira esto en la consola
    // -----------------------------------------------------------
    // DATOS MOCK

    const MOCK_CHANNELS: ChatContact[] = [
        { id: 99, name: "#General", status: 'online', unread: 5 },
        { id: 98, name: "#PongRoom", status: 'online', unread: 0 },
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

    // ---------------------------------------------------------
    // LÓGICA 1: CARGA DE AMIGOS Y EVENTOS
    // ---------------------------------------------------------
    
    // Usamos useCallback para que esta función no cambie en cada render
    const loadFriends = useCallback(() => {
        if (!CURRENT_USER_ID) return;

        console.log("🔄 Actualizando lista de amigos para ID:", CURRENT_USER_ID);
        fetch(`http://localhost:3000/chat/users?current=${CURRENT_USER_ID}`)
            .then(res => res.json())
            .then(data => {
                // Tipamos explícitamente 'prev' como ChatContact[]
                setContacts((prev: ChatContact[]) => {
                    // Mantenemos contadores
                    const unreadMap = new Map(prev.map(c => [c.id, c.unread || 0]));
                    
                    if (!Array.isArray(data)) return prev;

                    return data.map((user: any) => ({
                        // Soportamos 'id', 'pPk' o 'friend_id'
                        id: Number(user.id || user.pPk || user.friend_id), 
                        name: user.name || user.pNick || user.friend_nick || "Usuario",
                        status: user.status || 'offline',
                        unread: unreadMap.get(Number(user.id || user.pPk || user.friend_id)) || 0 
                    }));
                });
            })
            .catch(err => console.error("Error cargando amigos:", err));
    }, [CURRENT_USER_ID]);

    // Efecto principal: Carga inicial y Suscripción a eventos
    useEffect(() => {
        loadFriends(); // Llamamos a la función definida arriba

        socket.on('friend_accepted', loadFriends);
        socket.on('friend_removed', loadFriends);

        return () => {
            socket.off('friend_accepted', loadFriends);
            socket.off('friend_removed', loadFriends);
        };
    }, [loadFriends]); // loadFriends es dependencia, gracias a useCallback es estable


    // ---------------------------------------------------------
    //  LÓGICA 2: HISTORIAL DE CHAT
    // ---------------------------------------------------------
    useEffect(() => {
        if (!selectedChatId) return;

        setMessages([]); // Limpiar al cambiar de chat

        fetch(`http://localhost:3000/chat/history?user1=${CURRENT_USER_ID}&user2=${selectedChatId}`)
            .then(res => res.json())
            .then(data => {
                const historyFormatted: ChatMessage[] = data.map((msg: any) => ({
                    id: Number(msg.id),
                    senderId: Number(msg.senderId),
                    text: msg.content,
                    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
                setMessages(historyFormatted);
            })
            .catch(err => console.error("Error cargando historial:", err));
            
    }, [selectedChatId, CURRENT_USER_ID]);


    // ---------------------------------------------------------
    // LÓGICA 3: RECIBIR MENSAJES (Socket)
    // ---------------------------------------------------------
    useEffect(() => {
        const handleReceiveMessage = (newMessage: any) => {
            const msgSenderId = Number(newMessage.senderId);
            const myId = Number(CURRENT_USER_ID);
            const openChatId = Number(selectedChatId);

            // Si es mío, lo ignoro (ya lo pinté yo)
            if (msgSenderId === myId) return;

            // 1. Si tengo el chat abierto, lo añado
            if (msgSenderId === openChatId) {
                // Tipamos 'prev' como ChatMessage[]
                setMessages((prev: ChatMessage[]) => [
                    ...prev, 
                    {
                        id: Number(newMessage.id),
                        senderId: msgSenderId,
                        text: newMessage.content,
                        time: new Date(newMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                ]);
            } else {
                // 2. Si NO, aumento la bolita roja. Tipamos 'prev' como ChatContact[]
                setContacts((prev: ChatContact[]) => prev.map((c: ChatContact) => {
                    if (c.id === msgSenderId) {
                        return { ...c, unread: (c.unread || 0) + 1 };
                    }
                    return c;
                }));
            }
        };

        socket.on('receive_message', handleReceiveMessage);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
        };
    }, [selectedChatId, CURRENT_USER_ID]);


    // ---------------------------------------------------------
    // LÓGICA 4: ENVIAR MENSAJE (UI OPTIMISTA + SERVICIO)
    // ---------------------------------------------------------
    const handleSendSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!msgInput.trim() || !selectedChatId) return;

        const textToSend = msgInput;
        const tempId = Date.now();

        // 1. UI Optimista (Tipamos prev)
        const optimisticMsg: ChatMessage = {
            id: tempId,
            senderId: Number(CURRENT_USER_ID),
            text: textToSend,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev: ChatMessage[]) => [...prev, optimisticMsg]);
        setMsgInput(""); 

        // 2. Enviar usando el SERVICIO (como pediste)
        sendDirectMessage(selectedChatId, textToSend);
    };


    // --- RENDERIZADO ---

    if (!isOpen) {
        return (
            <button style={buttonStyle} onClick={() => setIsOpen(true)}>
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
                        {(activeTab === 'dms' ? contacts : MOCK_CHANNELS).map((chat) => (
                                <div 
                                    key={chat.id} 
                                    onClick={() => {
                                        setSelectedChatId(chat.id);
                                        // Resetear contador (Tipando prev)
                                        setContacts((prev: ChatContact[]) => prev.map((c: ChatContact) => 
                                            c.id === chat.id ? { ...c, unread: 0 } : c
                                        ));
                                    }}
                                    style={rowStyle}
                                >
                                    <div style={avatarStyle}>
                                        {chat.name.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{chat.name}</span>
                                            {chat.unread > 0 && (
                                                <span style={badgeStyle}>{chat.unread}</span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Clic para hablar...</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    // VISTA DE CONVERSACIÓN ABIERTA
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        
                        <div style={{ padding: '10px', backgroundColor: '#a5f3fc', display: 'flex', alignItems: 'center' }}>
                            <button onClick={() => setSelectedChatId(null)} style={{ border: 'none', background: 'none', fontWeight: 'bold', color: '#0e7490', cursor: 'pointer', marginRight: '10px' }}>
                                ⬅ VOLVER
                            </button>
                            <span style={{fontWeight: 'bold', color: '#155e75'}}>Chat con {selectedChatId}</span>
                        </div>
                        
                        <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
                            {messages.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '20px', fontSize: '14px' }}>
                                    No hay mensajes aún.<br/>¡Escribe algo! 👋
                                </p>
                            )}
                            
                            {messages.map((msg, index) => {
                                const isMine = Number(msg.senderId) === Number(CURRENT_USER_ID);
                                
                                return (
                                    <div key={index} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                                        <div style={{ 
                                            padding: '8px 12px', 
                                            borderRadius: '12px', 
                                            backgroundColor: isMine ? '#0891b2' : 'white',
                                            color: isMine ? 'white' : 'black',
                                            maxWidth: '85%',
                                            fontSize: '14px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                            borderBottomRightRadius: isMine ? '0' : '12px',
                                            borderBottomLeftRadius: isMine ? '12px' : '0'
                                        }}>
                                            {msg.text}
                                            <div style={{ fontSize: '10px', textAlign: 'right', marginTop: '4px', opacity: 0.8 }}>{msg.time}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ padding: '10px', backgroundColor: 'white', borderTop: '1px solid #cffafe' }}>
                            <form style={{ display: 'flex', gap: '8px' }} onSubmit={handleSendSubmit}>
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