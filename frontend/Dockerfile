ARG NODE_VERSION=24.14.0-alpine

FROM node:${NODE_VERSION} AS dev

WORKDIR /frontend

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
