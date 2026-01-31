# --- ETAPA 1: Builder ---
FROM python:3.11-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Instalamos dependencias para compilar psycopg2
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Creamos un entorno virtual en una ruta predecible
RUN python -m venv /opt/venv
# Aseguramos que los siguientes comandos usen el venv
ENV PATH="/opt/venv/bin:$PATH"

# Actualizamos pip ANTES de instalar nada
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Seguridad: Usuario no-root
RUN useradd -m totp && chown -R totp:totp /app
USER totp
COPY generate_encrypt_key.py .
RUN python3 generate_encrypt_key.py

# --- ETAPA 2: Final ---
FROM python:3.11-slim

WORKDIR /app

# Librería de runtime para Postgres
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# COPIA EL ENTORNO VIRTUAL COMPLETO
# Esto es mucho más seguro que copiar carpetas ocultas
COPY --from=builder /opt/venv /opt/venv

# Activamos el entorno virtual en la imagen final
ENV PATH="/opt/venv/bin:$PATH"

# Copiamos el código
COPY . .



# Seguridad: Usuario no-root
RUN useradd -m totp && chown -R totp:totp /app
USER totp

# Create the specific directory structure your code expects for the master key.
# The code looks for: os.environ["HOME"] + "/.ssh/.encrypt.key"
# In Docker, HOME is usually /root
RUN mkdir -p /home/totp/.ssh
COPY --from=builder /home/totp/.ssh/.encrypt.key /home/totp/.ssh/.encrypt.key
RUN chmod 400 /home/totp/.ssh/.encrypt.key
# El valor por defecto (8000) solo se usa si NO se pasa el ARG desde docker-compose
ARG TOTP_CONTAINER_PORT=8000
# Convierte a ENV para runtime
ENV PORT=${TOTP_CONTAINER_PORT}

EXPOSE ${TOTP_CONTAINER_PORT}

# Al estar el venv en el PATH, 'uvicorn' se encontrará directamente
#CMD ["uvicorn", "totp:app", "--host", "0.0.0.0", "--port", "8000"]
#CMD uvicorn app:app --host 0.0.0.0 --port ${PORT}

# ✅ FUNCIONA - pero sin variables
#CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

# ✅ FUNCIONA - usa /bin/sh -c para expandir variables
#CMD uvicorn app:app --host 0.0.0.0 --port ${TOTP_CONTAINER_PORT}

# Use Exec form (brackets) for better signal handling (CTRL+C works better)
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT} --reload"]