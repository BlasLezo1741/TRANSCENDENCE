// Base de datos simulada

// srcs/frontend/src/ts/utils/auth.ts

// Recuperamos la URL del entorno (igual que en socketService)
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export function checkForm(email: string, password: string, repeat: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
        return { ok: false, msg: 'errors.invalidEmail' };

    const lower = /[a-z]/;
    const upper = /[A-Z]/;
    const digit = /[0-9]/;
    const min = /^.{8,100}$/;
    if (!lower.test(password)) return { ok: false, msg: "errors.noLowercasePassword" };
    if (!upper.test(password)) return { ok: false, msg: "errors.noUppercasePassword" };
    if (!digit.test(password)) return { ok: false, msg: "errors.noNumPassword" };
    if (!min.test(password)) return { ok: false, msg: "errors.badLengthPassword" };
    if (password !== repeat) return { ok: false, msg: "errors.noMatchPassword" };
    return { ok: true, msg: "success.password" };
}

export async function registUser(
    user: string, 
    pass: string, 
    email: string, 
    birth: string, 
    country: string, 
    language: string, 
    enabled2FA: boolean) {
    try {
        console.log(`Intento de registro en ${API_URL}/auth/register`);
        console.log(`Datos: ${user}, ${email}, ${birth}, ${country}, ${language}, 2FA: ${enabled2FA}`);
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
                enabled2FA
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

export async function send2FACode(userId: number, totpCode: string) {
    try {
        // Determine the endpoint based on code length
        const endpoint = totpCode.length === 6 
            ? `${API_URL}/auth/verify-totp`
            : `${API_URL}/auth/verify-backup`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, totpCode })
        });

        return await response.json();
    } catch (e) {
        return { ok: false, msg: "Error de conexión" };
    }
}

