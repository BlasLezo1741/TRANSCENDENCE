import React, { useState, useEffect } from "react";
import { checkLogin } from "../ts/utils/auth";
import type { ScreenProps } from "../ts/screenConf/screenProps";
import { useTranslation } from 'react-i18next';

// Add prop for global state update
type LoginScreenProps = ScreenProps & {
    setGlobalUser: (user: string) => void;
};

const LoginScreen = ({ dispatch, setGlobalUser }: LoginScreenProps) => {
    const { t } = useTranslation();
    const [user, setUser] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // ==================== 1. HANDLE OAUTH REDIRECT ====================
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

    // ==================== 2. HANDLE FORM LOGIN ====================
    const handleForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const result = await checkLogin(user, password);
            
            if (!result.ok) {
                setError(result.msg || "Error desconocido");
                setPassword("");
            } else {
                // Save user data
                localStorage.setItem("pong_user_nick", result.user.name);
                localStorage.setItem("pong_user_id", result.user.id.toString());
                
                // If your backend returns a token for manual login too, save it here:
                // localStorage.setItem("jwt_token", result.token); 

                setGlobalUser(result.user.name);
                dispatch({ type: "MENU" });
            }
        } catch (err) {
            setError("Error de conexión");
        } finally {
            setIsLoading(false);
        }
    };

    // ==================== 3. OAUTH ACTIONS ====================
    const handleOAuth = (provider: 'google' | '42') => {
        // Redirect browser to Backend Auth Endpoint
        // Ensure this matches your backend port (usually 3000)
        window.location.href = `http://localhost:3000/auth/${provider}`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{t('bienvenido')}</h1>
                </div>

                {/* --- MANUAL LOGIN FORM --- */}
                <form onSubmit={handleForm} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    <div>
                        <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">
                            {t('user')}
                        </label>
                        <input
                            type="text"
                            id="user"
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="pass" className="block text-sm font-medium text-gray-700 mb-1">
                            {t('password')}
                        </label>
                        <input
                            type="password"
                            id="pass"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                        ${isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"} 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
                    >
                        {isLoading ? t('enviando') : t('enviar')}
                    </button>
                </form>

                {/* --- DIVIDER --- */}
                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">O inicia sesión con</span>
                        </div>
                    </div>

                    {/* --- OAUTH BUTTONS --- */}
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => handleOAuth('42')}
                            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            <span className="font-bold text-black">42 Network</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleOAuth('google')}
                            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            Google
                        </button>
                    </div>
                </div>

                {/* --- FOOTER --- */}
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