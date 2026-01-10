import React, { useState } from "react";
import { checkPassword, registUser } from "../ts/utils/auth"
import type { ScreenProps } from "../ts/screenConf/screenProps";

const SignScreen = ({ dispatch }: ScreenProps) =>
{
    const [user, setUser] = useState("");
    const [password, setPassword] = useState("");
    const [repeat, setRepeat] = useState("");
    const [email, setEmail] = useState("");
    const [birth, setBirth] = useState("");
    const [country, setCountry] = useState("");
    // Tiempo de registro, status("connected"), role("user")
    const [error, setError] = useState("");

    const handleForm = (e: React.FormEvent) =>
    {
        e.preventDefault();
        setError("");

        // Check syntaxis of the password
        const result = checkPassword(password, repeat);
        if (!result.ok)
        {
            setError(result.msg);
            setPassword("");
            setRepeat("");
            return;
        }

        // Check registration
        if (registUser(user, password, email, birth, country))
        {
            setError("Failed registration");
            setPassword("");
            setRepeat("");
            return ;
        }

        dispatch({type: "MENU"});
    }

    const handleReset = () =>
    {
        setUser("");
        setPassword("");
        setRepeat("");
        setEmail("");
        setBirth("");
        setCountry("");
        setError("");
    }

    return (
        <div>
            <h1>Sign In</h1>
            <form onSubmit={handleForm}>
                
                {/* Error message */}

                {error && <p>{error}</p>}
                
                {/* User */}

                <div>
                    <label htmlFor="user">Usuario</label>
                    <input
                        type="text"
                        id="user"
                        name="user"
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                        pattern="[a-zA-Z0-9_]{3,20}"
                        title="Nombre de usuario"
                        required
                        autoFocus
                    />
                </div>

                {/* Email */}

                <div>
                    <label htmlFor="email">Correo electronico</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        pattern="[a-zA-Z0-9_]+([.][a-zA-Z0-9_]+)*@[a-zA-Z0-9_]+([.][a-zA-Z0-9_]+)*[.][a-zA-Z]{2,9}"
                        title="Correo electronico"
                        required
                    />
                </div>

                {/* Password */}

                <p>La password tiene que tener una minuscula, una majusula, un numero y un minimo de 8 caracteres</p>

                <div>
                    <label htmlFor="pass">Contraseña</label>
                    <input
                        type="password"
                        id="pass"
                        name="pass"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        pattern=".{8,}"
                        title="Contraseña"
                        required
                    />
                </div>

                {/* Repeat password */}

                <div>
                    <label htmlFor="passR">Repetir contraseña</label>
                    <input
                        type="password"
                        id="passR"
                        name="passR"
                        value={repeat}
                        onChange={(e) => setRepeat(e.target.value)}
                        pattern=".{8,}"
                        title="Repetir contraseña"
                        required
                    />
                </div>

                {/* Birth date */}

                <div>
                    <label htmlFor="birth">Fecha de nacimiento</label>
                    <input 
                        type="date"
                        name="birth"
                        id="birth"
                        value={birth}
                        onChange={(e) => setBirth(e.target.value)}
                        title="Fecha de nacimiento"
                        required
                    />
                </div>

                {/* Country */}

                <div>
                    <label htmlFor="lang">Idioma</label>
                    <select
                        name="lang"
                        id="lang"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        title="Seleccionar pais"
                        required>
                            <option value="">Elige un idioma</option>
                            <option value="es">Español</option>
                            <option value="ca">Català</option>
                            <option value="en">English</option>
                            <option value="fr">Français</option>
                    </select>
                </div>

                <button type="buton" onClick={handleReset}>Borrar</button>
                <button type="submit">Enviar</button>

            </form>
        </div>
    );
};

export default SignScreen;