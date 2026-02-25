# Definir el nombre del servicio
TRANSCENDENCE_HOME = $(shell echo $$HOME)
CODESPACE_NAME = $(shell echo $$CODESPACE_NAME)
export TRANSCENDENCE_HOME

CURRENT_DIR = $(shell echo $$PWD)
ENV_EXAMPLE_FILE = $(CURRENT_DIR)/srcs/.env.example
DB_POSTGRES_VERSION := $(shell grep '^DB_POSTGRES_VERSION=' $(ENV_EXAMPLE_FILE) | cut -d '=' -f2)

# ─── BUILDKIT ────────────────────────────────────────────────────────────────
# Habilita BuildKit: necesario para --mount=type=cache en los Dockerfiles
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
# ──
#Activan BuildKit explícitamente, que es el requisito para que funcionen los 
#--mount=type=cache de los Dockerfiles. En versiones modernas de Docker ya viene 
#activo por defecto, pero declararlo en el Makefile te garantiza que funciona en 
#cualquier entorno del equipo.


# Nombre del archivo env
ENV_FILE = $(CURRENT_DIR)/srcs/.env
# En tu terminal de Codespaces



# Definir los nombres de los servicios
SERVICE1 = totp
SERVICE2 = dbserver
SERVICE3 = backend
SERVICE4 = frontend
SERVICE8 = grafana
SERVICE9 = adminer
SERVICE10 = prometheus


#SERVICES = $(SERVICE2) $(SERVICE9) $(SERVICE8)
SERVICES = $(SERVICE2) $(SERVICE3) $(SERVICE4) $(SERVICE9) $(SERVICE8) $(SERVICE1) $(SERVICE10)
#SERVICES = $(SERVICE2) $(SERVICE3) $(SERVICE4) $(SERVICE9) $(SERVICE8) $(SERVICE1) $(SERVICE11) $(SERVICE12)


# data directories
DB_DATA_DIR = $(TRANSCENDENCE_HOME)/data/dbserver
GRAFANA_DATA_DIR = $(TRANSCENDENCE_HOME)/data/grafana
PROMETHEUS_DATA_DIR = $(TRANSCENDENCE_HOME)/data/prometheus

# --build image if not exists and run it in detached mode (-d)
# --hints about .env location.
# --also saves space. Deletes all images not used by any containers, even tagged ones.
# docker --env-file srcs/.env compose -f srcs/docker-compose.yml config   <<-helped
all: $(DB_DATA_DIR) $(GRAFANA_DATA_DIR) $(PROMETHEUS_DATA_DIR) update-env
	echo $(TRANSCENDENCE_HOME)
	echo $(CODESPACE_NAME)
	docker compose --project-directory srcs -f srcs/docker-compose.yml up --build -d

