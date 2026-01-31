import React, { useState } from "react";
import { checkLogin, send2FACode } from "../ts/utils/auth";
import type { ScreenProps } from "../ts/screenConf/screenProps";
import { useTranslation } from 'react-i18next';

// Añadimos una nueva prop para actualizar el estado padre
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
                console.log("Verificando TOTP:", totpCode, "para usuario:", userId);
                const result = await send2FACode(userId!, totpCode);

                
                if (!result.ok) {
                    setError("Código 2FA incorrecto");
                    setTotpCode("");
                    return;
                } else {    
                
                // Si la verificación es exitosa:
                localStorage.setItem("pong_user_nick", user);
                localStorage.setItem("pong_user_id", userId!.toString());
                setGlobalUser(user);
                console.log("🔓 Login con 2FA exitoso. Usuario global actualizado:", user);
                dispatch({ type: "MENU" });
        }
            } else {
                // AWAIT the backend response
                const result = await checkLogin(user, password);
                console.log("🔓 Este usuario tiene totp:", result.user.totp);                
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

                        //localStorage.setItem("pong_user_id", result.user.id);
                        localStorage.setItem("pong_user_id", result.user.id.toString());

                        // 2. Actualizamos el estado global en App.tsx
                        setGlobalUser(result.user.name);
                        console.log("🔓 Login exitoso. Usuario global actualizado:", result.user.name);
                        
                        // 3. Ir al menú
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
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        {showTotpInput ? t('veri_2fa') || 'Verificación 2FA' : t('bienvenido')}
                    </h1>
                    {showTotpInput && (
                        <p className="text-gray-500 mt-2">
                            {t('ingresa_codigo_2fa') || 'Ingresa el código de tu aplicación de autenticación'}
                        </p>
                    )}
                </div>

                <form onSubmit={handleForm} className="space-y-6">
                    {/* Error message */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    {!showTotpInput ?  (
                        <>
                            {/* User */}
                            <div>
                                <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('user')}
                                </label>
                                <input
                                    type="text"
                                    id="user"
                                    name="user"
                                    value={user}
                                    onChange={(e) => setUser(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    pattern="[\x21-\x7E]+"
                                    required
                                    autoFocus
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="pass" className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('password').charAt(0).toUpperCase() + t('password').slice(1)}
                                </label>
                                <input
                                    type="password"
                                    id="pass"
                                    name="pass"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </>
                    ):(
                        <>
                            {/* TOTP Code Input */}
                            <div>
                                <label htmlFor="totp" className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('cod_2fa') || 'Código de autenticación'}
                                </label>
                                <input
                                    type="text"
                                    id="totp"
                                    name="totp"
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))} // Solo números
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                                    maxLength={6}
                                    pattern="\d{6}"
                                    placeholder="000000"
                                    required
                                    autoFocus
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleBack}
                                className="w-full text-sm text-blue-600 hover:text-blue-500 focus:outline-none underline"
                            >
                                {t('volver') || 'Volver'}
                            </button>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                        ${isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"} 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
                    >
                         {isLoading ? t('enviando') : (showTotpInput ? (t('verificar') || 'Verificar') : t('enviar'))}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        {t('cuenta?')}{" "}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                dispatch({ type: "SIGN" });
                            }}
                            className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none underline"
                        >
                            {t('crear_cuenta')}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;