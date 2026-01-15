# Use Debian as base instead of the official Bun image
# This allows us to install the baseline Bun build for older CPUs (no AVX2 required)
FROM debian:12-slim AS base
WORKDIR /app

# Install necessary dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Download and install Bun baseline build for older CPUs without AVX2 support
# This is necessary for Synology NAS devices and other systems with older Intel Celeron/Atom CPUs
RUN curl -fsSL https://github.com/oven-sh/bun/releases/latest/download/bun-linux-x64-baseline.zip -o bun.zip \
    && unzip bun.zip \
    && mv bun-linux-x64-baseline/bun /usr/local/bin/bun \
    && chmod +x /usr/local/bin/bun \
    && rm -rf bun.zip bun-linux-x64-baseline

# Install dependencies
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
# This runs "bun run build.ts" which builds the frontend to ./dist
RUN bun run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["bun", "run", "start"]