# Actualizar URLs en .env para la nueva arquitectura Nginx (HTTPS)
# update-env:
# 	echo "Skip update"
# Actualizar URLs en .env para la nueva arquitectura Nginx (HTTPS en puerto 8443)
# update-env:
# 	@if [ -f srcs/.env ]; then \
# 		echo "srcs/.env ya existe, omitiendo configuración."; \
# 	else \
# 		cp srcs/.env.example srcs/.env ;\
# 		printf "POSTGRES_USER: ";             read POSTGRES_USER; \
# 		printf "POSTGRES_PASSWORD: ";          stty -echo; read POSTGRES_PASSWORD;          stty echo; echo ""; \
# 		printf "OAUTH_GOOGLE_CLIENT_SECRET: "; stty -echo; read OAUTH_GOOGLE_CLIENT_SECRET; stty echo; echo ""; \
# 		printf "OAUTH_42_CLIENT_SECRET: ";     stty -echo; read OAUTH_42_CLIENT_SECRET;     stty echo; echo ""; \
# 		sed -i "s|^POSTGRES_USER=.*|POSTGRES_USER=$$POSTGRES_USER|"                         srcs/.env; \
# 		sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$$POSTGRES_PASSWORD|"             srcs/.env; \
# 		sed -i "s|^OAUTH_GOOGLE_CLIENT_SECRET=.*|OAUTH_GOOGLE_CLIENT_SECRET=$$OAUTH_GOOGLE_CLIENT_SECRET|" srcs/.env; \
# 		sed -i "s|^OAUTH_42_CLIENT_SECRET=.*|OAUTH_42_CLIENT_SECRET=$$OAUTH_42_CLIENT_SECRET|"             srcs/.env; \
# 		echo "✔  .env actualizado correctamente." ; \
# 	fi ; \
# 	echo "Leyendo entorno y configurando Proxy Nginx en puerto 8443..." \
# 	if [ -n "$$(CODESPACE_NAME)" ]; then \
# 		echo " Modo: Codespaces detectado"; \
# 		BASE_URL="https://$$(CODESPACE_NAME)-8443.app.github.dev"; \
# 	elif grep -q Microsoft /proc/version 2>/dev/null || [ -n "$$WSL_DISTRO_NAME" ]; then \
# 		echo " Modo: WSL (Windows) detectado"; \
# 		BASE_URL="https://localhost:8443"; \
# 	elif [ "$$(uname -s)" = "Darwin" ]; then \
# 		echo " Modo: Mac OS (42) detectado"; \
# 		MAC_IP=$$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "localhost"); \
# 		echo " IP Local (Mac): $$MAC_IP"; \
# 		BASE_URL="https://$$MAC_IP:8443"; \
# 	else \
# 		echo "🐧 Modo: Linux Nativo detectado"; \
# 		LINUX_IP=$$(hostname -I | awk '{print $$1}'); \
# 		if [ -z "$$LINUX_IP" ]; then LINUX_IP="localhost"; fi; \
# 		echo " IP Local (Linux): $$LINUX_IP"; \
# 		BASE_URL="https://$$LINUX_IP:8443"; \
# 	fi; \
# 	echo " Nginx Entrypoint configurado en: $$BASE_URL"; \
# 	sed -i.bak "s|^VITE_BACKEND_URL=.*|VITE_BACKEND_URL=$$BASE_URL|" $(ENV_FILE); \
# 	sed -i.bak "s|^VITE_FRONTEND_URL=.*|VITE_FRONTEND_URL=$$BASE_URL|" $(ENV_FILE); \
# 	sed -i.bak "s|^VITE_AUF_API_URL=.*|VITE_AUF_API_URL=$$BASE_URL|" $(ENV_FILE); \
# 	sed -i.bak "s|^VITE_AUS_API_URL=.*|VITE_AUS_API_URL=$$BASE_URL|" $(ENV_FILE); \
# 	sed -i.bak "s|^GF_SERVER_ROOT_URL=.*|GF_SERVER_ROOT_URL=$$BASE_URL/grafana/|" $(ENV_FILE); \
# 	sed -i.bak "s|^OAUTH_42_CALLBACK_URL=.*|OAUTH_42_CALLBACK_URL=$$BASE_URL/auth/42/callback|" $(ENV_FILE); \
# 	sed -i.bak "s|^OAUTH_GOOGLE_CALLBACK_URL=.*|OAUTH_GOOGLE_CALLBACK_URL=$$BASE_URL/auth/google/callback|" $(ENV_FILE); \
# 	rm -f $(ENV_FILE).bak

