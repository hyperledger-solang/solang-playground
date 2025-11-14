FROM rust:1.86.0 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    curl \
    build-essential \
    python3 \
    make \
    g++ \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js directly (simpler and more reliable than NVM in Docker)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Verify Node.js and npm installation
RUN node --version && npm --version

# Set up Rust environment
RUN rustup default stable && \
    rustup target add wasm32-unknown-unknown

# Install cargo-make
RUN cargo install cargo-make --locked

WORKDIR /app

# Copy configuration files for better caching
COPY Cargo.toml Cargo.lock Makefile.toml ./

# Copy root package files for workspace dependencies
COPY package.json package-lock.json* ./

# Install all workspace dependencies at root (use npm ci for reproducible builds)
RUN if [ -f package-lock.json ]; then npm ci --include=dev; else npm install --include=dev; fi

# Copy the rest of the source code
COPY . .

# Build the application
RUN cargo make deps-wasm && \
    cargo make build-backend

# Build frontend with proper context
RUN npm run build --workspace=frontend

# Build bindings after frontend is built
RUN cargo make build-bindings

# Stage 2: Final runtime image
FROM nestybox/ubuntu-jammy-systemd-docker:latest

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 \
    curl \
    dos2unix \
    lsb-release \
    gnupg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for runtime
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get update && apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder /app/target/release/backend ./target/release/

# Copy frontend build artifacts
COPY --from=builder /app/packages/frontend/.next ./packages/frontend/.next
COPY --from=builder /app/packages/frontend/node_modules ./packages/frontend/node_modules
COPY --from=builder /app/packages/frontend/package.json ./packages/frontend/
COPY --from=builder /app/packages/frontend/public ./packages/frontend/public

# Create symbolic link for frontend dist
RUN mkdir -p /app/packages/app && \
    ln -s /app/packages/frontend/.next /app/packages/app/dist

# Copy scripts
COPY sysbox/on-start.sh /usr/local/bin/on-start.sh
COPY start-services.sh /app/start-services.sh

# Fix permissions and line endings
RUN dos2unix /usr/local/bin/on-start.sh /app/start-services.sh && \
    chmod +x /usr/local/bin/on-start.sh /app/start-services.sh

# Create necessary directories and set permissions
RUN mkdir -p /var/log/solang-playground && \
    chmod -R 755 /var/log/solang-playground

EXPOSE 4444 3000

# Health check (optional but recommended)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["/usr/local/bin/on-start.sh"]