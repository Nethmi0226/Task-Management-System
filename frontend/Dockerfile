# Stage 1 — Build the React app
# We use a full Node image to run the build
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the React app — this creates a dist/ folder with static HTML, CSS, JS
ENV VITE_API_URL=https://tms-backend-group10.azurewebsites.net
RUN npm run build

# Stage 2 — Serve the built files with Nginx
# Nginx is a lightweight web server perfect for serving static files
FROM nginx:alpine

# Copy the built React files into the Nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a custom Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (standard HTTP)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]