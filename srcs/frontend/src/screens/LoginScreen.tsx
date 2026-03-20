import { checkLogin, send2FACode } from "../ts/utils/auth";
import React, { useState, useEffect } from "react";
import type { ScreenProps } from "../ts/screenConf/screenProps";
import { useTranslation } from 'react-i18next';

// Add prop for global state update
type LoginScreenProps = ScreenProps & {
    setGlobalUser: (user: string) => void;
    oauthError?: string;
    clearOAuthError?: () => void;
};

const LoginScreen = ({ dispatch, setGlobalUser, oauthError, clearOAuthError }: LoginScreenProps) => {
    const { t } = useTranslation();
    const [user, setUser] = useState("");
    const [password, setPassword] = useState("");
    const [totpCode, setTotpCode] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showTotpInput, setShowTotpInput] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);

    // Display any error forwarded from the OAuth callback (e.g. email conflict)
    useEffect(() => {
        if (oauthError) {
            setError(t(oauthError));
            clearOAuthError?.();
        }
    }, [oauthError, t, clearOAuthError]);

    // ==================== 2. HANDLE FORM LOGIN ====================
    const handleForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // CUSTOM VALIDATION - Check if fields are filled
        if (!showTotpInput) {
            const trimmedUser = user.trim();
            const trimmedPassword = password.trim();

            if (!trimmedUser) {
                setError(t('errors.userRequired'));
                return;
            }
            if (!trimmedPassword) {
                setError(t('errors.passwordRequired'));
                return;
            }

            setIsLoading(true);

            try {
                const result = await checkLogin(trimmedUser, trimmedPassword);
                if (!result.ok) {
                    setError(t(result.msg) || t('errors.unknownError'));
                    setPassword("");
                    return;
                } else {
                    if (result.user.totp) {
                        // 2FA enabled, show TOTP input
                        setShowTotpInput(true);
                        setUserId(result.user.id);
                        setPassword("");
                    } else {
                        localStorage.setItem("pong_user_nick", result.user.name);
                        localStorage.setItem("pong_user_id", result.user.id.toString());
                        localStorage.setItem("pong_token", result.token);
                        setGlobalUser(result.user.name);
                        await new Promise(resolve => setTimeout(resolve, 10));
                        dispatch({ type: "MENU" });
                    }
                }
            } catch (err) {
                setError(t('errors.connectionError'));
            } finally {
                setIsLoading(false);
            }

        } else {
            if (!totpCode.trim()) {
                setError(t('errors.codeRequired'));
                return;
            }

            setIsLoading(true);

            try {
                // Check if userId exists before sending 2FA code
                if (!userId) {
                    setError(t('errors.unknownError'));
                    return;
                }
                const result = await send2FACode(userId, totpCode);
                if (!result.ok) {
                    setError(t('errors.invalid2faCode'));
                    setTotpCode("");
                    return;
                } else {
                    // If verification is successful
                    localStorage.setItem("pong_user_nick", user);
                    localStorage.setItem("pong_user_id", userId.toString());
                    localStorage.setItem("pong_token", result.token);
                    setGlobalUser(user);
                    dispatch({ type: "MENU" });
                }
            } catch (err) {
                setError(t('errors.connectionError'));
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleBack = () => {
        setShowTotpInput(false);
        setTotpCode("");
        setPassword("");
        setUser("");
        setUserId(null);
        setError(""); // Clear error when going back
    }

    const handleOAuth = (provider: 'google' | '42') => {
        window.location.href = `/auth/${provider}`;
    };

    return (
        <div>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">
                    {showTotpInput ? t('veri_2fa') : t('bienvenido')}
                </h1>
                
                {showTotpInput && (
                    <p className="text-gray-500 mt-2">
                        {t('ingresa_codigo_2fa')}
                    </p>
                )}
            </div>
            
            <form className="form" onSubmit={handleForm} noValidate>
                {/* ↑ Add noValidate to disable browser validation */}
                
                {error && (
                    <span className="text-red-500">{error}</span>
                )}

                {!showTotpInput ? (
                    <>
                        <label className="label-black" htmlFor="user">
                            {t('user')}
                        </label>
                        <input
                            type="text"
                            id="user"
                            name="user"
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            onBlur={(e) => setUser(e.target.value.trim())}
                            pattern="[\x21-\x7E]+"
                            autoFocus
                            className="input-black"
                            // Remove 'required' attribute
                        />

                        <label className="label-black" htmlFor="pass">
                            {t('password').charAt(0).toUpperCase() + t('password').slice(1)}
                        </label>
                        <input
                            type="password"
                            id="pass"
                            name="pass"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={(e) => setPassword(e.target.value.trim())}
                            className="input-black"
                            // Remove 'required' attribute
                        />
                    </>
                ) : (
                    <>
                        <label className="label-black" htmlFor="totp">
                            {t('cod_2fa')}
                        </label>
                        <input
                            type="text"
                            id="totp"
                            name="totp"
                            value={totpCode}
                            onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                const filtered = value.replace(/[^A-Z0-9]/g, '');
                                setTotpCode(filtered);
                            }}
                            maxLength={8}
                            pattern="(\d{6}|[A-Z0-9]{8})"
                            placeholder={t('placeholder')}
                            title={t('2fa_setup')}
                            autoFocus
                            className="input-black"
                            // Remove 'required' attribute
                        />
                    </>
                )}

                <div className="flex flex-col gap-1">
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="btn bg-gray-200 text-gray-800 hover:bg-gray-300">
                            {t('volver')}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50">
                            {isLoading ? t('enviando') : (showTotpInput ? t('verificar') : t('enviar'))}
                        </button>
                    </div>

                    <hr />
                </div>
               
                           
                {!showTotpInput && (
                    <div className="flex-col">
                        <span className="text-black">{t('init_ses')}</span>

                        <div className="flex flex-row gap-2">
                            <button
                                type="button"
                                onClick={() => handleOAuth('42')}
                                className="btn bg-black text-white hover:bg-gray-800">
                                42 Network
                            </button>

                            <button
                                type="button"
                                onClick={() => handleOAuth('google')}
                                className="btn bg-red-500 text-white hover:bg-red-600">
                                Google
                            </button>
                        </div>

                        <div className="text-black mb-1 flex-col">
                            <p>
                                {t('cuenta?')}{" "}
                            </p>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    dispatch({ type: "SIGN" });
                                }}
                                className="btn text-blue-500 hover:text-blue-600 underline">
                                {t('crear_cuenta')}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default LoginScreen;