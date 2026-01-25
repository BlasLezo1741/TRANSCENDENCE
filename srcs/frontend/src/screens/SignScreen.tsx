import React, { useState, useEffect } from "react";
import { checkPassword, registUser } from "../ts/utils/auth";
import type { ScreenProps } from "../ts/screenConf/screenProps";
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react'; // Importamos el generador de QR

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

        // 1. Check local password syntax
        console.error('Verifico el Password');
        const passResult = checkPassword(password, repeat);
        if (!passResult.ok) {
            setError(passResult.msg);
            setPassword("");
            setRepeat("");
            return;
        }
        console.error('El Password se ha validado');
        setIsLoading(true);

        try {
            // 2. Check backend registration
            // We now pass BOTH country and language separately
            console.error('Intento de registro');
            const result = await registUser(user, password, email, birth, country, language, enabled2FA);
            
            if (!result.ok) {
                setError(result.msg || "Error en el registro");
                setPassword("");
                setRepeat("");
            } else {
                setSuccess(result.msg || "¡Registro completado con éxito!");
                // If 2FA is enabled, set the QR code
                if (enabled2FA && result.qrCode) {
                    setQrCode(result.qrCode);
                }
                //setTimeout(() => dispatch({ type: "MENU" }), 2000); // 2 Seg. de por favor
            }

        } catch (err) {
            setError("Error de conexión");
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
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">{t('crear_cuenta')}</h1>
                </div>

                <form onSubmit={handleForm} className="space-y-4">
                    {/* Error message */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                            {error}
                        </div>
                    )}

                    {/* User */}
                    <div>
                        <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">{t('user')}</label>
                        <input
                            type="text"
                            id="user"
                            name="user"
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            placeholder="ej: Jhon_Wick123"
                            pattern="[a-zA-Z0-9_]{3,20}"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            placeholder="ej: abc@def.com"
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Password Info Box */}
                    <div className="bg-blue-50 p-3 rounded text-xs text-blue-800">
                        {t('pass_req')}
                    </div>

                    {/* Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="pass" className="block text-sm font-medium text-gray-700 mb-1">{t('password').charAt(0).toUpperCase() + t('password').slice(1)}</label>
                            <input
                                type="password"
                                id="pass"
                                name="pass"
                                value={password}
                                placeholder="ej: P@ssw0rd!"
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {/* Repeat Password */}
                        <div>
                            <label htmlFor="passR" className="block text-sm font-medium text-gray-700 mb-1">{t('rep_pass')}</label>
                            <input
                                type="password"
                                id="passR"
                                name="passR"
                                value={repeat}
                                onChange={(e) => setRepeat(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    {/* Birth date */}
                    <div>
                        <label htmlFor="birth" className="block text-sm font-medium text-gray-700 mb-1">{t('cumple')}</label>
                        <input
                            type="date"
                            name="birth"
                            id="birth"
                            value={birth}
                            onChange={(e) => setBirth(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Country & Language Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Country - UPDATED TO DROPDOWN */}
                        <div>
                            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">{t('cod_pais')}</label>
                            <select
                                id="country"
                                name="country"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                disabled={isLoadingCountries}
                            >
                                <option value="">
                                    {isLoadingCountries ? 'Loading...' : t('sel_pais') || 'Select a country...'}
                                </option>
                                {countries.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.name} ({c.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Language */}
                        <div>
                            <label htmlFor="lang" className="block text-sm font-medium text-gray-700 mb-1">{t('lang')}</label>
                            <select
                                name="lang"
                                id="lang"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">{t('sel_lang')}</option>
                                <option value="es">Español</option>
                                <option value="ca">Català</option>
                                <option value="en">English</option>
                                <option value="fr">Français</option>
                            </select>
                        </div>
                    </div>
                    {/* QR Code check box */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label htmlFor="lang" className="block text-sm font-medium text-gray-700 mb-1">{t('enable_2fa')}</label>
                        <label className="flex items-center">
                            <input
                                name="enabled2FA"
                                id="enabled2FA"
                                type="checkbox"
                                checked={enabled2FA}
                                onChange={(e) => setEnabled2FA(e.target.checked)}
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                        </label>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {t('borrar_t')}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                            ${isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"} 
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
                        >
                            {isLoading ? t('enviando') : t('enviar')}
                        </button>
                    </div>
                    {/* CÓDIGO QR (solo si existe) */}
                    {qrCode && (
                        <div style={{ marginTop: '20px' }}>
                            <h3>Escanea tu 2FA:</h3>
                            {/* Reemplazamos <img> por el componente QRCodeSVG */}
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
                                💡 <strong>Importante:</strong> Guarda este código en tu aplicación de autenticación 
                                (Google Authenticator, Authy, etc.) antes de cerrar esta página.
                            </p>
                            

                            {/* --- NUEVO BOTÓN DE CONFIRMACIÓN --- */}
                            <div className="mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        // 1. Opcional: Mostrar un pequeño feedback visual de éxito
                                        setSuccess(t('registro_exitoso') || "¡Configuración de 2FA completada!");
                                        
                                        // 2. Esperar 2 segundos antes de cambiar al menú
                                        setTimeout(() => {
                                            dispatch({ type: "MENU" });
                                        }, 2000);
                                    }}
                                    className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md shadow-lg transition-colors flex items-center justify-center gap-2 animate-bounce-in"
                                >
                                    ✅ {t('ya_escaneado') || "Ya lo he escaneado, ir al menú"}
                                </button>
                            </div>






                        </div>
                    )}
                    {/* Mensajes de Feedback */}
                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4 shadow-sm animate-pulse">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded mb-4 shadow-sm">
                            <p className="font-bold">¡Logrado!</p>
                            <p>{success}</p>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default SignScreen;