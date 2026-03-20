import React, { useState, useEffect, useCallback, useRef } from 'react';
import { socket, sendDirectMessage } from '../services/socketService';
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
            title: t('chat.challengeSent'),
            message: t('chat.messageChallengeSent'),
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
        <div className="fixed right-0 top-[115px] h-[calc(100vh-115px)] w-[320px] bg-cyan-500 border-l-4 border-gray-700 z-40 flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.5)] text-gray-900 font-sans">
            {/* CABECERA SIMPLE (Solo título) */}
            <div className="h-[50px] bg-cyan-700 flex items-center justify-between px-4 text-white">
                <h2>{selectedChatId 
                    ? firstcap(t('chat.with', { name: contacts.find(c => c.id === selectedChatId)?.name || '...' })) 
                    : firstcap(t('chat.my_friends'))}</h2>
                <button className="btn bg-transparent border-0 text-white text-[20px]" onClick={() => setChatOpen(false)}>✕</button>
            </div>

            <div className="flex-1 overflow-y-auto bg-cyan-100 flex flex-col">
                
                {selectedChatId === null ? (
                    <>
                        {/* SIN TABS, SOLO LISTA DIRECTA */}
                        <div className="p-2">
                            {contacts.length === 0 && (
                                <p className="text-center p-5 text-gray-500">
                                    {t('chat.noFriends')}<br/>{t('chat.addFriends')}
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
                                    className="flex items-center p-[10px] m-[5px] bg-white rounded-lg cursor-pointer shadow-sm border border-cyan-100 transition-colors duration-200 hover:bg-sky-50"
                                >
                                    {/* <div className="chat-avatar">
                                        {chat.name.charAt(0)}
                                    </div> */}
                                    <div className="w-[40px] h-[40px] bg-gray-200 rounded-full flex items-center justify-center mr-3 font-bold text-gray-700 border border-gray-300 shrink-0">
                                        <img 
                                            src={getDisplayAvatar(chat.id, chat.avatarId)} // <--- USO DE LA NUEVA FUNCIÓN
                                            alt={chat.name}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-[14px]">{chat.name}</span>
                                            {chat.unread > 0 && (
                                                <span className="bg-red-500 text-white text-[10px] font-bold px-[6px] py-[2px] rounded-full min-w-[18px] text-center">{chat.unread}</span>
                                            )}
                                        </div>
                                        {/* Aquí mostramos el estado en lugar de "clic para hablar" */}
                                        <p className={`text-[12px] m-0 whitespace-nowrap overflow-hidden text-ellipsis ${chat.status === 'online' ? 'text-green-500' : 'text-gray-500'}`}>
                                            {chat.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    // VISTA DE CONVERSACIÓN
                    <div className="flex flex-col h-full">
                        
                        <div className="flex items-center p-[10px] bg-cyan-200 text-cyan-800">
                            <button onClick={() => setSelectedChatId(null)} className="btn border-0 bg-transparent text-cyan-700 mr-[10px]">
                                ⬅ {t('volver')}
                            </button>

                            {/* 👇👇👇 AQUI INSERTAMOS EL AVATAR EN LA CABECERA 👇👇👇 */}
                            <div className="w-[35px] h-[35px] rounded-full overflow-hidden shrink-0 ml-[10px]">
                                <img 
                                    src={(() => {
                                        const contact = contacts.find(c => c.id === selectedChatId);
                                        return contact ? getDisplayAvatar(contact.id, contact.avatarId) : '';
                                    })()}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            
                            {/* 1. INFORMACIÓN DEL CONTACTO (Nombre y Estado) */}
                            <div className="flex-1 ml-[10px]">
                                 <div className="font-bold">
                                     {contacts.find(c => c.id === selectedChatId)?.name || 'Chat'}
                                 </div>
                                 <div className="text-[10px] text-gray-500">
                                    {contacts.find(c => c.id === selectedChatId)?.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                                 </div>
                            </div>

                            {/* 2. BOTÓN DE RETAR (Solo visible si está Online) */}
                            {contacts.find(c => c.id === selectedChatId)?.status === 'online' && (
                                <button 
                                    onClick={handleInviteClick}
                                    title={t('chat.invitePlay')}
                                    className="btn bg-orange-600 text-white border-0 text-[12px] shadow-md transition-colors duration-200"
                                >
                                    {t('chat.challenge')}
                                </button>
                            )}
                        </div>

                        {/* LISTA DE MENSAJES */}
                        <div className="flex-1 flex flex-col gap-[10px] p-[10px] overflow-y-auto">
                            {messages.map((msg) => {
                                const isMine = msg.senderId === Number(CURRENT_USER_ID);
                                return (
                                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] break-words text-[14px] px-[12px] py-[8px] rounded-[12px] ${isMine ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'}`}>
                                            <div>{msg.text}</div>
                                            <div className="text-[10px] opacity-70 mt-1 text-right">
                                                {msg.time}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Elemento invisible para auto-scroll */}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-[10px] bg-white border-t border-cyan-100">
                            <form className="flex gap-2" onSubmit={handleSendSubmit}>
                                <input 
                                    className="flex-1 bg-gray-100 text-gray-900 rounded-full px-[16px] py-[8px] border border-gray-300 outline-none"
                                    placeholder={sentence(t('chat.write'))+'...'}
                                    value={msgInput}
                                    onChange={e => setMsgInput(e.target.value)}
                                />
                                <button type="submit" className="btn bg-cyan-500 text-white border-0 flex items-center justify-center">➤</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};