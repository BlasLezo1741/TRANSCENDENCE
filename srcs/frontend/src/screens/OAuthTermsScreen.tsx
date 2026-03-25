// frontend/src/screens/OAuthTermsScreen.tsx
//
// Shown to NEW OAuth users only (existing users bypass this entirely).
// App.tsx detects ?oauth_pending=<token> in the URL and dispatches
// { type: "OAUTH_TERMS", pendingToken } which renders this screen.
//
// On acceptance → POST /auth/oauth-complete → real JWT → MENU.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import TermsModal from '../components/TermsModal';
import type { ScreenProps } from '../ts/screenConf/screenProps';
import { useModal } from "../context/ModalContext";

type OAuthTermsScreenProps = ScreenProps & {
    pendingToken: string;
    setGlobalUser: (user: string) => void;
};

const OAuthTermsScreen = ({ dispatch, pendingToken, setGlobalUser }: OAuthTermsScreenProps) => {
    const { t } = useTranslation();
    const [acceptPolicy, setAcceptPolicy] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const { showModal } = useModal();

    // Keyboard shortcuts: Enter → accept, Escape → back
    // Only fire when no modal is open (modals handle Escape themselves)
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (showTermsModal || showPrivacyModal) return;
            if (e.key === 'Enter') handleAccept();
            if (e.key === 'Escape') handleCancel();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [acceptPolicy, showTermsModal, showPrivacyModal]);

    const handleAccept = async () => {
        if (!acceptPolicy) {
            setError(t('errors.mustAcceptTerms'));
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/auth/oauth-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pendingToken }),
            });

            const result = await response.json();

            if (!result.ok) {
                showModal({
                    title: t('error'),
                    message: t(result.msg),
                    type: 'error',
                });
                //setError(t(result.msg) || t('errors.unknownError'));
                dispatch({ type: 'LOGIN' });
                return;
            }

            // Same handling as a normal ?token= in App.tsx
            const token = result.token;
            const payload = JSON.parse(atob(token.split('.')[1]));
            localStorage.setItem('pong_user_nick', payload.nick);
            localStorage.setItem('pong_user_id', String(payload.sub));
            localStorage.setItem('pong_token', token);
            setGlobalUser(payload.nick);
            dispatch({ type: 'MENU' });

        } catch {
            setError(t('errors.connectionError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        // Token expired or user declined → back to login
        dispatch({ type: 'LOGIN' });
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh] !p-4">
            
            {/* Contenedor Principal (Estilo PONG Premium) */}
            <div className="!w-full !max-w-2xl !p-10 !bg-[#111827] !border-2 !border-orange-600 !rounded-3xl !shadow-[0_0_30px_rgba(234,88,12,0.5)] flex flex-col gap-6">

                {/* Cabecera */}
                <div className="text-center border-b border-orange-600/30 pb-5">
                    <h1 className="!m-0 !text-3xl !font-extrabold !text-white !tracking-wider !uppercase !leading-tight">
                        {t('oauth_terms.title')}
                    </h1>
                </div>

                {/* Subtítulo */}
                <p className="!text-gray-300 !text-base !leading-loose !tracking-wide !text-center !m-0">
                    {t('oauth_terms.subtitle')}
                </p>

                {/* Mensaje de Error (Si lo hay) */}
                {error && (
                    <div className="!bg-red-900/40 !border !border-red-500 !text-red-200 !px-4 !py-3 !rounded-xl text-center font-bold">
                        {error}
                    </div>
                )}

                {/* Zona del Checkbox (Destacada sutilmente) */}
                <div className="!bg-black/40 !p-5 !rounded-xl !border !border-gray-700/50 flex flex-row items-center !gap-4">
                    <input
                        className="!w-5 !h-5 !cursor-pointer accent-orange-600"
                        id="acceptPolicy"
                        type="checkbox"
                        checked={acceptPolicy}
                        onChange={(e) => setAcceptPolicy(e.target.checked)}
                    />
                    <label htmlFor="acceptPolicy" className="!text-gray-200 !text-sm !leading-relaxed !cursor-pointer !m-0">
                        {t('privacy.prefix')}{' '}
                        <a href="#" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="!text-orange-400 hover:!text-orange-300 !transition-colors !underline">
                            <b>{t('info.terms_of_service')}</b>
                        </a>
                        {' '}{t('privacy.and')}{' '}
                        <a href="#" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }} className="!text-orange-400 hover:!text-orange-300 !transition-colors !underline">
                            <b>{t('info.privacy_policy')}</b>
                        </a>
                        {t('privacy.dot')}
                    </label>
                </div>

                {/* Botones (Gemelos Premium) */}
                <div className="!pt-4 flex flex-row justify-center !gap-6">
                    <button 
                        type="button" 
                        onClick={handleCancel}
                        className="!px-10 !py-3.5 !min-w-[180px] !rounded-full !bg-gray-700/50 hover:!bg-gray-600 !text-white !font-bold !text-sm !uppercase !tracking-wider !transition-colors !border !border-gray-600 !m-0"
                    >
                        {t('volver')}
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={handleAccept} 
                        disabled={isLoading}
                        // Lógica de colores: Si está cargando o no ha marcado la casilla, se ve apagado. Si está listo, brilla en naranja.
                        className={`!px-10 !py-3.5 !min-w-[180px] !rounded-full !text-white !font-extrabold !text-sm !uppercase !tracking-wider !transition-all !m-0 !border-none ${
                            isLoading || !acceptPolicy 
                            ? '!bg-orange-900/50 !cursor-not-allowed !text-gray-400' 
                            : '!bg-orange-600 hover:!bg-orange-700 hover:scale-105 !shadow-lg !shadow-orange-600/30'
                        }`}
                    >
                        {isLoading ? t('enviando') : t('oauth_terms.confirm_btn')}
                    </button>
                </div>

                {/* Modales de Políticas */}
                <TermsModal
                    isOpen={showTermsModal}
                    onClose={() => setShowTermsModal(false)}
                    title={t('info.terms_of_service')}
                    fileName="terms"
                />
                <TermsModal
                    isOpen={showPrivacyModal}
                    onClose={() => setShowPrivacyModal(false)}
                    title={t('info.privacy_policy')}
                    fileName="privacy"
                />
            </div>
        </div>
    );
};

export default OAuthTermsScreen;