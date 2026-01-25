import React, { useState, useEffect, useCallback } from 'react';
import { socket, sendDirectMessage } from '../services/socketService';
import './ChatSidebar.css'; 

// --- INTERFACES ---
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
    // --- ESTADOS ---
    const [isOpen, setIsOpen] = useState(false);
    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
    const [msgInput, setMsgInput] = useState("");
    
    const [messages, setMessages] = useState<ChatMessage[]>([]); 
    const [contacts, setContacts] = useState<ChatContact[]>([]); 
    
    // --- IDENTIFICACIÓN DEL USUARIO ---
    const queryParams = new URLSearchParams(window.location.search);
    const urlId = queryParams.get('uid'); 
    const storedId = localStorage.getItem("pong_user_id"); 
    
    const CURRENT_USER_ID = urlId ? Number(urlId) : (storedId ? Number(storedId) : 1);
    
    // ---------------------------------------------------------
    // 🔄 LÓGICA 1: CARGA DE AMIGOS
    // ---------------------------------------------------------
    const loadFriends = useCallback(() => {
        if (!CURRENT_USER_ID) return;

        fetch(`http://localhost:3000/chat/users?current=${CURRENT_USER_ID}`)
            .then(res => res.json())
            .then(data => {
                setContacts((prev: ChatContact[]) => {
                    const localUnreadMap = new Map(prev.map(c => [c.id, c.unread || 0]));
                    
                    if (!Array.isArray(data)) return prev;

                    return data.map((user: any) => {
                        const uId = Number(user.id || user.pPk || user.friend_id);
                        
                        let finalUnread = 0;
                        if (user.unread !== undefined && user.unread !== null) {
                            finalUnread = Number(user.unread); 
                        } else {
                            finalUnread = localUnreadMap.get(uId) || 0; 
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

    useEffect(() => {
        loadFriends(); // Carga inicial
        
        // Eventos de amistad (Recargar lista completa)
        socket.on('friend_accepted', loadFriends);
        socket.on('friend_removed', loadFriends);

        // 🔥 NUEVO EVENTO: Cambio de estado (Actualizar solo un usuario)
        // No llamamos a loadFriends() porque sería muy pesado recargar todo.
        // Solo actualizamos el array localmente.
        const handleStatusChange = (data: { userId: number, status: 'online' | 'offline' | 'ingame' }) => {
            console.log("🚦 Cambio de estado recibido:", data);
            
            setContacts((prevContacts: ChatContact[]) => prevContacts.map((contact: ChatContact) => {
                // Si el ID coincide, cambiamos su estado
                if (contact.id === Number(data.userId)) {
                    return { ...contact, status: data.status };
                }
                return contact; // Si no es él, lo dejamos igual
            }));
        };

        socket.on('user_status', handleStatusChange);

        return () => {
            socket.off('friend_accepted', loadFriends);
            socket.off('friend_removed', loadFriends);
            // No olvides limpiar el listener nuevo
            socket.off('user_status', handleStatusChange);
        };
    }, [loadFriends]);

    // ---------------------------------------------------------
    // 📜 LÓGICA 2: HISTORIAL
    // ---------------------------------------------------------
    useEffect(() => {
        if (!selectedChatId) return;

        setMessages([]); 

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
    // 📩 LÓGICA 3: RECEPCIÓN SOCKET
    // ---------------------------------------------------------
    useEffect(() => {
        const handleReceiveMessage = (newMessage: any) => {
            const msgSenderId = Number(newMessage.senderId);
            const myId = Number(CURRENT_USER_ID);
            const openChatId = Number(selectedChatId);

            if (msgSenderId === myId) return;

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
    // 🚀 LÓGICA 4: ENVÍO
    // ---------------------------------------------------------
    const handleSendSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!msgInput.trim() || !selectedChatId) return;

        const textToSend = msgInput;
        const tempId = Date.now();

        const optimisticMsg: ChatMessage = {
            id: tempId,
            senderId: Number(CURRENT_USER_ID),
            text: textToSend,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev: ChatMessage[]) => [...prev, optimisticMsg]);
        setMsgInput(""); 

        sendDirectMessage(selectedChatId, textToSend);
    };

    // --- RENDERIZADO ---

    if (!isOpen) {
        return (
            <button className="chat-floating-btn" onClick={() => setIsOpen(true)}>
                💬
            </button>
        );
    }

    return (
        <div className="chat-sidebar">
            {/* CABECERA SIMPLE (Solo título) */}
            <div className="chat-header">
                <h2>{selectedChatId ? `CHAT CON ${contacts.find(c => c.id === selectedChatId)?.name || '...'}` : "MIS AMIGOS"}</h2>
                <button className="chat-close-btn" onClick={() => setIsOpen(false)}>✕</button>
            </div>

            <div className="chat-body">
                
                {selectedChatId === null ? (
                    <>
                        {/* SIN TABS, SOLO LISTA DIRECTA */}
                        <div className="chat-list">
                            {contacts.length === 0 && (
                                <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                                    No tienes amigos conectados.<br/>¡Añade a alguien desde el perfil!
                                </p>
                            )}

                            {contacts.map((chat) => (
                                <div 
                                    key={chat.id} 
                                    onClick={() => {
                                        setSelectedChatId(chat.id);
                                        // 1. UI: Limpiar bolita
                                        setContacts((prev: ChatContact[]) => prev.map((c: ChatContact) => 
                                            c.id === chat.id ? { ...c, unread: 0 } : c
                                        ));
                                        // 2. API: Marcar leído
                                        fetch(`http://localhost:3000/chat/read`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                senderId: Number(chat.id),
                                                receiverId: Number(CURRENT_USER_ID)
                                            })
                                        }).catch(console.error);
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
                                        {/* Aquí mostramos el estado en lugar de "clic para hablar" */}
                                        <p className="chat-preview" style={{color: chat.status === 'online' ? 'green' : 'gray'}}>
                                            {chat.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                                        </p>
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
                            <span style={{fontWeight: 'bold'}}>Chat</span>
                            {/* AQUÍ PONDREMOS EL BOTÓN DE INVITAR A JUGAR */}
                        </div>
                        
                        <div className="chat-messages-area">
                            {messages.length === 0 && (
                                <p className="chat-empty-msg">
                                    No hay mensajes aún.
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
                                <button type="submit" className="chat-send-btn">➤</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};