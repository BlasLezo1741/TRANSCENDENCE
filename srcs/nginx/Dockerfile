# Usamos Alpine porque es una versión de Linux súper ligera y rápida
FROM nginx:alpine

# Instalamos OpenSSL para poder generar los certificados
RUN apk update && apk add --no-cache openssl

# Creamos la carpeta donde guardaremos los certificados
RUN mkdir -p /etc/nginx/ssl

# Generamos el certificado SSL autofirmado (Válido por 365 días)
# Genera dos archivos: nginx.crt (tu certificado público) y 
# nginx.key (tu clave privada).
# -nodes: No encripta la clave privada con contraseña (necesario para que Nginx arranque solo)
# -subj: Rellena los datos del certificado automáticamente sin preguntar por consola
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=ES/ST=Catalonia/L=Barcelona/O=42/CN=localhost"

# Exponemos el puerto seguro
EXPOSE 443

# Comando por defecto para arrancar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]