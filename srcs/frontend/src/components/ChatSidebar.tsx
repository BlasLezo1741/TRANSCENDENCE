import React, { useState, useEffect, useCallback } from 'react';
import { socket, sendDirectMessage } from '../services/socketService';
import './ChatSidebar.css';

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

    // -----------------------------------------------------------
    // DATOS MOCK

    const MOCK_CHANNELS: ChatContact[] = [
        { id: 99, name: "#General", status: 'online', unread: 5 },
        { id: 98, name: "#PongRoom", status: 'online', unread: 0 },
    ];

// ---------------------------------------------------------
    // 🔄 LÓGICA 1: CARGA DE AMIGOS Y EVENTOS
    // ---------------------------------------------------------
    
    const loadFriends = useCallback(() => {
        if (!CURRENT_USER_ID) return;

        console.log("🔄 Actualizando lista de amigos para ID:", CURRENT_USER_ID);
        fetch(`http://localhost:3000/chat/users?current=${CURRENT_USER_ID}`)
            .then(res => res.json())
            .then(data => {
                setContacts((prev: ChatContact[]) => {
                    // Mapa de memoria local (útil para cuando llega un socket en vivo)
                    const localUnreadMap = new Map(prev.map(c => [c.id, c.unread || 0]));
                    
                    if (!Array.isArray(data)) return prev;

                    return data.map((user: any) => {
                        const uId = Number(user.id || user.pPk || user.friend_id);
                        
                        // CORRECCIÓN CLAVE AQUÍ
                        // 1. Miramos si el backend nos manda 'unread' (Base de datos)
                        // 2. Si viene del backend, lo usamos (User.unread)
                        // 3. Si no viene (undefined), usamos el local (localUnreadMap)
                        let finalUnread = 0;
                        
                        if (user.unread !== undefined && user.unread !== null) {
                            finalUnread = Number(user.unread); // Prioridad: Base de Datos
                        } else {
                            finalUnread = localUnreadMap.get(uId) || 0; // Fallback: Memoria local
                        }

                        return {
                            id: uId, 
                            name: user.name || user.pNick || user.friend_nick || "Usuario",
                            status: user.status || 'offline',
                            unread: finalUnread 
                        };
                    });
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
    }, [loadFriends]); 


    // ---------------------------------------------------------
    // 📜 LÓGICA 2: HISTORIAL DE CHAT
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
    // 📩 LÓGICA 3: RECIBIR MENSAJES (Socket)
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
                // 2. Si NO, aumento la bolita roja.
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
    // 🚀 LÓGICA 4: ENVIAR MENSAJE (UI OPTIMISTA + SERVICIO)
    // ---------------------------------------------------------
    const handleSendSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!msgInput.trim() || !selectedChatId) return;

        const textToSend = msgInput;
        const tempId = Date.now();

        // 1. UI Optimista
        const optimisticMsg: ChatMessage = {
            id: tempId,
            senderId: Number(CURRENT_USER_ID),
            text: textToSend,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev: ChatMessage[]) => [...prev, optimisticMsg]);
        setMsgInput(""); 

        // 2. Enviar usando el SERVICIO
        sendDirectMessage(selectedChatId, textToSend);
    };


    // --- RENDERIZADO ---

    if (!isOpen) {
        // 🔥 CORREGIDO: Usamos className en lugar de style
        return (
            <button className="chat-floating-btn" onClick={() => setIsOpen(true)}>
                💬
            </button>
        );
    }

    return (
        <div className="chat-sidebar">
            {/* CABECERA */}
            <div className="chat-header">
                <h2>{selectedChatId ? `CHAT #${selectedChatId}` : "SOCIAL HUB"}</h2>
                <button className="chat-close-btn" onClick={() => setIsOpen(false)}>✕</button>
            </div>

            {/* CONTENIDO */}
            <div className="chat-body">
                
                {selectedChatId === null ? (
                    <>
                        {/* TABS */}
                        <div className="chat-tabs">
                            <button 
                                onClick={() => setActiveTab('dms')}
                                className={`chat-tab-btn ${activeTab === 'dms' ? 'active' : ''}`}
                            >
                                AMIGOS
                            </button>
                            <button 
                                onClick={() => setActiveTab('channels')}
                                className={`chat-tab-btn ${activeTab === 'channels' ? 'active' : ''}`}
                            >
                                CANALES
                            </button>
                        </div>

                        {/* LISTA DE CONTACTOS */}
                        <div className="chat-list">
                        {(activeTab === 'dms' ? contacts : MOCK_CHANNELS).map((chat) => (
                                <div 
                                    key={chat.id} 
                                    onClick={() => {
                                        // 1. Lógica Visual (Inmediata)
                                        setSelectedChatId(chat.id);
                                        setContacts((prev: ChatContact[]) => prev.map((c: ChatContact) => 
                                            c.id === chat.id ? { ...c, unread: 0 } : c
                                        ));
                                
                                        // 2. Lógica de Backend (Persistencia)
                                        console.log(`📤 [FRONT] Avisando que leí mensajes de: ${chat.id} (Yo soy: ${CURRENT_USER_ID})`);
                                        
                                        fetch(`http://localhost:3000/chat/read`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                senderId: Number(chat.id),       // El amigo (remitente)
                                                receiverId: Number(CURRENT_USER_ID) // Yo (destinatario)
                                            })
                                        })
                                        .then(res => res.json())
                                        .then(data => console.log("✅ [FRONT] Respuesta de lectura:", data))
                                        .catch(err => console.error("❌ [FRONT] Error marcando leídos:", err));
                                    }}
                                    className="chat-contact-row"
                                >
                                    <div className="chat-avatar">
                                        {chat.name.charAt(0)}
                                    </div>
                                    <div className="chat-info">
                                        <div className="chat-name-row">
                                            <span className="chat-name">{chat.name}</span>
                                            {chat.unread > 0 && (
                                                <span className="chat-badge">{chat.unread}</span>
                                            )}
                                        </div>
                                        <p className="chat-preview">Clic para hablar...</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    // VISTA DE CONVERSACIÓN
                    <div className="chat-conversation">
                        
                        <div className="chat-subheader">
                            <button onClick={() => setSelectedChatId(null)} className="chat-back-btn">
                                ⬅ VOLVER
                            </button>
                            <span style={{fontWeight: 'bold'}}>Chat con {selectedChatId}</span>
                        </div>
                        
                        <div className="chat-messages-area">
                            {messages.length === 0 && (
                                <p className="chat-empty-msg">
                                    No hay mensajes aún.<br/>¡Escribe algo! 👋
                                </p>
                            )}
                            
                            {messages.map((msg, index) => {
                                const isMine = Number(msg.senderId) === Number(CURRENT_USER_ID);
                                
                                return (
                                    <div key={index} className={`chat-msg-row ${isMine ? 'mine' : 'theirs'}`}>
                                        <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                                            {msg.text}
                                            <div className="chat-time">{msg.time}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="chat-input-area">
                            <form className="chat-form" onSubmit={handleSendSubmit}>
                                <input 
                                    className="chat-input"
                                    placeholder="Escribe un mensaje..."
                                    value={msgInput}
                                    onChange={e => setMsgInput(e.target.value)}
                                />
                                <button type="submit" className="chat-send-btn">
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