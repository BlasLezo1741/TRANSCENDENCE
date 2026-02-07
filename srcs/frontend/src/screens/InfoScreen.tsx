import React, { useState, useEffect } from 'react';

import "../css/ProfileScreen.css";

type States = 'a' | 'b' | 'c' | 'd' | 'e';

type InfoProps = {
    dispatch: React.Dispatch<any>;
    option: States;
};

const InfoScreen = ({dispatch, option}: InfoProps) =>
{
    const [activeTab, setActiveTab] = useState<States>(option);
    
    useEffect(() =>
    {
        setActiveTab(option);
    }, [option]);

    const A = () =>
    (
        <>
            <h1>Politica de privacidad</h1>
            <p>
                Este proyecto respeta la privacidad de sus usuarios y se compromete a proteger sus datos personales.
                <br /><br />
                <strong>Datos que recopilamos</strong>

                <br /><br />
                - Información de registro (correo electrónico, nombre de usuario).

                <br />
                - Datos necesarios para el funcionamiento de la aplicación (partidas, estadísticas, amigos, etc.).

                <br />
                - Datos técnicos básicos (cookies de sesión, dirección IP de forma temporal).

                <br /><br />
                <strong>Uso de los datos</strong>

                <br /><br />
                Los datos se utilizan exclusivamente para:

                <br />
                - Autenticación de usuarios.

                <br />
                - Funcionamiento correcto de la aplicación.

                <br />
                - Mejora de la experiencia de usuario.

                <br /><br />
                <strong>Almacenamiento y seguridad</strong>

                <br /><br />
                - Las contraseñas se almacenan cifradas.

                <br />
                - Los datos no se comparten con terceros.

                <br />
                - Se aplican medidas de seguridad para evitar accesos no autorizados.

                <br /><br />
                <strong>Derechos del usuario</strong>

                <br /><br />
                El usuario puede solicitar la eliminación de su cuenta y sus datos en cualquier momento.
            </p>
        </>
    );

    const B = () =>
    (
        <>
            <h1>Terminos de servicio</h1>
            <p>
                Al utilizar esta aplicación, aceptas los siguientes términos:

                <br /><br />
                <strong>Uso de la plataforma</strong>

                <br /><br />
                - El usuario se compromete a hacer un uso responsable.

                <br />
                - Está prohibido cualquier uso malicioso, fraudulento o que afecte a otros usuarios.

                <br /><br />
                <strong>Cuentas de usuario</strong>

                <br /><br />
                - Cada usuario es responsable de la seguridad de su cuenta.

                <br />
                - No está permitido suplantar la identidad de otros usuarios.

                <br /><br />
                <strong>Disponibilidad</strong>
                
                <br /><br />
                - El servicio se proporciona “tal cual”.

                <br />
                - No se garantiza disponibilidad continua ni ausencia total de errores.

                <br /><br />
                <strong>Modificaciones</strong>

                <br /><br />
                El equipo se reserva el derecho de modificar estos términos cuando sea necesario.
            </p>
        </>
    );

    const C = () =>
    (
        <>
            <h1>Informacion del proyecto</h1>
            <p>
                Esta aplicación ha sido desarrollada como parte del proyecto ft_transcendence del currículo de 42.
                <br /><br />
                <strong>Objetivo</strong>
                <br /><br />

                Crear una aplicación web completa que integre:
                <br />
                - Frontend

                <br />
                - Backend

                <br />
                - Base de datos

                <br />
                - Funcionalidades en tiempo real

                <br />
                - Gestión de usuarios

                <br /><br />
                <strong>Tecnologías</strong>
                <br /><br />

                - Frontend: React

                <br />
                - Backend: (Express / Nest / Django, etc.)

                <br />
                - Base de datos: (PostgreSQL / SQLite / MongoDB)

                <br />
                - Docker para despliegue

                <br /><br />
                El proyecto ha sido desarrollado en equipo, siguiendo buenas prácticas de desarrollo y gestión.
            </p>
        </>
    );

    const D = () =>
    (
        <>
            <h1>Contacto</h1>
            <p>
                Si tienes alguna duda, sugerencia o problema, puedes contactarnos a través de:
                <br /><br />
                📧 Email: contacto@fttranscendence.local
                <br />
                💬 A través del sistema de la plataforma (si aplica)
                <br /><br />
                Intentaremos responder lo antes posible.
            </p>
        </>
    );

    const E = () =>
    (
        <>
            <h1>Creditos</h1>
            <p>
                Este proyecto ha sido desarrollado por:
                <br /><br />
                👨‍💻 login1 – Frontend / Backend
                <br />
                👨‍💻 login2 – Backend / DevOps
                <br />
                👨‍💻 login3 – Frontend / UX
                <br />
                👨‍💻 login4 – Arquitectura / Seguridad
                <br /><br />
                Proyecto realizado como parte del currículo de 42.
                <br /><br />
                Gracias a todos los miembros del equipo por su trabajo y colaboración.
            </p>
        </>
    );

    return (
        <main className="profile">
            {/* Navegacion */}
            <nav>
                <ul>
                    <li
                        onClick={() => setActiveTab("a")}
                        className={activeTab === "a" ? "selected" : ""}>
                        Politica de privacidad
                    </li>
                    <li
                        onClick={() => setActiveTab("b")}
                        className={activeTab === "b" ? "selected" : ""}>
                        Terminos de servicio
                    </li>
                    <li
                        onClick={() => setActiveTab("c")}
                        className={activeTab === "c" ? "selected" : ""}>
                        Sobre el proyecto
                    </li>
                    <li
                        onClick={() => setActiveTab("d")}
                        className={activeTab === "d" ? "selected" : ""}>
                        Contacto
                    </li>
                    <li
                        onClick={() => setActiveTab("e")}
                        className={activeTab === "e" ? "selected" : ""}>
                        Creditos
                    </li>
                </ul>
            </nav>

            {/* Contenido */}
            <section>
                <div className="p-cont">
                    {activeTab === 'a' && <A />}
                    {activeTab === 'b' && <B />}
                    {activeTab === 'c' && <C />}
                    {activeTab === 'd' && <D />}
                    {activeTab === 'e' && <E />}
                </div>
            </section>
        </main>
    );
};

export default InfoScreen;