import { checkLogin, send2FACode } from "../ts/utils/auth";
import React, { useState, useEffect } from "react";
import type { ScreenProps } from "../ts/screenConf/screenProps";
import { useTranslation } from 'react-i18next';

import "../css/Login.css";

// Add prop for global state update
type LoginScreenProps = ScreenProps & {
    setGlobalUser: (user: string) => void;
};

const LoginScreen = ({ dispatch, setGlobalUser }: LoginScreenProps) => {
    const { t } = useTranslation();
    const [user, setUser] = useState("");
    const [password, setPassword] = useState("");
    const [totpCode, setTotpCode] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showTotpInput, setShowTotpInput] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);

/*     // ==================== 1. HANDLE OAUTH REDIRECT ====================
       //==================== OAuth is now handled in App.tsx ====================
    useEffect(() => {
        // Check URL for ?token=...
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (token) {
            try {
                // Manually decode JWT payload to get user info
                // (This avoids installing 'jwt-decode' library for now)
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                const payload = JSON.parse(jsonPayload); // { sub: 1, nick: 'foo', ... }

                // 1. Save data
                localStorage.setItem("jwt_token", token);
                localStorage.setItem("pong_user_nick", payload.nick);
                localStorage.setItem("pong_user_id", payload.sub.toString());

                // 2. Update Global State
                setGlobalUser(payload.nick);
                console.log("🔓 OAuth Login successful:", payload.nick);

                // 3. Clean URL (remove token)
                window.history.replaceState({}, document.title, window.location.pathname);

                // 4. Redirect to Menu
                dispatch({ type: "MENU" });

            } catch (err) {
                console.error("Error processing token:", err);
                setError("Error validando el inicio de sesión OAuth");
            }
        }
    }, [dispatch, setGlobalUser]);
 */
    // ==================== 2. HANDLE FORM LOGIN ====================
    const handleForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try 
        {
            if (showTotpInput) {
                // Aquí deberías llamar a una función que verifique el código TOTP
                // Por ejemplo: const result = await verifyTOTP(userId, totpCode);
                
                // Por ahora, simulamos la verificación
                // TODO: Implementar verifyTOTP
                const result = await send2FACode(userId, totpCode);

                
                if (!result.ok) {
                    setError("Código 2FA incorrecto");
                    setTotpCode("");
                    return;
                } else {    
                
                // Si la verificación es exitosa:
                localStorage.setItem("pong_user_nick", user);
                localStorage.setItem("pong_user_id", userId!.toString());
                localStorage.setItem("pong_token", result.token); // ✅ SAVE THE TOKEN!
                setGlobalUser(user);
                dispatch({ type: "MENU" });
                }
            } else {
                // AWAIT the backend response
                const result = await checkLogin(user, password);   
                if (!result.ok) {
                    setError(result.msg || "Error desconocido");
                    setPassword("");
                } else {
                    if (result.user.totp) {
                        // 2FA enabled, mostrar input de TOTP
                        setShowTotpInput(true);
                        setUserId(result.user.id);
                        setPassword(""); // Limpiar contraseña por seguridad
                    } else {
                        // 1. Guardamos en LocalStorage para que persista al refrescar
                        localStorage.setItem("pong_user_nick", result.user.name);
                        localStorage.setItem("pong_user_id", result.user.id.toString());
                        localStorage.setItem("pong_token", result.token); // ✅ SAVE THE TOKEN!

                        // 2. Actualizamos el estado global en App.tsx
                        setGlobalUser(result.user.name);
                        
                        // 3. Wait a tiny bit to ensure localStorage is flushed, then go to menu
                        await new Promise(resolve => setTimeout(resolve, 10));
                        dispatch({ type: "MENU" });
                    } //else no 2FA
                } //
            } //showTotpInput

        } catch (err) {
            setError("Error de conexión");
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
        window.location.href = `http://localhost:3000/auth/${provider}`;
    };
/*
    return (
        <div className="registro">
            <h1>{t('bienvenido')}</h1>

            <form onSubmit={handleForm} className="login">
                
                <label htmlFor="user">{t('user')}</label>
                <input
                    type="text"
                    id="user"
                    name="user"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    pattern="[\x21-\x7E]+"
                    required
                    autoFocus
                />

                
                <label htmlFor="pass">
                    {t('password').charAt(0).toUpperCase() + t('password').slice(1)}
                </label>
                <input
                    type="password"
                    id="pass"
                    name="pass"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button type="submit" disabled={isLoading}>
                    {isLoading ? t('enviando') : t('enviar')}
                </button>

                
                { error && ( <span className="error-msg">{error}</span> )}
            </form>

            <div className="no-login">
                <p>
                    {t('cuenta?')}{" "}
                </p>
                <button onClick={(e) => {
                        e.preventDefault();
                        dispatch({ type: "SIGN" });
                    }}>
                    {t('crear_cuenta')}
                </button>
            </div>
        </div>
    );
*/
     return (
        <div>
            <div>
                <h1 className="text-3xl font-bold text-gray-900">
                    {showTotpInput ? t('veri_2fa') || 'Verificación 2FA' : t('bienvenido')}
                </h1>
                
                {showTotpInput && (
                    <p className="text-gray-500 mt-2">
                        {t('ingresa_codigo_2fa') || 'Ingresa el código de tu aplicación de autenticación'}
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
                            <label htmlFor="user">
                                {t('user')}
                            </label>
                            <input
                                type="text"
                                id="user"
                                name="user"
                                value={user}
                                onChange={(e) => setUser(e.target.value)}
                                pattern="[\x21-\x7E]+"
                                required
                                autoFocus
                            />
                        </div>

                        
                        <div className="login-elem">
                            <label htmlFor="pass">
                                {t('password').charAt(0).toUpperCase() + t('password').slice(1)}
                            </label>
                            <input
                                type="password"
                                id="pass"
                                name="pass"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                ):(
                    <div>
                        <label htmlFor="totp">
                            {t('cod_2fa') || 'Código de autenticación'}
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
                            maxLength={8} // Permitir hasta 8 caracteres para códigos de respaldo Alfanumericos (6 para TOTP numérico)
                            pattern="(\d{6}|[A-Z0-9]{8})" // 6 dígitos O 8 alfanuméricos
                            placeholder={(t('placeholder') || '123456 o ABCD1234')}
                            title={t('qr_setup1') ?? 'Ingresa 6 dígitos numéricos o 8 caracteres alfanuméricos'}                                    
                            required
                            autoFocus
                        />
                    </div>
                )}

                <div className="login-btn form-btn">
                    <button
                    type="button"
                    onClick={handleBack}>
                        {t('volver') || 'Volver'}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}>
                        {isLoading ? t('enviando') : (showTotpInput ? (t('verificar') || 'Verificar código 2FA') : t('enviar'))}
                    </button>
                </div>

                <hr />
                           
                {!showTotpInput ?  (
                <div className="login-elem">
                    <span style={{color: "black"}}>{t('init_ses')}</span>

                    <div className="login-btn">
                        <button
                            type="button"
                            onClick={() => handleOAuth('42')}                            >
                            <span>42 Network</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleOAuth('google')}                            >
                            Google
                        </button>
                    </div>

                    <div className="account login-elem">
                        <p>
                            {t('cuenta?')}{" "}
                        </p>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                dispatch({ type: "SIGN" });
                            }}>
                            {t('crear_cuenta')}
                        </button>
                    </div>
                </div>
                ) : null}
            </form>
            
        </div>
    );
};

export default LoginScreen;