# Use the official Node.js 24.14.1 image as the base
# alpine means a small lightweight version of Linux
FROM node:24-alpine

# Create a working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first
# We do this separately so Docker can cache the npm install step
# and only re-run it when dependencies change
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy the rest of your source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Create the uploads folder inside the container
RUN mkdir -p uploads/tasks

# Expose port 5000 so Azure can reach your server
EXPOSE 5000

# Start the compiled JavaScript server
CMD ["node", "dist/server.js"]