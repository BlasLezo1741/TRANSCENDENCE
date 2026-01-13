// Importa la librería principal de React. 
// Necesitas esto para usar JSX (ese HTML dentro de JavaScript).
import React from 'react'

// Importa ReactDOM, que es la librería que conecta React con el DOM del navegador. 
// El "/client" indica que es la API moderna de React 18+.
import ReactDOM from 'react-dom/client'

// Importa tu componente principal App desde el archivo App.tsx (o App.jsx). 
// Este será el componente raíz de toda tu aplicación.
import App from './App'

/** Aquí pasan varias cosas importantes:

document.getElementById('root') - Busca el div con id="root" que vimos en el HTML

El signo ! TypeScript significa "confía en mí, este elemento SÍ existe". 
Le dice a TypeScript que no se preocupe por que pueda ser null

createRoot() - Crea la "raíz" de React en ese div. 
Esta es la forma moderna (React 18+)


.render() - Renderiza (dibuja) tu aplicación en el DOM

<React.StrictMode> - Es un componente especial que:

+ NO se ve en la página
+ Activa advertencias y comprobaciones extras durante el desarrollo
+ Te ayuda a detectar problemas potenciales en tu código
+ Solo funciona en modo desarrollo, no afecta producción

<App /> - Tu componente principal. Aquí es donde vive toda tu aplicación.

En resumen: Este archivo toma el div vacío #root del HTML y le dice a React: 
"Renderiza el componente <App /> aquí dentro, con modo estricto activado 
para ayudarme a encontrar errores".

Esa coma al final es opcional y es una cuestión de estilo de código. Permite
Control de versiones (Git) más limpio: Si más adelante añades otro argumento, 
solo añades una línea nueva sin modificar la línea anterior:
*/
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
