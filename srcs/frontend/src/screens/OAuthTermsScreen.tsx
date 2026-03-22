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
                setError(t(result.msg) || t('errors.unknownError'));
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
        <div className="w-[60%] mx-auto p-5 bg-whitesmoke">
            <h1>{t('oauth_terms.title')}</h1>
            <p>{t('oauth_terms.subtitle')}</p>

            {error && <span className="text-red-500">{error}</span>}

            <div className="flex-row my-5">
                <input
                    className="flex-shrink-0"
                    id="acceptPolicy"
                    type="checkbox"
                    checked={acceptPolicy}
                    onChange={(e) => setAcceptPolicy(e.target.checked)}
                />
                <label htmlFor="acceptPolicy">
                    {t('privacy.prefix')}{' '}
                    <a href="#" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}>
                        <u><b>{t('info.terms_of_service')}</b></u>
                    </a>
                    {' '}{t('privacy.and')}{' '}
                    <a href="#" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }}>
                        <u><b>{t('info.privacy_policy')}</b></u>
                    </a>
                    {t('privacy.dot')}
                </label>
            </div>

            <div className="py-5 flex flex-row justify-end">
                <button type="button" onClick={handleCancel}>
                    {t('volver')}
                </button>
                <button type="button" onClick={handleAccept} disabled={isLoading}>
                    {isLoading ? t('enviando') : t('oauth_terms.confirm_btn')}
                </button>
            </div>

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
    );
};

export default OAuthTermsScreen;