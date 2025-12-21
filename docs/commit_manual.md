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
|chore|Actividades que no modifican el código de la aplicación ni las pruebas, sino que configuran el entorno de trabajo o la metodología.|Ver punto 5 abajo|



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


## 5. Commits tareas del gestor del proyecto

Para los casos relacionados con la configuración del repositorio, reglas de equipo y gestión del proyecto, la convención estándar que debemos seguir en ft_transcendence es el prefijo chore o build.

Dado que el manual del proyecto exige una organización clara y el uso de herramientas de gestión como GitHub Issues, estos commits son vitales para demostrar la profesionalidad del equipo (ver Subject).

+ pag 5 ◦ Tracks progress and
+ pag 5 • Task organization: Use simple tools like GitHub Issues, Trello, or even a shared document to track who does 
+ pag 6 • How work was organized and divided.
+ pag 28 • How the team organized the work (task distribution, meetings, etc.).

### Prefijo recomendado: `chore`

El tipo chore (tarea rutinaria) se utiliza para actividades que no modifican el código de la aplicación ni las pruebas, sino que configuran el entorno de trabajo o la metodología.

### Ejemplos para tu caso específico:

+ **Creación de templates**:chore(github): add issue and pull request templates #4
+ **Definición de reglas de documentación**:chore(docs): define commit message and documentation standards #5
+ **Configuración del flujo de trabajo**:chore(git): initialize branch protection rules and project milestones #22. 

### Manual de especificaciones: Tareas de Gestión
Para que el historial sea impecable ante los evaluadores, sigue este formato para las tareas de la organización BlasLezo1741:

Tarea de Gestión|Mensaje de Commit Sugerido|Justificación en Evaluación|Referencia del subject
----------------|--------------------------|---------------------------|-----------------------
Templates de Issues|chore:setup github issue templates for tasks and bugs #ID|Demuestra organización del trabajo.|pag 5 ◦ Tracks progress and deadlines
Manual de Mensajes|chore:create commit message specification manual #ID|Prueba la coordinación del equipo.|pag 4 • Poor early choices and lack of team coordination will cost a lot of time. Your project and team management will strongly impact your results.
GitHub Projects|chore:link repository to ft_transcendence project board #ID|Valida el seguimiento del progreso.|pag 6 • How work was organized and divided.
Configuración Docker| build(docker): initial setup of docker-compose and env.example #ID|Cumple el requisito de despliegue único | pag 8 • Deployment must use a containerization solution (Docker, Podman, or equivalent) and run with a single command.. 

Importancia para la evaluación finalRecuerda que durante la evaluación, el equipo deberá explicar cómo se dividió el trabajo y cómo se comunicaron6666. Los commits de tipo chore son la evidencia física de que el Project Manager y el Tech Lead establecieron procesos antes de empezar a programar, lo cual es altamente valorado en el Common Core7777.+3