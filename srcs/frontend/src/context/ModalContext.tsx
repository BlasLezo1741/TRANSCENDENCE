import React, { createContext, useContext, useState, ReactNode } from 'react';

// Tipos de datos para nuestro modal
interface ModalOptions {
    title: string;
    message: string;
    type?: 'info' | 'confirm' | 'error' | 'success'; // Para cambiar colores si quieres
    onConfirm?: () => void; // Solo para confirmaciones
    onCancel?: () => void;  // Solo para confirmaciones
}

interface ModalContextType {
    showModal: (options: ModalOptions) => void;
    hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

// Hook para usarlo fácil en otros archivos
export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error("useModal debe usarse dentro de un ModalProvider");
    }
    return context;
};

// Componente Proveedor que envolverá la App
export const ModalProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<ModalOptions>({ title: '', message: '' });

    const showModal = (options: ModalOptions) => {
        setModalConfig(options);
        setIsOpen(true);
    };

    const hideModal = () => {
        setIsOpen(false);
        // Limpiamos configuración tras cerrar para evitar residuos
        setTimeout(() => setModalConfig({ title: '', message: '' }), 300); 
    };

    const handleConfirm = () => {
        if (modalConfig.onConfirm) modalConfig.onConfirm();
        hideModal();
    };

    const handleCancel = () => {
        if (modalConfig.onCancel) modalConfig.onCancel();
        hideModal();
    };

    return (
        <ModalContext.Provider value={{ showModal, hideModal }}>
            {children}
            
            {/* --- AQUÍ ESTÁ EL DISEÑO DEL MODAL (Global) --- */}
            {isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    backdropFilter: 'blur(3px)'
                }}>
                    <div style={{
                        backgroundColor: '#1a1a1a', 
                        padding: '30px', 
                        borderRadius: '12px',
                        border: '2px solid #ea580c', // Naranja corporativo
                        textAlign: 'center', 
                        color: 'white',
                        maxWidth: '400px', 
                        minWidth: '300px',
                        boxShadow: '0 0 25px rgba(234, 88, 12, 0.4)',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <h2 style={{marginTop: 0, color: '#ea580c', fontSize: '24px'}}>
                            {modalConfig.title}
                        </h2>
                        
                        <p style={{fontSize: '16px', margin: '20px 0', lineHeight: '1.5', color: '#ddd'}}>
                            {modalConfig.message}
                        </p>
                        
                        <div style={{display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '25px'}}>
                            {/* BOTÓN CONFIRMAR / OK */}
                            <button 
                                onClick={handleConfirm}
                                style={{
                                    backgroundColor: '#ea580c', color: 'white', border: 'none',
                                    padding: '10px 25px', borderRadius: '6px', cursor: 'pointer', 
                                    fontWeight: 'bold', fontSize: '14px',
                                    transition: 'transform 0.1s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {modalConfig.type === 'confirm' ? 'ACEPTAR' : 'ENTENDIDO'}
                            </button>

                            {/* BOTÓN CANCELAR (Solo si es tipo confirm) */}
                            {modalConfig.type === 'confirm' && (
                                <button 
                                    onClick={handleCancel}
                                    style={{
                                        backgroundColor: '#333', color: '#ccc', border: '1px solid #666',
                                        padding: '10px 25px', borderRadius: '6px', cursor: 'pointer', 
                                        fontWeight: 'bold', fontSize: '14px'
                                    }}
                                >
                                    CANCELAR
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
};