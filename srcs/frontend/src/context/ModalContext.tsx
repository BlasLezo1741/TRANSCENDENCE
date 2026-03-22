import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

// Tipos de datos para nuestro modal
interface ModalOptions {
    title: string;
    message: string;
    type?: 'info' | 'confirm' | 'error' | 'success'; 
    onConfirm?: () => void; 
    onCancel?: () => void;  
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
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<ModalOptions>({ title: '', message: '' });

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (modalConfig.type === 'confirm') {
                    handleCancel();
                } else {
                    hideModal();
                }
            }
            if (e.key === 'Enter') {
                handleConfirm();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, modalConfig]);

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
            
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center !bg-black/80 backdrop-blur-sm !p-6">
                    
                    <div className="!bg-[#111827] !border-2 !border-orange-600 !rounded-3xl !shadow-[0_0_30px_rgba(234,88,12,0.5)] !w-full !max-w-xl flex flex-col overflow-hidden">
                        
                        <div className="!p-6 !border-b !border-orange-600/30 text-center !bg-black/30">
                            <h2 className="!m-0 !text-2xl !font-extrabold !text-white !tracking-wider !uppercase !leading-tight">
                                {modalConfig.title}
                            </h2>
                        </div>

                        <div className="!px-10 !pt-12 !pb-8 text-center">
                            <p className="!text-gray-100 !text-base !leading-loose !tracking-wide !m-0">
                                {modalConfig.message}
                            </p>
                        </div>

                        <div className="!px-10 !pb-10 !pt-4 flex justify-center !gap-6">
                            
                            {modalConfig.type === 'confirm' && (
                                <button 
                                    onClick={handleCancel}
                                    className="!px-10 !py-3.5 !min-w-[180px] !rounded-full !bg-gray-700/50 hover:!bg-gray-600 !text-white !font-bold !text-sm !uppercase !tracking-wider !transition-colors !border !border-gray-600 !m-0"
                                >
                                    {t('modal.cancel_btn', 'CANCELAR')}
                                </button>
                            )}

                            <button 
                                onClick={handleConfirm}
                                className="!px-10 !py-3.5 !min-w-[180px] !rounded-full !bg-orange-600 hover:!bg-orange-700 !text-white !font-extrabold !text-sm !uppercase !tracking-wider !transition-transform hover:scale-105 !shadow-lg !shadow-orange-600/30 !m-0 !border-none"
                            >
                                {modalConfig.type === 'confirm' ? t('modal.accept_btn', 'ACEPTAR') : 'OK'}
                            </button>
                            
                        </div>
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
};