FROM node:18-alpine

WORKDIR /app

RUN npm install -g typescript http-server

EXPOSE 3000

CMD sh -c "tsc --watch & http-server -p 3000 -c-1"
