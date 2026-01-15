## ¿Bcrypt en el Backend o Stored Procedure en Postgres?

En la arquitectura moderna y bajo el requisito de Microservicios, lo más recomendable es utilizar bcrypt en el Backend (NestJS). Aquí te explico por qué:

+ **Escalabilidad**: El cifrado de contraseñas es una tarea intensiva para la CPU. Si delegas esto a la base de datos, estás consumiendo recursos valiosos del motor de datos. Es mucho más fácil y barato escalar horizontalmente tus contenedores de NestJS que escalar tu instancia de Postgres.

+ **Seguridad del Dato en Tránsito**: Si cifras en el backend, la contraseña "en claro" nunca llega a la base de datos. Si usas una Stored Procedure, la contraseña viaja por la red (aunque sea interna) hasta llegar a la DB para ser procesada.

+ **Portabilidad**: Si el día de mañana decides cambiar Postgres por otra base de datos, no pierdes tu lógica de seguridad porque está en el código (auth.service.ts), no en procedimientos almacenados específicos del motor SQL.

+ **Separación de Responsabilidades**: El principio de microservicios dicta que la lógica de negocio (como el hash de seguridad) debe vivir en el servicio, mientras que la base de datos debe ser solo una capa de persistencia inteligente.
