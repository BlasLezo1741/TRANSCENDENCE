import React, { useState } from "react";
import { checkSyntax, checkLogin } from "../ts/utils/check"
import type { ScreenProps } from "../ts/screenConf/screenProps";

const SignScreen = ({ dispatch }: ScreenProps) =>
{
    const [user, setUser] = useState("");
    const [password, setPassword] = useState("");
    // Password repetida
    // Email
    // Birth date
    // Country
    // Tiempo de registro, status("connected"), role("user")
    const [error, setError] = useState("");

    const handleForm = (e: React.FormEvent) =>
    {
        e.preventDefault();
        setError("");

        // Check syntaxis
        if (!checkSyntax(password))
        {
            setError("La password debe de tener una majuscula, una minuscula y un numero");
            setPassword("");
            return;
        }

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
        </div>
    );
};

export default SignScreen;