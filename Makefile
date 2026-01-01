# Definir el nombre del servicio
TRANSCENDENCE_HOME = $(shell echo $$HOME)
export TRANSCENDENCE_HOME
SERVICE1 = webserver
SERVICE2 = dbserver
SERVICE3 = contentserver
SERVICE8 = grafana
SERVICE9 = adminer
#SERVICES = $(SERVICE1) $(SERVICE2) $(SERVICE3)
SERVICES = $(SERVICE2) $(SERVICE9) $(SERVICE8)


# data directories
DB_DATA_DIR = $(TRANSCENDENCE_HOME)/data/dbserver
GRAFANA_DATA_DIR = $(TRANSCENDENCE_HOME)/data/grafana

.PHONY: all web db content client webclean dbclean contentclean clientclean
# --build image if not exists and run it in detached mode (-d)
# --hints about .env location.
# --also saves space. Deletes all images not used by any containers, even tagged ones.
# docker --env-file srcs/.env compose -f srcs/docker-compose.yml config   <<-helped
all: .env $(DB_DATA_DIR) $(GRAFANA_DATA_DIR)
	echo $(TRANSCENDENCE_HOME)
	docker compose --project-directory srcs -f srcs/docker-compose.yml up --build -d


# Create postgres data directory if does not exists
$(DB_DATA_DIR):
	@if [ -d "$(DB_DATA_DIR)" ]; then \
		rm -rf $(DB_DATA_DIR)/*; \
		echo "Contenido de $(DB_DATA_DIR) eliminado"; \
	else \
		mkdir -p $(DB_DATA_DIR); \
		echo "Directorio $(DB_DATA_DIR) creado"; \
	fi

# Create grafana data directory if does not exists
$(GRAFANA_DATA_DIR):
	@if [ -d "$(GRAFANA_DATA_DIR)" ]; then \
		rm -rf $(GRAFANA_DATA_DIR)/*; \
		echo "Contenido de $(GRAFANA_DATA_DIR) eliminado"; \
	else \
		mkdir -p $(GRAFANA_DATA_DIR); \
		echo "Directorio $(GRAFANA_DATA_DIR) creado"; \
	fi

# Individual rules

$(SERVICE8):
	docker compose --project-directory srcs -f srcs/docker-compose.yml build $(SERVICE8)
$(SERVICE8)clean:
	docker image rm $(SERVICE8)

$(SERVICE9):
	docker compose --project-directory srcs -f srcs/docker-compose.yml build $(SERVICE9)
$(SERVICE9)clean:
	docker image rm $(SERVICE9)

$(SERVICE2):
	docker compose --project-directory srcs -f srcs/docker-compose.yml build $(SERVICE2)
$(SERVICE2)clean:
	docker image rm $(SERVICE2)
test-db:
	# 1. Ensure the containers are up and HEALTHY
	docker compose -f srcs/docker-compose.yml up -d dbserver
	
	# 2. Wait for Postgres to be ready (prevents race conditions)
	docker exec dbserver sh -c 'until pg_isready -U postgres; do sleep 1; done'
	
	# 3. Precise count matching using awk or psql -t (tuples only mode)
	@COUNT=$$(docker exec dbserver psql -U postgres -d transcendence -t -c "SELECT count(*) FROM PLAYER;" | xargs); \
	if [ "$$COUNT" -eq 50 ]; then \
		echo "✅ Test Passed: Found exactly 50 players."; \
	else \
		echo "❌ Test Failed: Expected 50 players, found $$COUNT."; \
		exit 1; \
	fi
	docker exec -it $(SERVICE2) mysql -u postgres -ptranscendence -e "SHOW DATABASES;"

content:
	docker compose --project-directory srcs -f srcs/docker-compose.yml build contentserver
contentclean:
	docker image rm $(SERVICE3)


# global rules
.PHONY: up down stop logs clean fclean
# Ejecutar docker compose up
up:
	docker compose --project-directory srcs -f srcs/docker-compose.yml up

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
	docker volume rm transcendence_db_data
	docker system prune -a --volumes
	sudo rm -rf $(TRANSCENDENCE_HOME)/data/dbserver

