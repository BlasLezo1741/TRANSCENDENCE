import { checkLogin, send2FACode } from "../../ts/utils/auth";
import React, { useState, useEffect } from "react";
import type { ScreenProps } from "../../ts/screenConf/screenProps";
import { useTranslation } from 'react-i18next';
import Input from '../objects/Input.tsx';
import Label from '../objects/Label.tsx';
import Btn from '../objects/Btn.tsx';

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

    // Display any error forwarded from the OAuth callback (e.g. email conflict)
    useEffect(() => {
        if (oauthError) {
            setError(t(oauthError));
            clearOAuthError?.();
        }
    }, [oauthError]);
    const [isLoading, setIsLoading] = useState(false);
    const [showTotpInput, setShowTotpInput] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);

     // ==================== 2. HANDLE FORM LOGIN ====================
    const handleForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try 
        {
            if (showTotpInput) {
                const result = await send2FACode(userId, totpCode);
                if (!result.ok) {
                    setError(t('errors.invalid2faCode'));
                    setTotpCode("");
                    return;
                } else {
                // If verification is successful
                localStorage.setItem("pong_user_nick", user);
                localStorage.setItem("pong_user_id", userId!.toString());
                localStorage.setItem("pong_token", result.token); //SAVE THE TOKEN!
                setGlobalUser(user);
                dispatch({ type: "MENU" });
                }
            } else {
                // AWAIT the backend response
                const result = await checkLogin(user, password);   
                if (!result.ok) {
                    setError(t(result.msg) || t('error.unknownError'));
                    setPassword("");
                } else {
                    if (result.user.totp) {
                        // 2FA enabled, show TOTP input
                        setShowTotpInput(true);
                        setUserId(result.user.id);
                        setPassword(""); // Clear password for security
                    } else {
                        // 1. We save in LocalStorage so it persists on refresh
                        localStorage.setItem("pong_user_nick", result.user.name);
                        localStorage.setItem("pong_user_id", result.user.id.toString());
                        localStorage.setItem("pong_token", result.token); // SAVE THE TOKEN!

                        // 2. We update the global state in App.tsx
                        setGlobalUser(result.user.name);
                        
                        // 3. Wait a tiny bit to ensure localStorage is flushed, then go to menu
                        await new Promise(resolve => setTimeout(resolve, 10));
                        dispatch({ type: "MENU" });
                    } //else no 2FA
                } //
            } //showTotpInput

        } catch (err) {
            setError(t('errors.connectionError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        setShowTotpInput(false);
        setTotpCode("");
        setPassword("");
        setUserId(null);
    }
    // ==================== 3. OAUTH ACTIONS ====================
    const handleOAuth = (provider: 'google' | '42') => {
        // Redirect browser to Backend Auth Endpoint
        // Ensure this matches your backend port (usually 3000)
       // window.location.href = `http://localhost:3000/auth/${provider}`;
       window.location.href = `/auth/${provider}`; //para nginx
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
            
            <form onSubmit={handleForm} className="login-form">
                {error && (
                    <div>
                        <span style={{color: "red"}}>{error}</span>
                    </div>
                )}  

                {!showTotpInput ?  (
                    <div className="login-elem">      
                        <div className="login-elem">
                            <Label
                                htmlFor="user"
                                children={t('user')}
                            />
                            <Input
                                id="user"
                                value={user}
                                onChange={setUser}
                                pattern="[\x21-\x7E]+"
                                autoFocus
                                required
                            />
                        </div>

                        
                        <div className="login-elem">
                            <Label
                                htmlFor="pass"
                                children={t('password').charAt(0).toUpperCase() + t('password').slice(1)}
                            />
                            <Input
                                id="pass"
                                type="password"
                                value={password}
                                onChange={setPassword}
                                required
                            />
                        </div>
                    </div>
                ):(
                    <div>
                        <Label
                            htmlFor="totp"
                            children={t('cod_2fa')}
                        />
                        <Input
                            id="totp"
                            value={totpCode}
                            onChange={(val) => setTotpCode(val.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                            maxLength={8}
                            required
                            pattern="(\d{6}|[A-Z0-9]{8})"
                            placeholder={(t('placeholder'))}
                            title={t('2fa_setup')}
                            autoFocus
                        />
                        {/* <input
                            type="text"
                            id="totp"
                            name="totp"
                            value={totpCode}
                            onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                const filtered = value.replace(/[^A-Z0-9]/g, '');
                                setTotpCode(filtered);
                            }}
                            maxLength={8} // Allow up to 8 characters for Alphanumeric backup codes (6 for numeric TOTP)
                            pattern="(\d{6}|[A-Z0-9]{8})" // 6 digits OR 8 alphanumeric
                            placeholder={(t('placeholder'))}
                            title={t('2fa_setup')}                                    
                            required
                            autoFocus
                        /> */}
                    </div>
                )}

                <div className="login-btn form-btn">
                    <Btn msg={t('volver')} className="return" onClick={handleBack}/>
                    <Btn
                        msg={isLoading ? t('enviando') : (showTotpInput ? (t('verificar')) : t('enviar'))} 
                        className="sent" 
                        type="submit" 
                        disabled={isLoading}/>
                </div>

                <hr />
                           
                {!showTotpInput ?  (
                <div className="login-elem">
                    <span style={{color: "black"}}>{t('init_ses')}</span>

                    <div className="login-btn">
                        <Btn onClick={() => handleOAuth('42')} msg="42 Network"/>
                        <Btn onClick={() => handleOAuth('google')} msg="Google"/>
                    </div>

                    <div className="account login-elem">
                        <p>
                            {t('cuenta?')}{" "}
                        </p>
                        <Btn onClick={() =>dispatch({type: "SIGN"})} msg={t('crear_cuenta')} type="button" />
                    </div>
                </div>
                ) : null}
            </form>
        </div>
    );
};

export default LoginScreen;