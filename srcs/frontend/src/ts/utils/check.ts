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

export function checkLogin(user: string, password: string)
{
    const userdb = bbdd.find(u => u.user === user);

    if (!userdb)
        return { ok: false, msg: "User not found" };

    if (userdb.password !== password)
        return { ok: false, msg: "Wrong password" };
    return { ok: true, msg: "Correct login" };
}

export function checkSyntax(password: string): boolean
{
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/;

    return regex.test(password);
}
