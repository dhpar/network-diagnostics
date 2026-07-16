# =========================================
# Stage: Development (Vite React.js App)
# =========================================
ARG NODE_VERSION=24.14.0-alpine
 
FROM node:${NODE_VERSION} AS dev
 
# Set working directory inside the container
WORKDIR /
 
# Copy package files
COPY package*.json ./
 
# Install dependencies
RUN npm install
 
# Copy rest of the source code
COPY . .

COPY --chown=node:node . /

 
# Expose Vite dev server port
EXPOSE 3000
 
# Run Vite in dev mode, accessible outside the container
CMD ["npm", "run", "dev"]
