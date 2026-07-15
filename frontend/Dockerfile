FROM node:20-slim

WORKDIR /frontend

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY . .

EXPOSE 3000
