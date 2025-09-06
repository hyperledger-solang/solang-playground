# Solang Playground - A Solidity web editor for [Hyperledger Solang](https://github.com/hyperledger/solang)

Welcome to Solang Playground, a Solidity web editor for that enables editing, compiling, deploying and interacting with Solidity smart contracts on Solana or Polkadot.

## Demo

You can experiment with a [hosted version of Solang Playground](https://solang.io/).

## Building

```sh
cargo install cargo-make
cargo make deps
cargo make build
```

## Running

```sh
cargo make run
```

By default, the server will be available at `http://localhost:9000`.

## Interacting with Smart Contracts on Chain

Once you have compiled your smart contracts using Solang Playground, you can deploy and interact with them on-chain. See [tutorial](docs/interact_with_contracts_on_chain.md) for detailed instructions.

## Testing

Solang Playground test suite includes tests for the backend and the frontend. To run all available tests, you have to first start the server with `cargo make run` in a separate terminal, and then run the following command:

```sh
cargo make test
```

## Project Structure

This repository has two main parts:

- **`crates`**: Rust code, including:
  - `backend`: Actix Web server for the frontend.
  - `generate_bindings`: Generates TypeScript bindings for API endpoints.
  - `solang`: Contains the `solang-parser`
  - `browser`: Contains the monaco editor web server
- **`packages`**: TypeScript project for the frontend app, served by the Rust backend.

## Docker

### Pre-requisites

The Dockerfile for Solang Playground relies on Nestybox's Sysbox runtime. This helps compile Solang Smart Contracts within a protected Docker environment. We also use a multi-stage build process to improve image size.

Here are the [instructions to install Sysbox](https://github.com/nestybox/sysbox/blob/master/docs/user-guide/install-package.md#installing-sysbox)

### Building the Docker Image Locally

```sh
docker build -t solang-playground .
```

You can then run the image with:

```sh
cargo make docker-run
```

The docker image is also available on Docker Hub:

```sh
docker pull salaheldin18/solang-playground-amd64
```

## Roadmap and Status

### V0.1

| Milestone                                                                    | Related Feature                                                                                                                | Status      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| Compile Solang language server to WASM, and integrate it to a Monaco editor. | Allow editing Solidity source files in the browser, with smarts provided from the server (Diagnostics, code completion, etc..) | Completed   |
| Host Solang on a backend service                                             | Allow compiling smart contracts on the web editor                                                                              | Completed   |
| Support Polkadot API                                                         | Allow the deployment and interaction with Solidity contracts on Polkadot                                                       | Completed   |
| IDE Improvements                                                             | Improve developer experience when trying out the IDE, making it a more attractive option for Solidity devs                     | In progress |

## Acknowledgments

- This project started out as a fork of https://github.com/silvanshade/tower-lsp-web-demo. [Darin Morrison](https://github.com/silvanshade) created a demo project where an example tower-lsp language server was compiled to WASM and integrated in a Monaco web editor.
- The structure of `solang-playground` is significantly inspired by [`ink-playground`](https://github.com/use-ink/ink-playground). This includes the implementation of running the Solang compiler functionality in a sandboxed environment.
