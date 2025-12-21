# 📘 Manual de Especificaciones para Mensajes de Commit. 


## 1 Estructura del Mensaje (Estilo Conventional Commits)
Cada mensaje debe seguir este formato para ser escaneable y profesional:`<tipo>(<ámbito>): <descripción corta> #<id_tarea>`
+ **Tipo**: El propósito del cambio (ver lista abajo).
+ **Ámbito (Opcional)**: La parte del proyecto afectada (ej. `backend`, `frontend`, `ia`).
+ **Descripción** : Un resumen en presente e imperativo (ej. "add" en lugar de "added").
+ **ID Tarea**: El número de la feature o task en tu GitHub Project (ej. `#42`).

## 2. Tipos de Commits Permitidos
Para ft_transcendence, utilizaremos los siguientes prefijos:

|Tipo|Uso|Ejemplo|
|----|----|-------|
|feat|Una nueva funcionalidad o módulo|feat(auth): implement 2FA logic #10
|fix|Corrección de un error o bug.|fix(pong): fix ball collision error in Chrome #22|
|docs|Cambios solo en la documentación o README.|docs: update roles and point calculation in README #5|
|style|Cambios que no afectan la lógica (CSS, espacios, etc.)|style(ui): update color palette for accessibility #14|
|refactor|Cambio de código que no añade feature ni corrige bug.|refactor(api): simplify user data retrieval #30|
|docker|Cambios en la configuración de contenedores|docker: update postgres image version #2|



## 3. Reglas de Oro para el Equipo
+ **Frecuencia Atómica**: 
Realiza un commit por cada pequeño cambio lógico. No mezcles "corregir un bug en el chat" con "añadir un botón en el perfil".
+ **Modo Imperativo**: Escribe el mensaje como si estuvieras dando una orden.
    + ✅ feat: add tournament matchmaking
    +  ❌ feat: I added some matchmaking logic
+ **Referencia Obligatoria**: Todos los commits deben incluir el número del Issue/Task de GitHub (ej. `#12`). Esto vincula el código con las 47 tareas definidas en vuestro Project.
+ **Cero Mensajes Vagos**: Están prohibidos los mensajes como "fix", "update", "cambios" o "asdf". Estos pueden causar que el proyecto sea rechazado por falta de claridad (ver Pag 8 del Subject)

## 4. Ejemplo de un Commits vinculados a un Módulo

Si namada72 está trabajando en el módulo de IA `Opponent9:feat(ai): implement minimax algorithm for pong opponent #15`

Si luismiguelcasadodiaz corrige un error de seguridad en los formularios `fix(backend): add server-side validation for signup form #8`