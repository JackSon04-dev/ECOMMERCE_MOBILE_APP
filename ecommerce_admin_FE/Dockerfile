# Stage 1: Build Vue application (using Node 18 to share Docker cache with Backend)
FROM node:18-alpine AS build-stage

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all code
COPY . .

# Build Vue application
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine

# Copy built files from build-stage to Nginx default folder
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy our custom Nginx config for routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
