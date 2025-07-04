# Developers Guide

## Prerequisites

- **Node.js**: Version as specified in `.nvmrc`
  - We recommend using `nvm` to manage Node.js versions
- **Postgres**: Automatically configured via Docker Compose
  - Uses pgvector image for vector storage
- **Python** (currently required): Required for REI-S (Retrieval & Ingestion Server)
  - Poetry (>= 1.2) for dependency management
  - Python version compatibility issues can be managed with `pyenv`
- **JRE** (currently required): Required when changing APIs only, to run the OpenAPI Generator. Creates or updates API client files for
  - frontend to backend access
  - backend to REI-S access

### 1. Node Setup

Set up the `node` version specified in the `.nvmrc` file. We recommend using `nvm install`.

> [!TIP]
> Also check your node version if you run into unexpected errors later during development.

### 2. Python Setup

Set up the python version specified in the .python-version file and make sure poetry (>=1.2) is available.

> [!TIP]
> In some circumstances, a call to `poetry install` might trigger a lookup to the keyring, which can cause a modal dialog from kwallet to appear.
> To avoid this, run the following command before calling poetry: `export PYTHON_KEYRING_BACKEND=keyring.backends.null.Keyring`

### 3. Install packages

At the top level (repo-root) install dependencies via `npm install`. This includes (amongst others)
* dependencies required by the pre-commit hooks enforcing coding standards and formatting.
* dependencies required by frontend and backend.
* dependencies required by the OpenAPI Generator to generate the API client files for frontend and backend.
* dependencies required by the REI-S service to run the Python server and generate OpenAPI specs.

### 4. Setup the environment

Setup all your local environment files with `npm run env`.
This will automatically create and update `.env` files based on the `.env.example` files (and backup old `.env` files if needed).

In this step, you might be asked for some API-Keys, e.g., for the REI-S.

> [!TIP]
> Update your `.env` files using the same script later if a default may have changed. You will be asked to pick between overwriting or keeping your current setting.

## Run tests

### Locally

To run them locally use `npm run test` (stop anything that could block the ports for frontend or backend before running the tests).

You can also view the outputs in the `/outputs` directory for services started by the dev/test script.

Some tests use large files stored via `git lfs`. To run these tests, first install `git lfs` on your system via (e.g., `brew install git-lfs` or `apt install git-lfs`).
Then pull the large files in the c4 repository via `git lfs pull`.

### On Github

Tests are automatically performed by GitHub Actions when opening a pull request.

## Run the application for development

Run `npm run dev` to start frontend, backend and the required postgres docker.

Access the frontend at <http://localhost:5173>, running in development mode with live updates. Use the login details in `backend/.env`.

View service outputs in the `/outputs` folder.

For more details, like how to run only a single test for development, see [the readme of the scripts](scripts/README.md).

## Main Building Blocks

The application consists of a **Frontend** (`/frontend`), a **Backend** (`/backend`), and a **REI-S** (`/services/reis`) service.

## Building Block Interaction

The basic interaction between the frontend, backend, and REI-S service is as follows:

1. **Frontend**: The user interacts with the frontend, which sends requests to the backend.
2. **Backend**: The backend processes these requests, handles user authentication, and communicates with the REI-S service for file indexing and retrieval.
3. **REI-S Service**: The REI-S service indexes files and provides search capabilities, returning results to the backend, which then feeds them to the LLM and sends the generated answer to the frontend for display.

The interfaces between the Frontend > Backend > REI-S service are defined using OpenAPI specifications. The specs are generated using OpenAPI generators. These specifications itself allow for automatic generation of TypeScript API files ensuring type safety and consistency across the application.

For convenience you can run the following command in the root to regenerate all specs and apis (Frontend->Backend and Backend->REI-S)

```bash
# Regenerate all OpenAPI specs and TypeScript API files
npm run generate-apis
```

Before generating the APIs, ensure all dependencies are installed by running either `npm install-all` or running `npm install` manually in frontend, backend and all service subdirectories.

Some more details on the OpenAPI specifications and how to regenerate them are provided below.

### Backend REST-API

The frontend communicates with the backend using TypeScript API files generated from the OpenAPI specification. If you change the backend API, you need to regenerate

1. the OpenAPI specification for the backend and
2. the TypeScript API files in the frontend.

Within the `/backend` folder:

```bash
# re-generate backend-dev-spec.json
npm run generate-openapi-dev
```

... and then in `/frontend` folder:

```bash
npm run generate-api
```

### REI-S REST-API

The backend communicates with the REI-S service using Python client files generated from the OpenAPI specification. If you change the REI-S API, you need to regenerate

1. the OpenAPI specification for the REI-S service and
2. the TypeScript API files in the frontend.

Within the `/services/reis` folder:

```bash
# re-generate reis-dev-spec.json
`poetry run python rei_s/generate_open_api.py`
```

... and then in `/backend` folder:

```bash
npm run generate-reis
```

## Development Hints

### Adjust Line Endings (for Windows Users)

To ensure proper line endings, configure Git:

```
git config --global core.autocrlf input
```