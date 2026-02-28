import React, { useState, useEffect, useCallback, useRef } from 'react';
import { socket, sendDirectMessage } from '../services/socketService';
import '../css/ChatSidebar.css'; 
import { useModal } from '../context/ModalContext';
import { useTranslation } from 'react-i18next';
import { firstcap } from '../ts/utils/string';
import { sentence } from '../ts/utils/string';
import { getAvatarUrlById, getDefaultAvatar } from '../assets/avatars';

// --- INTERFACES ---
interface ChatContact {
    id: number;
    name: string;
    status: 'online' | 'offline' | 'ingame';
    unread: number;
    avatarId?: string;
}

interface ChatMessage {
    id: number;
    senderId: number;
    text: string;
    time: string;
}

//NUEVA FUNCIÓN: Helper para formatear la hora correctamente a la zona local
const formatLocalTime = (dateString: string | undefined | null) => {
    if (!dateString) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Si la fecha que viene de la BD no acaba en 'Z' (indicador de UTC), se lo añadimos
    const utcDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    const date = new Date(utcDateString);
    
    // Si la fecha es inválida por algún motivo, devolvemos la hora actual
    if (isNaN(date.getTime())) {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

type ChatProps = {
    chatOpen: boolean;
    setChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export const ChatSidebar = ( {chatOpen, setChatOpen}: ChatProps ) => {
    
    //const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const { t } = useTranslation();
    // --- ESTADOS ---
    const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
    const [msgInput, setMsgInput] = useState("");
    
    const [messages, setMessages] = useState<ChatMessage[]>([]); 
    const [contacts, setContacts] = useState<ChatContact[]>([]); 
    
    // --- IDENTIFICACIÓN DEL USUARIO ---
    const queryParams = new URLSearchParams(window.location.search);
    const urlId = queryParams.get('uid'); 
    const storedId = localStorage.getItem("pong_user_id"); 
    const messagesEndRef = useRef<HTMLDivElement>(null); // Referencia al final del chat

    const CURRENT_USER_ID = urlId ? Number(urlId) : (storedId ? Number(storedId) : 1);

    const { showModal } = useModal();
    
    // ---------------------------------------------------------
    // 🔄 LÓGICA 1: CARGA DE AMIGOS
    // ---------------------------------------------------------
    const loadFriends = useCallback(() => {
        if (!CURRENT_USER_ID) return;

        // fetch(`http://localhost:3000/chat/users?current=${CURRENT_USER_ID}`)
        fetch(`/chat/users?current=${CURRENT_USER_ID}`)
            .then(res => res.json())
            .then(data => {
                console.log("📦 Datos RAW de amigos recibidos:", data);
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
                            name: user.name || user.pNick || user.friend_nick || t('user'),
                            status: user.status || 'offline',
                            unread: finalUnread, 
                            avatarId: user.avatar || user.avatarId || null // avatar
                        };
                    });
                });
            })
            .catch(err => console.error("Error cargando amigos:", err));
    }, [CURRENT_USER_ID]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    
    useEffect(() => {
        loadFriends(); // Carga inicial
        
        // Eventos de amistad (Recargar lista completa)
        socket.on('friend_accepted', loadFriends);
        socket.on('friend_removed', loadFriends);

        // Cambio de estado (Actualizar solo un usuario)
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
    // LÓGICA 2.5: ACTUALIZACIÓN DE PERFIL EN TIEMPO REAL
    // ---------------------------------------------------------
    useEffect(() => {
        const handleFriendUpdate = (payload: any) => {
            setContacts((prevContacts) => prevContacts.map(contact => {
                // Comparamos IDs (asegurando que sean números)
                if (Number(contact.id) === Number(payload.id)) {
                    console.log(`🔄 Actualizando visualmente a ${contact.name}`);
                    return {
                        ...contact,
                        name: payload.name || contact.name,       
                        // Actualizamos el ID del avatar
                        avatarId: payload.avatar || payload.avatarId || contact.avatarId, 
                    };
                }
                return contact;
            }));
        };

        socket.on('friend_update', handleFriendUpdate);

        return () => {
            socket.off('friend_update', handleFriendUpdate);
        };
    }, []);


    useEffect(() => {
        if (!selectedChatId) return;

        setMessages([]); 

        fetch(`/chat/history?user1=${CURRENT_USER_ID}&user2=${selectedChatId}`)
            .then(res => res.json())
            .then(data => {
                // DEBUG: Ver qué está llegando exactamente
                console.log("📦 Datos recibidos del historial:", data);

                if (!Array.isArray(data)) return;

                const historyFormatted: ChatMessage[] = data.map((msg: any) => {
                    const dateRaw = msg.createdAt || msg.created_at || new Date().toISOString();
                    
                    return {
                        id: Number(msg.id),
                        senderId: Number(msg.senderId),
                        text: msg.content,
                        // Convertir la fecha de forma segura
                        //time: new Date(dateRaw).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        time: formatLocalTime(dateRaw)
                    };
                });
                setMessages(historyFormatted);
            })
            .catch(err => console.error("Error cargando historial:", err));
            
    }, [selectedChatId, CURRENT_USER_ID]); // Añadido API_URL a dependencias

    // ---------------------------------------------------------
    // LÓGICA 3: RECEPCIÓN SOCKET
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
                        //time: new Date(newMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        time: formatLocalTime(newMessage.createdAt)
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
    // LÓGICA 4: ENVÍO
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

    if (!chatOpen) {
        return (
            <button className="chat-floating-btn" onClick={() => setChatOpen(true)}>
                💬
            </button>
        );
    }

    // Función para enviar la invitación
    const handleInviteClick = () => {
        if (!selectedChatId) return;
        
        console.log(`🏓 Enviando reto a ${selectedChatId}...`);
        
        // Emitimos el evento al Gateway
        socket.emit('send_game_invite', { 
            targetId: selectedChatId 
        });
        
        //alert("¡Invitación enviada! Esperando respuesta...");
        showModal({
            title: "🚀 Reto Enviado",
            message: "La invitación ha sido enviada correctamente. Espera a que tu amigo acepte para comenzar la partida.",
            type: "info" // Solo botón de OK
        });
    };

    // Función inteligente para decidir qué avatar mostrar
    const getDisplayAvatar = (contactId: number, avatarId?: string | null) => {
        // 1. Si no hay avatar, devolvemos el generado por defecto
        if (!avatarId) return getDefaultAvatar(contactId);

        // 2. 🔥 CASO 42 OAUTH: Si empieza por http, es una URL externa, úsala tal cual
        if (avatarId.startsWith('http') || avatarId.startsWith('/')) {
            return avatarId;
        }

        // 3. CASO LOCAL: Si es un ID (ej: "dragon-egg"), busca la imagen importada
        const customUrl = getAvatarUrlById(avatarId);
        if (customUrl) return customUrl;

        // 4. Fallback final
        return getDefaultAvatar(contactId);
    };

    return (
        <div className="chat-sidebar">
            {/* CABECERA SIMPLE (Solo título) */}
            <div className="chat-header">
                <h2>{selectedChatId 
                    ? firstcap(t('chat.with', { name: contacts.find(c => c.id === selectedChatId)?.name || '...' })) 
                    : firstcap(t('chat.my_friends'))}</h2>
                <button className="chat-close-btn" onClick={() => setChatOpen(false)}>✕</button>
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
                                        fetch('/chat/read', {
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
                                    {/* <div className="chat-avatar">
                                        {chat.name.charAt(0)}
                                    </div> */}
                                    <div className="chat-avatar">
                                        <img 
                                            src={getDisplayAvatar(chat.id, chat.avatarId)} // <--- USO DE LA NUEVA FUNCIÓN
                                            alt={chat.name}
                                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                        />
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
                                ⬅ {t('volver')}
                            </button>

                            {/* 👇👇👇 AQUI INSERTAMOS EL AVATAR EN LA CABECERA 👇👇👇 */}
                            <div style={{ width: '35px', height: '35px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, marginLeft: '10px' }}>
                                <img 
                                    src={(() => {
                                        const contact = contacts.find(c => c.id === selectedChatId);
                                        return contact ? getDisplayAvatar(contact.id, contact.avatarId) : '';
                                    })()}
                                    alt="Avatar"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                            
                            {/* 1. INFORMACIÓN DEL CONTACTO (Nombre y Estado) */}
                            <div style={{flex: 1, marginLeft: '10px'}}>
                                 <div style={{fontWeight: 'bold'}}>
                                     {contacts.find(c => c.id === selectedChatId)?.name || 'Chat'}
                                 </div>
                                 <div style={{fontSize: '10px', color: '#666'}}>
                                    {contacts.find(c => c.id === selectedChatId)?.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                                 </div>
                            </div>

                            {/* 2. BOTÓN DE RETAR (Solo visible si está Online) */}
                            {contacts.find(c => c.id === selectedChatId)?.status === 'online' && (
                                <button 
                                    onClick={handleInviteClick}
                                    title="Invitar a jugar Pong"
                                    style={{
                                        backgroundColor: '#ea580c', // Naranja vibrante
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '6px 12px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    🏓 RETAR
                                </button>
                            )}
                        </div>

                        {/* LISTA DE MENSAJES */}
                        <div className="chat-messages-area" style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {messages.map((msg) => {
                                const isMine = msg.senderId === Number(CURRENT_USER_ID);
                                return (
                                    <div key={msg.id} style={{
                                        display: 'flex',
                                        justifyContent: isMine ? 'flex-end' : 'flex-start'
                                    }}>
                                        <div style={{
                                            backgroundColor: isMine ? '#007bff' : '#f1f0f0', // Azul para mí, gris para el otro
                                            color: isMine ? 'white' : 'black',
                                            padding: '8px 12px',
                                            borderRadius: '12px',
                                            maxWidth: '75%',
                                            wordWrap: 'break-word',
                                            fontSize: '14px'
                                        }}>
                                            <div>{msg.text}</div>
                                            <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>
                                                {msg.time}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Elemento invisible para auto-scroll */}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input-area">
                            <form className="chat-form" onSubmit={handleSendSubmit}>
                                <input 
                                    className="chat-input"
                                    placeholder={sentence(t('chat.write'))+'...'}
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