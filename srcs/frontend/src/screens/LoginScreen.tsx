import React, { useState } from "react";
import { checkLogin } from "../ts/utils/auth";
import type { ScreenProps } from "../ts/screenConf/screenProps";

const LoginScreen = ({ dispatch }: ScreenProps) => {
    const [user, setUser] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleForm = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Check login
        const result = checkLogin(user, password);
        if (!result.ok) {
            setError(result.msg);
            setPassword("");
            return;
        }

        dispatch({ type: "MENU" });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Bienvenido</h1>
                    <p className="text-gray-500 mt-2">Inicia sesión en tu cuenta</p>
                </div>

                <form onSubmit={handleForm} className="space-y-6">
                    {/* Error message */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    {/* User */}
                    <div>
                        <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">
                            Usuario
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
                            Contraseña
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

                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Entrar
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        ¿No tienes cuenta?{" "}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                dispatch({ type: "SIGN" });
                            }}
                            className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none underline"
                        >
                            Regístrate aquí
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;