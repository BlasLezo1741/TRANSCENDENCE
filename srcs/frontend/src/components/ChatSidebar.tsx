import React, { useState, useEffect } from 'react';
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
    const [messages, setMessages] = useState<ChatMessage[]>([]); // <--- LISTA VACÍA INICIAL
    // 🆕 NUEVO: Estado para la lista de amigos real
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

    // ---------------------------------------------------------
    // 1. EFECTO DE HISTORIAL
    // Se ejecuta cada vez que cambias de amigo (selectedChatId)
    // ---------------------------------------------------------
    useEffect(() => {
        if (!selectedChatId) return;

        // Limpiamos mensajes anteriores
        setMessages([]); 

        console.log(`📜 Cargando historial entre YO (${CURRENT_USER_ID}) y EL (${selectedChatId})...`);

        //fetch(`http://localhost:3000/chat/history?user1=${MY_ID}&user2=${selectedChatId}`)
        fetch(`http://localhost:3000/chat/history?user1=${CURRENT_USER_ID}&user2=${selectedChatId}`)
            .then(res => res.json())
            .then(data => {
                const historyFormatted: ChatMessage[] = data.map((msg: any) => ({
                    id: Number(msg.id),
                    senderId: msg.senderId,
                    text: msg.content,
                    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
                setMessages(historyFormatted);
            })
            .catch(err => console.error("Error cargando historial:", err));
            
    //}, [selectedChatId]); 
    }, [selectedChatId, CURRENT_USER_ID]);

    // ---------------------------------------------------------
    // 2. EFECTO DE SOCKET Escuchar mensajes entrantes
    // Se ejecuta una sola vez al cargar la web para conectar la "tubería"
    // ---------------------------------------------------------
    useEffect(() => {
        const handleReceiveMessage = (newMessage: any) => {
            console.log("📩 Nuevo mensaje recibido:", newMessage);
            
            // Transformamos el dato del backend al formato del frontend
            const formattedMsg: ChatMessage = {
                id: newMessage.id || Date.now(),
                senderId: newMessage.senderId,
                text: newMessage.content,
                time: new Date(newMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            // Lo añadimos a la lista
            // setMessages((prev) => [...prev, formattedMsg]);
            // 🔥 CORRECCIÓN ANTI-DUPLICADOS
            setMessages((prev: ChatMessage[]) => {
                const exists = prev.some((m: ChatMessage) => m.id === formattedMsg.id);
                if (exists) return prev; 
                return [...prev, formattedMsg];
            });
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('message_sent', handleReceiveMessage); // Para ver mis propios mensajes

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('message_sent', handleReceiveMessage);
        };
    }, []);

    // 3. EFECTO: Cargar lista de usuarios al abrir el componente
    useEffect(() => {
        fetch(`http://localhost:3000/chat/users?current=${CURRENT_USER_ID}`)
            .then(res => res.json())
            .then(data => {
                console.log("👥 Usuarios cargados:", data);
                
                // Convertimos los datos del backend al formato del Chat
                const formattedContacts: ChatContact[] = data.map((u: any) => ({
                    id: u.pPk,          // Asegúrate de que coincida con tu DB (pPk o id)
                    name: u.pNick,      // Nombre del usuario
                    status: 'offline',  // Por defecto offline (luego lo mejoraremos)
                    unread: 0           // Por defecto 0
                }));

                setContacts(formattedContacts);
            })
            .catch(err => console.error("Error cargando contactos:", err));
    }, [CURRENT_USER_ID]);

    // 🔥 FUNCIÓN: Enviar mensaje
    const handleSendSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!msgInput.trim() || !selectedChatId) return;

        // 1. Enviar al backend
        sendDirectMessage(selectedChatId, msgInput);

        // 2. Limpiar input
        setMsgInput("");
    };

    // Función auxiliar para probar conexión manual
    const sendTestPing = () => {
        console.log("📡 [FRONTEND] Enviando ping...");
        socket.emit('ping_chat', { mensaje: "Hola desde el botón azul!" });
    };

    // --- RENDERIZADO ---

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

                        {/* LISTA */}
                        <div style={{ padding: '8px' }}>
                        {(activeTab === 'dms' ? contacts : MOCK_CHANNELS).map((chat) => (
                                <div 
                                    key={chat.id} 
                                    onClick={() => setSelectedChatId(chat.id)}
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
                    // CHAT ABIERTO
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
                            {/* 🔥 AQUÍ ESTÁ EL CAMBIO IMPORTANTE 🔥 */}
                            {messages.map((msg, index) => {
                                // Calculamos dinámicamente si el mensaje es mío
                                const isMine = Number(msg.senderId) === Number(CURRENT_USER_ID);
                                
                                return (
                                    <div key={index} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                                        <div style={{ 
                                            padding: '8px 12px', 
                                            borderRadius: '12px', 
                                            // Usamos isMine para el color
                                            backgroundColor: isMine ? '#0891b2' : 'white',
                                            color: isMine ? 'white' : 'black',
                                            maxWidth: '85%',
                                            fontSize: '14px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                            // Detalle extra: redondear bordes diferente según lado
                                            borderBottomRightRadius: isMine ? '0' : '12px',
                                            borderBottomLeftRadius: isMine ? '12px' : '0'
                                        }}>
                                            {msg.text}
                                            {/* (Opcional) Si quieres ver la hora, descomenta esto: */}
                                            {/* <div style={{ fontSize: '10px', textAlign: 'right', marginTop: '4px', opacity: 0.8 }}>{msg.time}</div> */}
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