# --- ETAPA 1: Builder ---
FROM python:3-slim AS builder

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

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# --- ETAPA 2: Final ---
FROM python:3-slim

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

# Create the specific directory structure your code expects for the master key.
# The code looks for: os.environ["HOME"] + "/.ssh/.encrypt.key"
# In Docker, HOME is usually /root
RUN mkdir -p /root/.ssh

# Seguridad: Usuario no-root
RUN useradd -m myuser && chown -R myuser:myuser /app
USER myuser

EXPOSE 8000

# Al estar el venv en el PATH, 'uvicorn' se encontrará directamente
#CMD ["uvicorn", "totp:app", "--host", "0.0.0.0", "--port", "8000"]
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]