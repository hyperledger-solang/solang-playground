FROM rust:1.86.0 as builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install NVM
ENV NVM_DIR /usr/local/nvm
RUN mkdir -p $NVM_DIR && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Set up Rust environment
RUN rustup default stable && \
    rustup target add wasm32-unknown-unknown

# Install Node.js
ENV NODE_VERSION v20.14.0
RUN . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm use $NODE_VERSION

# Install cargo-make
RUN . $NVM_DIR/nvm.sh && \
    nvm use $NODE_VERSION && \
    cargo install cargo-make --locked

WORKDIR /app

# Copy only necessary files for dependency installation
COPY Cargo.toml Cargo.lock Makefile.toml ./
COPY packages/frontend/package.json packages/frontend/package-lock.json ./packages/frontend/

# Install frontend dependencies
RUN . $NVM_DIR/nvm.sh && \
    nvm use $NODE_VERSION && \
    cd packages/frontend && \
    npm install --include=dev && \
    npm ls @stellar/stellar-sdk

# Copy the rest of the source code
COPY . .

# Build the application (with corrected paths)
# Build the application
RUN . $NVM_DIR/nvm.sh && \
    nvm use $NODE_VERSION && \
    cargo make deps-wasm && \
    cargo make build-backend && \
    echo "Building frontend app..." && \
    (cd packages/frontend && npm run build) && \
    echo "Building frontend production bundle..." && \
    (cd packages/frontend && npm run build) && \
    cargo make build-bindings


# Stage 2: Final runtime image
FROM nestybox/ubuntu-jammy-systemd-docker:latest

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 \
    curl \
    dos2unix \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get update && apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder /app/target/release/backend ./target/release/
COPY --from=builder /app/packages/frontend/.next ./packages/frontend/.next
COPY --from=builder /app/packages/frontend/node_modules ./packages/frontend/node_modules

# Create symbolic link for frontend dist
RUN mkdir -p /app/packages/app && \
    ln -s /app/packages/frontend/.next /app/packages/app/dist

# Copy scripts
COPY sysbox/on-start.sh /usr/local/bin/on-start.sh
COPY start-services.sh /app/start-services.sh

# Fix permissions and line endings
RUN dos2unix /usr/local/bin/on-start.sh /app/start-services.sh && \
    chmod +x /usr/local/bin/on-start.sh /app/start-services.sh

EXPOSE 4444 3000
ENTRYPOINT ["/usr/local/bin/on-start.sh"]
