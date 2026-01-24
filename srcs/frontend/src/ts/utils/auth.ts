// Base de datos simulada

// srcs/frontend/src/ts/utils/auth.ts

// Recuperamos la URL del entorno (igual que en socketService)
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export function checkPassword(password: string, repeat: string) {
    // ... (Tu código de validación igual que antes) ...
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

export async function registUser(
    user: string, 
    pass: string, 
    email: string, 
    birth: string, 
    country: string, 
    language: string, 
    enable2FA: boolean) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Enviamos nombres claros
            body: JSON.stringify({ 
                username: user, 
                password: pass, 
                email, 
                birth, 
                country, 
                lang: language,
                enable2FA
            })
        });
        return await response.json(); 
    } catch (e) {
        console.error(e);
        return { ok: false, msg: "Error de conexión" };
    }
}

export async function checkLogin(user: string, pass: string) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        return await response.json(); 
    } catch (e) {
        return { ok: false, msg: "Error de conexión" };
    }
}
