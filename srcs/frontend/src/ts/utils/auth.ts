// Base de datos simulada

// srcs/frontend/src/ts/utils/auth.ts

// Recuperamos la URL del entorno (igual que en socketService)
//const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

interface CheckFormOptions {
    requirePassword?: boolean; // default true
}

export function checkForm(user: string, email: string, password: string, repeat: string, birth: string, options: CheckFormOptions = { requirePassword: true }) {
    
    if (!user || !user.trim())
        return { ok: false, msg: 'errors.userRequired' };

    const userPattern = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!userPattern.test(user.trim())) {
        if (user.trim().length < 3)
            return { ok: false, msg: 'errors.userTooShort' };
        if (user.trim().length > 20)
            return { ok: false, msg: 'errors.userTooLong' };
        return { ok: false, msg: 'errors.userInvalidChars' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
        return { ok: false, msg: 'errors.invalidEmail' };

    const birthDate = new Date(birth);
    const today = new Date();
    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - 150);

    if (!birthDate || isNaN(birthDate.getTime()))
        return { ok: false, msg: 'errors.noBirthDate'};
    if (birthDate > today)
        return { ok: false, msg: 'errors.birthFuture' };
    if (birthDate < minDate)
        return { ok: false, msg: 'errors.birthTooOld' };
    if (options.requirePassword || password) {
        const lower = /[a-z]/;
        const upper = /[A-Z]/;
        const digit = /[0-9]/;
        const min = /^.{8,100}$/;
        if (!lower.test(password)) return { ok: false, msg: "errors.noLowercasePassword" };
        if (!upper.test(password)) return { ok: false, msg: "errors.noUppercasePassword" };
        if (!digit.test(password)) return { ok: false, msg: "errors.noNumPassword" };
        if (!min.test(password)) return { ok: false, msg: "errors.badLengthPassword" };
        if (password !== repeat) return { ok: false, msg: "errors.noMatchPassword" };
    }
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
        console.log(`Intento de registro en /auth/register`);
        console.log(`Datos: ${user}, ${email}, ${birth}, ${country}, ${language}, 2FA: ${enabled2FA}`);
        const response = await fetch(`/auth/register`, {
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
        return { ok: false, msg: "errors.connectionError" };
    }
}

export async function checkLogin(user: string, pass: string) {
    try {
        const response = await fetch(`/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        return await response.json(); 
    } catch (e) {
        return { ok: false, msg: "errors.connectionError" };
    }
}

export async function send2FACode(userId: number, totpCode: string) {
    try {
        // Determine the endpoint based on code length
        const endpoint = totpCode.length === 6 
            ? `/auth/verify-totp`
            : `/auth/verify-backup`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, totpCode })
        });

        return await response.json();
    } catch (e) {
        return { ok: false, msg: "errors.connectionError" };
    }
}

