# Definir el nombre del servicio
TRANSCENDENCE_HOME = $(shell echo $$HOME)
export TRANSCENDENCE_HOME
SERVICE1 = webserver
SERVICE2 = dbserver
SERVICE3 = contentserver
SERVICE9 = adminer
#SERVICES = $(SERVICE1) $(SERVICE2) $(SERVICE3)
SERVICES = $(SERVICE2)


# dbserver data directory
DB_DATA_DIR = $(TRANSCENDENCE_HOME)/data/dbserver

.PHONY: all web db content client webclean dbclean contentclean clientclean
# --build image if not exists and run it in detached mode (-d)
# --hints about .env location.
# --also saves space. Deletes all images not used by any containers, even tagged ones.
# docker --env-file srcs/.env compose -f srcs/docker-compose.yml config   <<-helped
all: .env $(DB_DATA_DIR)
	echo $(TRANSCENDENCE_HOME)
	docker compose --project-directory srcs -f srcs/docker-compose.yml up --build -d


# Create data directory if does not exists
$(DB_DATA_DIR):
	@mkdir -p $(DB_DATA_DIR)
	@echo "Directorio $(DB_DATA_DIR) creado"

# Individual rules


web:
	docker compose --project-directory srcs -f srcs/docker-compose.yml build webserver
webclean:
	docker image rm $(SERVICE1)

db:
	docker compose --project-directory srcs -f srcs/docker-compose.yml build dbserver
dbclean:
	docker image rm $(SERVICE2)

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
	sudo rm -rf $(TRANSCENDENCE_HOME)/data/db/*

