import React, { useState, useEffect } from "react";
import { checkForm,  registUser } from "../ts/utils/auth";//checkPassword,
import type { ScreenProps } from "../ts/screenConf/screenProps";
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react'; // Importamos el generador de QR

import '../css/Login.css';

interface Country {
    name: string;
    code: string;
}

const SignScreen = ({ dispatch }: ScreenProps) => {
    // USE TRANSLATOR
    const { t } = useTranslation();

    const [user, setUser] = useState("");
    const [password, setPassword] = useState("");
    const [repeat, setRepeat] = useState("");
    const [email, setEmail] = useState("");
    const [birth, setBirth] = useState("");
    
    // SEPARATE STATES
    const [country, setCountry] = useState(""); 
    const [language, setLanguage] = useState("");
    
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // NEW: Countries state
    const [countries, setCountries] = useState<Country[]>([]);
    const [isLoadingCountries, setIsLoadingCountries] = useState(true);

    // NEW: QR Code state
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [enabled2FA, setEnabled2FA] = useState(false);  //Por defecto no se activa
    const [backupCodes, setBackupCodes] = useState<string[] | null>(null);  // Puede ser null inicialmente
    // SHOW OAUTH BUTTONS FLAG
    const [showOAuthButtons, setShowOAuthButtons] = useState(true)  ; // Cambia esto según tus necesidades
    // ===========================================================================

    // NEW: Fetch countries on component mount
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                
                const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
                console.log(`reading  countries from ${API_URL}/countries`);
                const response = await fetch(`${API_URL}/countries`, 
                    {
                        method: 'GET',
                        mode: 'cors', // Asegura que CORS esté habilitado en el backend
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                        // IMPORTANTE: Si usas cookies o sesiones, añade esto:
                        // credentials: 'include' 
                    });
                
                if (response.ok) {
                    const data = await response.json();
                    setCountries(data);
                } else {
                    console.error('Failed to fetch countries');
                }
            } catch (error) {
                console.error('Error fetching countries:¿is it 3000 public', error);
            } finally {
                setIsLoadingCountries(false);
            }
        };

        fetchCountries();
    }, []);
    // ===========================================================================
    // FUNCIONES (handlers)
    // ===========================================================================
    
    const handleForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setQrCode(null);
        setBackupCodes(null);
        setShowOAuthButtons(true); // Show OAuth buttons on form submission    
        // 2. Check local password syntax
        const formResult = checkForm(email, password, repeat);
        if (!formResult.ok) {
            setError(t(formResult.msg));
            setPassword("");
            setRepeat("");
            return;
        }
        setIsLoading(true);

        try {
            // 2. Check backend registration
            // We now pass BOTH country and language separately
            const result = await registUser(user, password, email, birth, country, language, enabled2FA);
            
            if (!result.ok) {
                setError(t(result.msg));
                setPassword("");
                setRepeat("");
            } else {
                setSuccess(t(result.msg));            
                // If 2FA is enabled, set the QR code
                if (enabled2FA && result.qrCode) {
                    setQrCode(result.qrCode);
                    setBackupCodes(result.backupCodes);
                    setShowOAuthButtons(false); // Show OAuth buttons on form submission
                }
                //setTimeout(() => dispatch({ type: "MENU" }), 2000); // 2 Seg. de por favor
            }
        } catch (err) {
            setError(t('errors.connectionError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setUser("");
        setPassword("");
        setRepeat("");
        setEmail("");
        setBirth("");
        setCountry("");
        setLanguage("");
        setError("");
        setQrCode(null);
        setEnabled2FA(false);
        setBackupCodes(null);
        setShowOAuthButtons(true); // Show OAuth buttons on form submission
    };
    const handleOAuth = (provider: 'google' | '42') => {
        // Redirect browser to Backend Auth Endpoint
        // Ensure this matches your backend port (usually 3000)
        window.location.href = `http://localhost:3000/auth/${provider}`;
    };

    return (
        <div>
            <div>
                <h1>{t('crear_cuenta')}</h1>
            </div>

            <form onSubmit={handleForm} className="login-form">
                {/* Error message */}
                {error && (
                    <span style={{color: "red"}}>{error}</span>
                )}

                {/* User */}
                <div className="login-elem">
                    <label htmlFor="user">{t('user')}</label>
                    <input
                        type="text"
                        id="user"
                        name="user"
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                        placeholder="ej: Jhon_Wick123"
                        pattern="[a-zA-Z0-9_]{3,20}"
                        required
                        autoFocus
                    />
                </div>

                {/* Email */}
                <div className="login-elem">
                    <label htmlFor="email">email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        placeholder="ej: abc@def.com"
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                {/* Password Info Box */}
                {/* <div>
                    {t('pass_req')}
                </div> */}

                {/* Password */}
                <div className="login-elem">
                    <label htmlFor="pass" className="block text-sm font-medium text-gray-700 mb-1">{t('password').charAt(0).toUpperCase() + t('password').slice(1)}</label>
                    <input
                        type="password"
                        id="pass"
                        name="pass"
                        value={password}
                        placeholder="ej: P@ssw0rd!"
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {/* Repeat Password */}
                <div className="login-elem">
                    <label htmlFor="passR">{t('rep_pass')}</label>
                    <input
                        type="password"
                        id="passR"
                        name="passR"
                        value={repeat}
                        onChange={(e) => setRepeat(e.target.value)}
                        required
                    />
                </div>

                {/* Birth date */}
                <div className="login-elem">
                    <label htmlFor="birth">{t('cumple')}</label>
                    <input
                        type="date"
                        name="birth"
                        id="birth"
                        value={birth}
                        onChange={(e) => setBirth(e.target.value)}
                        required
                    />
                </div>

                {/* Country & Language Row */}
                <div className="login-elem">
                    {/* Country - UPDATED TO DROPDOWN */}
                    <label htmlFor="country">{t('cod_pais')}</label>
                    <select
                        id="country"
                        name="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        required
                        disabled={isLoadingCountries}>
                        <option value="">
                            {isLoadingCountries ? 'Loading...' : t('sel_pais')}
                        </option>
                        {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.name} ({c.code})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Language */}
                <div className="login-elem">
                    <label htmlFor="lang">{t('lang')}</label>
                    <select
                        name="lang"
                        id="lang"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        required
                    >
                        <option value="">{t('sel_lang')}</option>
                        <option value="es">Español</option>
                        <option value="ca">Català</option>
                        <option value="en">English</option>
                        <option value="fr">Français</option>
                    </select>
                </div>
                
                {/* QR Code check box */}
                <div className="login-btn">
                    <label htmlFor="lang">{t('enable_2fa')}</label>
                    <input
                        style={{marginLeft: "5px"}}
                        name="enabled2FA"
                        id="enabled2FA"
                        type="checkbox"
                        checked={enabled2FA}
                        onChange={(e) => setEnabled2FA(e.target.checked)}
                    />
                </div>
                
                {/* Action Buttons */}
                <div className="login-btn form-btn">
                    <button
                        type="button"
                        onClick={handleReset}>
                        {t('borrar_t')}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        // className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                        // ${isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"} 
                        // focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
                        >
                        {isLoading ? t('enviando') : t('enviar')}
                    </button>
                </div>

                <hr />

                {/* CÓDIGO QR (solo si existe) */}
                {qrCode && (
                    <div style={{ marginTop: '20px' }}>
                        <h3>{t('qr_setup1')}</h3>
                        <div style={{ 
                        background: 'white', 
                        padding: '15px', 
                        display: 'inline-block',
                        borderRadius: '8px' 
                        }}>
                        <QRCodeSVG 
                            value={qrCode} 
                            size={256}
                            level={"H"} // Alta recuperación de errores
                        />
                        </div>        
                        <p style={{ 
                            marginTop: '15px', 
                            fontSize: '14px',
                            maxWidth: '350px',
                            lineHeight: '1.5'
                        }}>
                            💡 <strong>{t('qr_setup2')}</strong> {t('qr_setup3')}
                        </p>
                        
                        {/* --- NUEVO BOTÓN DE CONFIRMACIÓN --- */}
                        <div>
                            <button
                                type="button"
                                onClick={() => {
                                    // 1. Opcional: Mostrar un pequeño feedback visual de éxito
                                    setSuccess(t('registro_exitoso'));
                                    
                                    // 2. Esperar 2 segundos antes de cambiar al menú
                                    setTimeout(() => {
                                        dispatch({ type: "MENU" });
                                    }, 2000);
                                }}
                            >
                                ✅ {t('ya_escaneado')}
                            </button>
                        </div>
                    </div>
                )}
                {backupCodes && backupCodes.length > 0 && (
                <div>
                    <h3>{t('backup_codes')}</h3>
                    <p>{t('copy_codes')}</p>
                    <ul>
                    {backupCodes.map((code, index) => (
                        <li key={index}>{code}</li>
                    ))}
                    </ul>
                </div>
                )}
                {/* Mensajes de Feedback */}
                {/* {error && (
                    <span style={{color: "red"}}>{t('error')}: {error}</span>
                )} */}
                {success && (
                    <div>
                        <p>{success}</p>
                    </div>
                )}
                {/* --- OAUTH BUTTONS --- */}
                {showOAuthButtons && (
                <div className="login-elem">
                    <span style={{color: "black", marginBottom: "5px"}}>{t('crear_cuenta')} / {t('init_ses')}: </span>

                    <div className="login-btn">
                        <button
                            type="button"
                            onClick={() => handleOAuth('42')}>
                            <span>42 Network</span>
                        </button>

                        <button
                                type="button"
                                onClick={() => handleOAuth('google')}>
                                Google
                        </button>
                    </div>
                </div>
                )}
            </form>
        </div>
    );
};

export default SignScreen;