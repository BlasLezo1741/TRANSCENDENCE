// Base de datos simulada

export interface bbdd
{
    user: string;
    password: string;
}

const bbdd: bbdd[] = [
    { user: "p1", password: "Abc123123" },
    { user: "p2", password: "AbcAbc123" },
];

// Check if the user exists and match
export function checkLogin(user: string, password: string)
{
    const userdb = bbdd.find(u => u.user === user);

    if (!userdb)
        return { ok: false, msg: "User not found" };

    if (userdb.password !== password)
        return { ok: false, msg: "Wrong password" };
    return { ok: true, msg: "Correct login" };
}

// Regist user in the database - The password is already checked
export function registUser(user: string, password: string, email:string, birth: string, lang: string): boolean
{
    return true;
}

export function checkPassword(password: string, repeat: string)
{
    const lower = /[a-z]/;
    const upper = /[A-Z]/;
    const digit = /[0-9]/;
    const min = /^.{8, 100}$/;

    if (!lower.test(password))
        return { ok: false, msg: "La contraseña no tiene minusculas" };
    if (!upper.test(password))
        return { ok: false, msg: "La contraseña no tiene mayusculas" };
    if (!digit.test(password))
        return { ok: false, msg: "La contraseña no tiene numeros" };
    if (min.test(password))
        return { ok: false, msg: "La contraseña ha de tener de 8 a 100 caracteres" };
    if (password != repeat)
        return { ok: false, msg: "Las contraseñas son diferentes" };
    return { ok: true, msg: "Registrado correctamente" };
}
