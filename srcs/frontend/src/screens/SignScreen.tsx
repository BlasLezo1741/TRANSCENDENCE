import React, { useState } from "react";
import { checkPassword, registUser } from "../ts/utils/auth";
import type { ScreenProps } from "../ts/screenConf/screenProps";

const SignScreen = ({ dispatch }: ScreenProps) => {
    const [user, setUser] = useState("");
    const [password, setPassword] = useState("");
    const [repeat, setRepeat] = useState("");
    const [email, setEmail] = useState("");
    const [birth, setBirth] = useState("");
    const [country, setCountry] = useState("");
    const [error, setError] = useState("");

    const handleForm = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Check syntaxis of the password
        const result = checkPassword(password, repeat);
        if (!result.ok) {
            setError(result.msg);
            setPassword("");
            setRepeat("");
            return;
        }

        // Check registration
        if (registUser(user, password, email, birth, country)) {
            // Note: Your logic in auth.ts returns TRUE for registration, 
            // but the original code treated true as "Failed registration".
            // Assuming registUser returns true on SUCCESS, this logic might need inversion later.
            // For now, I kept your original logic flow.
            setError("Failed registration");
            setPassword("");
            setRepeat("");
            return;
        }

        dispatch({ type: "MENU" });
    };

    const handleReset = () => {
        setUser("");
        setPassword("");
        setRepeat("");
        setEmail("");
        setBirth("");
        setCountry("");
        setError("");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Crear Cuenta</h1>
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
                        <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                        <input
                            type="text"
                            id="user"
                            name="user"
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            pattern="[a-zA-Z0-9_]{3,20}"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Password Info Box */}
                    <div className="bg-blue-50 p-3 rounded text-xs text-blue-800">
                        La contraseña debe tener: minúscula, mayúscula, número y mínimo 8 caracteres.
                    </div>

                    {/* Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="pass" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                            <input
                                type="password"
                                id="pass"
                                name="pass"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {/* Repeat Password */}
                        <div>
                            <label htmlFor="passR" className="block text-sm font-medium text-gray-700 mb-1">Repetir</label>
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
                        <label htmlFor="birth" className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
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

                    {/* Country */}
                    <div>
                        <label htmlFor="lang" className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                        <select
                            name="lang"
                            id="lang"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Elige un idioma</option>
                            <option value="es">Español</option>
                            <option value="ca">Català</option>
                            <option value="en">English</option>
                            <option value="fr">Français</option>
                        </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Borrar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Enviar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SignScreen;