update-env:
	@if [ -f srcs/.env ]; then \
		echo "srcs/.env ya existe, omitiendo configuración."; \
	else \
		cp srcs/.env.example srcs/.env ;\
		printf "POSTGRES_USER: ";            read POSTGRES_USER; \
		printf "POSTGRES_PASSWORD: ";        stty -echo; read POSTGRES_PASSWORD;          stty echo; echo ""; \
		printf "OAUTH_GOOGLE_CLIENT_SECRET: "; stty -echo; read OAUTH_GOOGLE_CLIENT_SECRET; stty echo; echo ""; \
		printf "OAUTH_42_CLIENT_SECRET: ";     stty -echo; read OAUTH_42_CLIENT_SECRET;     stty echo; echo ""; \
		sed -i.bak "s|^POSTGRES_USER=.*|POSTGRES_USER=$$POSTGRES_USER|"                        srcs/.env; \
		sed -i.bak "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$$POSTGRES_PASSWORD|"            srcs/.env; \
		sed -i.bak "s|^OAUTH_GOOGLE_CLIENT_SECRET=.*|OAUTH_GOOGLE_CLIENT_SECRET=$$OAUTH_GOOGLE_CLIENT_SECRET|" srcs/.env; \
		sed -i.bak "s|^OAUTH_42_CLIENT_SECRET=.*|OAUTH_42_CLIENT_SECRET=$$OAUTH_42_CLIENT_SECRET|"             srcs/.env; \
		rm -f srcs/.env.bak; \
		echo "✔  .env actualizado correctamente." ; \
	fi ; \
	echo "Leyendo entorno y configurando Proxy Nginx en puerto 8443..."; \
	if [ -n "$$(CODESPACE_NAME)" ]; then \
		echo " Modo: Codespaces detectado"; \
		BASE_URL="https://$$(CODESPACE_NAME)-8443.app.github.dev"; \
	elif grep -q Microsoft /proc/version 2>/dev/null || [ -n "$$WSL_DISTRO_NAME" ]; then \
		echo " Modo: WSL (Windows) detectado"; \
		BASE_URL="https://localhost:8443"; \
	elif [ "$$(uname -s)" = "Darwin" ]; then \
		echo " Modo: Mac OS (42) detectado"; \
		MAC_IP=$$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "localhost"); \
		echo " IP Local (Mac): $$MAC_IP"; \
		BASE_URL="https://$$MAC_IP:8443"; \
	else \
		echo " Modo: Linux Nativo detectado"; \
		LINUX_IP=$$(hostname -I | awk '{print $$1}'); \
		if [ -z "$$LINUX_IP" ]; then LINUX_IP="localhost"; fi; \
		echo " IP Local (Linux): $$LINUX_IP"; \
		BASE_URL="https://$$LINUX_IP:8443"; \
	fi; \
	echo " Nginx Entrypoint configurado en: $$BASE_URL"; \
	sed -i.bak "s|^VITE_BACKEND_URL=.*|VITE_BACKEND_URL=$$BASE_URL|" srcs/.env; \
	sed -i.bak "s|^VITE_FRONTEND_URL=.*|VITE_FRONTEND_URL=$$BASE_URL|" srcs/.env; \
	sed -i.bak "s|^VITE_AUF_API_URL=.*|VITE_AUF_API_URL=$$BASE_URL|" srcs/.env; \
	sed -i.bak "s|^VITE_AUS_API_URL=.*|VITE_AUS_API_URL=$$BASE_URL|" srcs/.env; \
	sed -i.bak "s|^GF_SERVER_ROOT_URL=.*|GF_SERVER_ROOT_URL=$$BASE_URL/grafana/|" srcs/.env; \
	sed -i.bak "s|^OAUTH_42_CALLBACK_URL=.*|OAUTH_42_CALLBACK_URL=$$BASE_URL/auth/42/callback|" srcs/.env; \
	rm -f srcs/.env.bak
# sed -i.bak "s|^OAUTH_GOOGLE_CALLBACK_URL=.*|OAUTH_GOOGLE_CALLBACK_URL=$$BASE_URL/auth/google/callback|" srcs/.env; \
# Create postgres data directory if does not exists
$(DB_DATA_DIR):
	@echo "Asegurando que $(SERVICE2) no está usando  $(DB_DATA_DIR)"
	@docker compose -f srcs/docker-compose.yml down $(SERVICE2) 2>/dev/null || true
	@if [ -d "$(DB_DATA_DIR)" ]; then \
		echo "$(DB_DATA_DIR) ya existe. Usando contenedor auxiliar para limpiar contenido..."; \
		docker run --rm -v $(TRANSCENDENCE_HOME):/clean_zone alpine rm -rf /clean_zone/var/lib/postgresql/$(DB_POSTGRES_VERSION)/docker/*; \
		echo "Contenido de $(DB_DATA_DIR) eliminado"; \
	else \
		mkdir -p $(DB_DATA_DIR); \
		echo "Directorio $(DB_DATA_DIR) creado"; \
	fi
	@sync
	@sleep 1

# Create grafana data directory if does not exists
$(GRAFANA_DATA_DIR):
	@echo "Asegurando que $(SERVICE8) no está usando el $(GRAFANA_DATA_DIR)"
	@docker compose -f srcs/docker-compose.yml down $(SERVICE8) 2>/dev/null || true
	
	@if [ -d "$(GRAFANA_DATA_DIR)" ]; then \
		echo "$(GRAFANA_DATA_DIR) ya existe. Usando contenedor auxiliar para limpiar contenido..."; \
		docker run --rm -v $(TRANSCENDENCE_HOME):/clean_zone alpine rm -rf /clean_zone/var/grafana/*; \
		echo "Contenido de $(GRAFANA_DATA_DIR) eliminado"; \
	else \
		mkdir -p $(GRAFANA_DATA_DIR); \
		echo "Directorio $(GRAFANA_DATA_DIR) creado"; \
	fi
	@sync
	@sleep 1

# Create prometheus data directory if does not exists
$(PROMETHEUS_DATA_DIR):
	@echo "Asegurando que $(SERVICE10) no está usando el $(PROMETHEUS_DATA_DIR)"
	@docker compose -f srcs/docker-compose.yml down $(SERVICE10) 2>/dev/null || true
	
	@if [ -d "$(PROMETHEUS_DATA_DIR)" ]; then \
		echo "La carpeta ya existe. Usando contenedor auxiliar para limpiar contenido..."; \
		docker run --rm -v $(TRANSCENDENCE_HOME):/clean_zone alpine rm -rf /clean_zone/data/prometheus/*; \
	else \
		mkdir -p $(PROMETHEUS_DATA_DIR); \
		echo "Directorio $(PROMETHEUS_DATA_DIR) creado"; \
	fi
	@sync
	@sleep 1


# Individual rules

$(SERVICE1):
	docker compose --project-directory srcs -f srcs/docker-compose.yml build $(SERVICE1)
$(SERVICE1)clean:
	docker image rm $(SERVICE1)

$(SERVICE2):
	docker compose --project-directory srcs -f srcs/docker-compose.yml build $(SERVICE2)
$(SERVICE2)clean:
	docker image rm $(SERVICE2)

$(SERVICE3):
	docker compose --project-directory srcs -f srcs/docker-compose.yml build $(SERVICE3)
$(SERVICE3)clean:
	docker image rm $(SERVICE3)

$(SERVICE4):
	docker compose --project-directory srcs -f srcs/docker-compose.yml build $(SERVICE4)
$(SERVICE4)clean:
	docker image rm $(SERVICE4)		

$(SERVICE8):
	docker compose --project-directory srcs -f srcs/docker-compose.yml build $(SERVICE8)
$(SERVICE8)clean:
	docker image rm $(SERVICE8)

$(SERVICE9):
	docker compose --project-directory srcs -f srcs/docker-compose.yml build $(SERVICE9)
$(SERVICE9)clean:
	docker image rm $(SERVICE9)
$(SERVICE10):
	docker compose --project-directory srcs -f srcs/docker-compose.yml build $(SERVICE10)
$(SERVICE10)clean:
	docker image rm $(SERVICE10)

re-backend:
	docker compose --project-directory srcs -f srcs/docker-compose.yml up -d --build $(SERVICE3)

test-db: srcs/.env $(DB_DATA_DIR)
	# 1. Ensure the containers are up and HEALTHY
	docker compose -f srcs/docker-compose.yml up -d dbserver
	
	# 2. Wait for Postgres to be ready (prevents race conditions)
	docker exec dbserver sh -c 'until pg_isready -U postgres; do sleep 1; done'
	
	# 3. Precise count matching using awk or psql -t (tuples only mode)
	@COUNT=$$(docker exec dbserver psql -U postgres -d transcendence -t -c "SELECT count(*) FROM PLAYER;" | xargs); \
	if [ "$$COUNT" -eq 100 ]; then \
		echo "✅ Test Passed: Found exactly 100 players."; \
	else \
		echo "❌ Test Failed: Expected 100 players, found $$COUNT."; \
		exit 1; \
	fi





# Ejecutar docker compose up
up:
	docker compose --project-directory srcs -f srcs/docker-compose.yml up -d

build:
	docker compose --project-directory srcs -f srcs/docker-compose.yml up -d --build

# Detener los contenedores
down:
	docker compose --project-directory srcs -f srcs/docker-compose.yml down

# Detener los contenedores
stop:
	docker compose --project-directory srcs -f srcs/docker-compose.yml stop

# Mostrar los logs del servicio
logs:
	docker compose --project-directory srcs -f srcs/docker-compose.yml logs $(SERVICES)

# Eliminar contenedores y volúmenes
clean: down
	docker image rm -f $(SERVICES)

fclean: clean
# 1. Force remove the local data directories using a temporary container
# (We do this first so the alpine image is available to be pruned later)
	docker run --rm -v $(TRANSCENDENCE_HOME):/clean_zone alpine rm -rf /clean_zone/data/dbserver /clean_zone/data/grafana /clean_zone/data/prometheus

# 2. Remove containers, networks, AND volumes defined in the compose file
	docker compose --project-directory srcs -f srcs/docker-compose.yml down -v

# 3. Prune any remaining unused docker system data
# docker system prune -a es un comando que lo borra todo, incluyendo la 
# BuildKit cache donde Docker guarda los paquetes npm y pip descargados. 
# Por eso cada make re tardaba 130s+ aunque package.json no hubiera cambiado.
# Los 4 comandos de reemplazo limpian exactamente lo mismo 
# (contenedores parados, imágenes sin usar, volúmenes y redes huérfanos) 
# pero respetan la BuildKit cache.
# (This now includes the 'alpine' image since it is no longer in use)
	docker container prune -f
	docker image prune -a -f
	docker volume prune -f
	docker network prune -f


re: fclean all

.PHONY: all update-env $(DB_DATA_DIR) $(GRAFANA_DATA_DIR) $(PROMETHEUS_DATA_DIR)
.PHONY: test-db
.PHONY: $(SERVICE1) $(SERVICE2) $(SERVICE3) $(SERVICE4) $(SERVICE8) $(SERVICE9) $(SERVICE10)
.PHONY: $(SERVICE1)clean $(SERVICE2)clean $(SERVICE3)clean $(SERVICE4)clean $(SERVICE8)clean $(SERVICE9)clean $(SERVICE10)clean
#.PHONY: $(SERVICE1) $(SERVICE2) $(SERVICE3) $(SERVICE4) $(SERVICE8) $(SERVICE9) $(SERVICE11) $(SERVICE12)
#.PHONY: $(SERVICE1)clean $(SERVICE2)clean $(SERVICE3)clean $(SERVICE4)clean $(SERVICE8)clean $(SERVICE9)clean $(SERVICE11)clean $(SERVICE12)clean
# global rules
# global rules
.PHONY: up down stop logs clean fclean
