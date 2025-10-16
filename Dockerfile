FROM node:23.0.0

# Set working directory
WORKDIR /usr/src/app

# Install Oracle Instant Client dependencies for Debian/Ubuntu
RUN apt-get update && \
    apt-get install -y \
    libaio1 \
    libaio-dev \
    wget \
    unzip \
    git && \
    rm -rf /var/lib/apt/lists/*

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --force

# Copy all project files (including instantclient folder)
COPY . .

# Set permissions for instant client
RUN chmod -R 755 instantclient/linux/instantclient_21_12/

# Configure ldconfig for Oracle libraries
RUN echo "/usr/src/app/instantclient/linux/instantclient_21_12" > /etc/ld.so.conf.d/oracle-instantclient.conf && \
    ldconfig

# Verify instant client setup
RUN ldd instantclient/linux/instantclient_21_12/libclntsh.so.21.1 | grep "not found" || echo "All libraries found"

# Expose your app port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]