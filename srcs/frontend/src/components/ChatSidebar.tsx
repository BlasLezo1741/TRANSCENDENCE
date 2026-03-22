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
                //console.log("📦 Datos RAW de amigos recibidos:", data);
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
            //console.log("🚦 Cambio de estado recibido:", data);
            
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
                    //console.log(`🔄 Actualizando visualmente a ${contact.name}`);
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
                //console.log("📦 Datos recibidos del historial:", data);

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

    // if (!chatOpen) {
    //     return (
    //         //<button className="chat-floating-btn" onClick={() => setChatOpen(true)}>
    //         <button 
    //             className="fixed bottom-[20px] right-[20px] z-50 w-[60px] h-[60px] rounded-full bg-blue-600 text-white text-[24px] border-none shadow-[0_4px_6px_rgba(0,0,0,0.3)] cursor-pointer flex items-center justify-center transition-transform duration-200 hover:scale-110" 
    //             onClick={() => setChatOpen(true)}
    //         >
    //             💬
    //         </button>
    //     );
    // }
    
    if (!chatOpen) {
        return (
            // CAMBIO: div en lugar de button y clases estándar (w-16 h-16)
            <div 
                role="button"
                className="fixed bottom-5 right-5 z-50 w-16 h-16 rounded-full bg-blue-600 text-white text-3xl shadow-lg cursor-pointer flex items-center justify-center transition-transform duration-200 hover:scale-110" 
                onClick={() => setChatOpen(true)}
            >
                💬
            </div>
        );
    }

    // Función para enviar la invitación
    const handleInviteClick = () => {
        if (!selectedChatId) return;
        
        //console.log(`🏓 Enviando reto a ${selectedChatId}...`);
        
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
        <div className="chat-layout fixed right-0 w-80 bg-cyan-500 border-l-4 border-gray-700 z-40 flex flex-col shadow-2xl text-gray-900 font-sans">
            
            {/* --- CABECERA PRINCIPAL (Mis Amigos / Chat con...) --- */}
            <div className="h-12 bg-cyan-700 flex items-center justify-between !px-5 text-white shrink-0">
                <h2 className="!m-0 text-base font-bold">
                    {selectedChatId 
                        ? firstcap(t('chat.with', { name: contacts.find(c => c.id === selectedChatId)?.name || '...' })) 
                        : firstcap(t('chat.my_friends'))}
                </h2>
                <div 
                    role="button"
                    className="!w-8 !h-8 bg-transparent text-white text-xl cursor-pointer flex items-center justify-center hover:opacity-80 !p-0 !m-0 !border-none" 
                    onClick={() => setChatOpen(false)}
                >
                    ✕
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-cyan-100 flex flex-col">
                
                {selectedChatId === null ? (
                    
                    /* --- VISTA 1: LISTA DE AMIGOS --- */
                    <div className="p-2 !px-3">
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
                                    setContacts((prev: ChatContact[]) => prev.map((c: ChatContact) => 
                                        c.id === chat.id ? { ...c, unread: 0 } : c
                                    ));
                                    fetch('/chat/read', {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ senderId: Number(chat.id), receiverId: Number(CURRENT_USER_ID) })
                                    }).catch(console.error);
                                }}
                                className="flex items-center !p-2.5 !my-2 bg-white rounded-lg cursor-pointer shadow-sm border border-cyan-100 transition-colors duration-200 hover:bg-sky-50 !w-full"
                            > 
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3 font-bold text-gray-700 border border-gray-300 shrink-0 overflow-hidden">
                                    <img 
                                        src={getDisplayAvatar(chat.id, chat.avatarId)} 
                                        alt={chat.name}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                </div>
                                
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-sm">{chat.name}</span>
                                        {chat.unread > 0 && (
                                            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                {chat.unread}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs m-0 whitespace-nowrap overflow-hidden text-ellipsis ${chat.status === 'online' ? 'text-green-600' : 'text-gray-500'}`}>
                                        {chat.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

            ) : (

                    /* --- VISTA 2: CONVERSACIÓN ABIERTA (CORREGIDA) --- */
                    <div className="flex flex-col h-full">
                        
                        {/* --- Sub-cabecera de chat activo --- */}
                        <div className="flex items-center justify-between !px-3 !py-2.5 bg-[#0c6b85] text-white shrink-0 shadow-md z-10 border-t border-[#085a72]">
                            
                            {/* Grupo Izquierdo: Volver + Avatar + Textos */}
                            <div className="flex items-center !gap-3">
                                
                                {/* BOTÓN VOLVER (Usamos &larr; para evitar el feo emoji azul de Windows) */}
                                <div 
                                    role="button"
                                    onClick={() => setSelectedChatId(null)} 
                                    className="cursor-pointer font-bold hover:text-cyan-200 transition-colors !text-sm flex items-center !gap-1"
                                >
                                    <span className="!text-xl leading-none !mb-[2px]">&larr;</span> {t('volver')}
                                </div>

                                {/* AVATAR */}
                                <div className="!w-9 !h-9 rounded-full overflow-hidden shrink-0 border-2 border-white/80 shadow-sm">
                                    <img 
                                        src={(() => {
                                            const contact = contacts.find(c => c.id === selectedChatId);
                                            return contact ? getDisplayAvatar(contact.id, contact.avatarId) : '';
                                        })()}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                
                                {/* NOMBRE Y ESTADO (Con punto CSS en lugar de emoji) */}
                                <div className="flex flex-col justify-center">
                                     <span className="font-bold !text-[14px] !leading-none !mb-1">
                                         {contacts.find(c => c.id === selectedChatId)?.name || 'Chat'}
                                     </span>
                                     <span className="!text-[11px] text-cyan-100 flex items-center !gap-1.5 !leading-none">
                                        <span className={`inline-block !w-2 !h-2 rounded-full shadow-sm ${contacts.find(c => c.id === selectedChatId)?.status === 'online' ? 'bg-[#4ade80]' : 'bg-gray-400'}`}></span>
                                        {contacts.find(c => c.id === selectedChatId)?.status === 'online' ? 'Online' : 'Offline'}
                                     </span>
                                </div>
                            </div>

                            {/* Grupo Derecho: BOTÓN DESAFIAR */}
                            {contacts.find(c => c.id === selectedChatId)?.status === 'online' && (
                                <div 
                                    role="button"
                                    onClick={handleInviteClick}
                                    title={t('chat.invitePlay')}
                                    className="!px-3 !py-1.5 rounded-lg cursor-pointer font-bold bg-[#ea580c] text-white !text-xs shadow-md transition-colors hover:bg-[#c2410c]"
                                >
                                    {t('chat.challenge')}
                                </div>
                            )}
                        </div>

                        {/* CUERPO DE MENSAJES: bg-#f3f4f6 (Gris muy claro) */}
                        <div className="flex-1 flex flex-col !gap-2 !p-3 overflow-y-auto bg-[#f3f4f6]">
                            {messages.map((msg) => {
                                const isMine = msg.senderId === Number(CURRENT_USER_ID);
                                return (
                                    <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] break-words !text-sm !px-3 !py-2 shadow-sm ${
                                            isMine 
                                            ? 'bg-[#0891b2] text-white rounded-xl rounded-br-none' 
                                            : 'bg-white text-black border border-gray-200 rounded-xl rounded-bl-none'
                                        }`}>
                                            <div>{msg.text}</div>
                                            <div className={`!text-[10px] !mt-1 text-right ${isMine ? 'text-cyan-100' : 'text-gray-400'}`}>
                                                {msg.time}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* ÁREA DE ESCRITURA: bg-white */}
                        <div className="!p-3 bg-white border-t border-gray-200 shrink-0">
                            <div className="flex flex-row items-center !gap-2 w-full !m-0 !p-0 bg-transparent">
                                <input 
                                    className="flex-1 !m-0 !px-4 !py-2 !bg-gray-100 text-black rounded-full !border !border-gray-300 outline-none focus:!border-cyan-600 !text-sm"
                                    placeholder={sentence(t('chat.write'))+'...'}
                                    value={msgInput}
                                    onChange={e => setMsgInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSendSubmit(e as any);
                                        }
                                    }}
                                />
                                {/* BOTÓN ENVIAR: Circular 40px */}
                                <div 
                                    role="button"
                                    onClick={handleSendSubmit as any}
                                    className="!w-10 !h-10 rounded-full bg-cyan-600 text-white flex items-center justify-center cursor-pointer hover:bg-cyan-700 transition-colors shrink-0 !p-0 !border-none"
                                >
                                    ➤
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatSidebar;