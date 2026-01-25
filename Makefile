# Definir el nombre del servicio
TRANSCENDENCE_HOME = $(shell echo $$HOME)
CODESPACE_NAME = $(shell echo $$CODESPACE_NAME)
export TRANSCENDENCE_HOME

# Nombre del archivo env
ENV_FILE = srcs/.env
# En tu terminal de Codespaces



# Definir los nombres de los servicios
SERVICE1 = totp
SERVICE2 = dbserver
SERVICE3 = backend
SERVICE4 = frontend
SERVICE8 = grafana
SERVICE9 = adminer
SERVICE11 = auth-frontend
SERVICE12 = auth-service

#SERVICES = $(SERVICE2) $(SERVICE9) $(SERVICE8)
SERVICES = $(SERVICE2) $(SERVICE3) $(SERVICE4) $(SERVICE9) $(SERVICE8) $(SERVICE1)
#SERVICES = $(SERVICE2) $(SERVICE3) $(SERVICE4) $(SERVICE9) $(SERVICE8) $(SERVICE1) $(SERVICE11) $(SERVICE12)


# data directories
DB_DATA_DIR = $(TRANSCENDENCE_HOME)/data/dbserver
GRAFANA_DATA_DIR = $(TRANSCENDENCE_HOME)/data/grafana

# --build image if not exists and run it in detached mode (-d)
# --hints about .env location.
# --also saves space. Deletes all images not used by any containers, even tagged ones.
# docker --env-file srcs/.env compose -f srcs/docker-compose.yml config   <<-helped
all: srcs/.env $(DB_DATA_DIR) $(GRAFANA_DATA_DIR) update-env
	echo $(TRANSCENDENCE_HOME)
	echo $(CODESPACE_NAME)
	docker compose --project-directory srcs -f srcs/docker-compose.yml up --build -d

# Actualizar VITE_BACKEND_URL en .env si estamos en Codespaces CAMBIO A http://localhost:3000
update-env:
	@echo "Leyendo puertos desde $(ENV_FILE)..."
	$(eval FE_PORT=$(shell grep FE_CONTAINER_PORT $(ENV_FILE) | cut -d '=' -f2))
	$(eval BE_PORT=$(shell grep BE_CONTAINER_PORT $(ENV_FILE) | cut -d '=' -f2))
	@if [ -n "$(CODESPACE_NAME)" ]; then \
		echo "Actualizando VITE_BACKEND_URL en .env para Codespace: $(CODESPACE_NAME)"; \
		sed -i 's|^VITE_BACKEND_URL=.*|VITE_BACKEND_URL=https://$(CODESPACE_NAME)-$(BE_PORT).app.github.dev|' $(ENV_FILE); \
		sed -i 's|^VITE_FRONTEND_URL=.*|VITE_FRONTEND_URL=https://$(CODESPACE_NAME)-$(FE_PORT).app.github.dev|' $(ENV_FILE); \
	else \
		echo "No se detectó CODESPACE_NAME, manteniendo .env sin cambios"; \
		sed -i 's|^VITE_BACKEND_URL=.*|VITE_BACKEND_URL=http://localhost:$(BE_PORT)|' $(ENV_FILE); \
		sed -i 's|^VITE_FRONTEND_URL=.*|VITE_FRONTEND_URL=http://localhost:$(FE_PORT)|' $(ENV_FILE); \
	fi
	@echo "URLs actualizadas: BE en $(BE_PORT), FE en $(FE_PORT)"	

# Create postgres data directory if does not exists
$(DB_DATA_DIR):
	@echo "Asegurando que $(SERVICE2) no está usando  $(DB_DATA_DIR)"
	@docker compose -f srcs/docker-compose.yml down $(SERVICE2) 2>/dev/null || true
	@if [ -d "$(DB_DATA_DIR)" ]; then \
		sudo rm -rf $(DB_DATA_DIR)/*; \
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
		sudo rm -rf $(GRAFANA_DATA_DIR)/*; \
		echo "Contenido de $(GRAFANA_DATA_DIR) eliminado"; \
	else \
		mkdir -p $(GRAFANA_DATA_DIR); \
		echo "Directorio $(GRAFANA_DATA_DIR) creado"; \
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

$(SERVICE11):
	docker compose --project-directory srcs -f srcs/docker-compose.yml build $(SERVICE11)
$(SERVICE11)clean:
	docker image rm $(SERVICE11)

$(SERVICE12):
	docker compose --project-directory srcs -f srcs/docker-compose.yml build $(SERVICE12)
$(SERVICE12)clean:
	docker image rm $(SERVICE12)	

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
	docker run --rm -v $(TRANSCENDENCE_HOME):/clean_zone alpine rm -rf /clean_zone/data/dbserver /clean_zone/data/grafana

# 2. Remove containers, networks, AND volumes defined in the compose file
	docker compose --project-directory srcs -f srcs/docker-compose.yml down -v

# 3. Prune any remaining unused docker system data
# (This now includes the 'alpine' image since it is no longer in use)
	docker system prune -a --volumes -f

re: fclean all

.PHONY: all update-env $(DB_DATA_DIR) $(GRAFANA_DATA_DIR)
.PHONY: test-db
.PHONY: $(SERVICE1) $(SERVICE2) $(SERVICE3) $(SERVICE4) $(SERVICE8) $(SERVICE9)
.PHONY: $(SERVICE1)clean $(SERVICE2)clean $(SERVICE3)clean $(SERVICE4)clean $(SERVICE8)clean $(SERVICE9)clean
#.PHONY: $(SERVICE1) $(SERVICE2) $(SERVICE3) $(SERVICE4) $(SERVICE8) $(SERVICE9) $(SERVICE11) $(SERVICE12)
#.PHONY: $(SERVICE1)clean $(SERVICE2)clean $(SERVICE3)clean $(SERVICE4)clean $(SERVICE8)clean $(SERVICE9)clean $(SERVICE11)clean $(SERVICE12)clean
# global rules
# global rules
.PHONY: up down stop logs clean fclean
