FROM node:16-bullseye

# Update and remove list of packages
# Install and use Jemalloc
RUN apt-get update && apt-get install libjemalloc2 && rm -rf /var/lib/apt/lists/*
ENV LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so.2

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .
