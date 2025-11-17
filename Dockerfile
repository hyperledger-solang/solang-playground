# Stage 1: Builder image for compiling Rust and building the frontend
FROM rust:1.86.0 as builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    curl

# Install NVM and Node.js
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION v20.17.0
RUN mkdir -p $NVM_DIR && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
    . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm use $NODE_VERSION

# Set up the shell environment for subsequent RUN commands
SHELL ["/bin/bash", "-c"]

# Set up Rust environment
RUN rustup default stable && \
    rustup target add wasm32-unknown-unknown

# Install cargo-make for build automation
RUN . $NVM_DIR/nvm.sh && nvm use $NODE_VERSION && cargo install cargo-make --locked

WORKDIR /app

# Copy source code
COPY . .

# Install ALL frontend dependencies (including devDependencies for the build )
RUN . $NVM_DIR/nvm.sh && nvm use $NODE_VERSION && \
    cd packages/frontend && \
    npm install --include=dev

# Build the entire application
RUN . $NVM_DIR/nvm.sh && nvm use $NODE_VERSION && \
    cargo make deps-wasm && \
    cargo make build-backend && \
    (cd packages/frontend && npm run build) && \
    cargo make build-bindings


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

# Install Node.js using NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get update && apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built backend artifact
COPY --from=builder /app/target/release/backend ./target/release/

# Copy frontend source and build artifacts (but NOT node_modules )
COPY --from=builder /app/packages/frontend ./packages/frontend

# *** FIX: Install production dependencies directly in the final image ***
RUN cd /app/packages/frontend && npm install --production

# Create symbolic link for the frontend distribution
RUN mkdir -p /app/packages/app && \
    ln -s /app/packages/frontend/.next /app/packages/app/dist

# Copy and prepare scripts
COPY sysbox/on-start.sh /usr/local/bin/on-start.sh
COPY start-services.sh /app/start-services.sh
RUN dos2unix /usr/local/bin/on-start.sh /app/start-services.sh && \
    chmod +x /usr/local/bin/on-start.sh /app/start-services.sh

EXPOSE 4444 3000
ENTRYPOINT ["/usr/local/bin/on-start.sh"]
