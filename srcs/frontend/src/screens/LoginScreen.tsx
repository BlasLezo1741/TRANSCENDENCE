import React, { useState } from "react";
import { checkLogin } from "../ts/utils/auth"
import type { ScreenProps } from "../ts/screenConf/screenProps";

const LoginScreen = ({ dispatch }: ScreenProps) =>
{
    const [user, setUser] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleForm = (e: React.FormEvent) =>
    {
        e.preventDefault();
        setError("");

        // Check login
        const result = checkLogin(user, password);
        if (!result.ok)
        {
            setError(result.msg);
            setPassword("");
            return ;
        }

        dispatch({type: "MENU"});
    }

    return (
        <div>
            <h1>Login</h1>
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
                        pattern="[\x21-\x7E]+"
                        title="Nombre de usuario"
                        required
                        autoFocus
                    />
                </div>

                {/* Password */}

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

                <button type="submit">Enviar</button>

            </form>
            <a href="#" onClick={(e) => {
                e.preventDefault(); dispatch({ type: "SIGN" });
            }}>
                No tenies cuenta? Se tu propio jefe
            </a>
        </div>
    );
};

export default LoginScreen;