FROM node:23.0.0

WORKDIR /home/m.farhan/integration-management-be

# Install Git
RUN apt-get update && \
    apt-get install -y git && \
    rm -rf /var/lib/apt/lists/*

# Copy all project files (including src/, public/, etc.)
COPY . .

# Install dependencies and build the project
RUN npm install --force && npm run build

# Expose your app port
EXPOSE 3000

CMD ["npm", "run", "start"]
