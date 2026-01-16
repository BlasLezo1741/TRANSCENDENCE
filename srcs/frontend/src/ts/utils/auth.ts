// Base de datos simulada

// srcs/frontend/src/ts/utils/auth.ts

export function checkPassword(password: string, repeat: string) {
    const lower = /[a-z]/;
    const upper = /[A-Z]/;
    const digit = /[0-9]/;
    const min = /^.{8,100}$/;

    if (!lower.test(password)) return { ok: false, msg: "La contraseña no tiene minusculas" };
    if (!upper.test(password)) return { ok: false, msg: "La contraseña no tiene mayusculas" };
    if (!digit.test(password)) return { ok: false, msg: "La contraseña no tiene numeros" };
    if (!min.test(password)) return { ok: false, msg: "La contraseña ha de tener de 8 a 100 caracteres" };
    if (password !== repeat) return { ok: false, msg: "Las contraseñas son diferentes" };
    
    return { ok: true, msg: "Contraseña válida" };
}

// UPDATE: Added 'language' argument
export async function registUser(user: string, pass: string, email: string, birth: string, country: string, language: string) {
    try {
        const response = await fetch('http://localhost:3000/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Send both country and language
            body: JSON.stringify({ user, pass, email, birth, country, language })
        });
        
        return await response.json(); 
    } catch (e) {
        console.error("Registration Error:", e);
        return { ok: false, msg: "Error de conexión con el servidor" };
    }
}

export async function checkLogin(user: string, pass: string) {
    try {
        const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, pass })
        });
        
        return await response.json(); 
    } catch (e) {
        console.error("Login Error:", e);
        return { ok: false, msg: "Error de conexión con el servidor" };
    }
}
