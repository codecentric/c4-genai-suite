# Developers Guide

## Prerequisites

- **Node.js**: Version as specified in `.nvmrc`
  - We recommend using `nvm` to manage Node.js versions
- **Postgres**: Automatically configured via Docker Compose
  - Uses pgvector image for vector storage
- **Python** (currently required): Required for REI-S (Retrieval & Ingestion Server)
  - uv (>= 0.5.0) for dependency management ([installation guide](https://docs.astral.sh/uv/getting-started/installation/))
  - Python version compatibility issues can be managed with `uv`
- **JRE** (currently required): Required when changing APIs only, to run the OpenAPI Generator. Creates or updates API client files for
  - frontend to backend access
  - backend to REI-S access

### 1. Node Setup

Set up the `node` version specified in the `.nvmrc` file. We recommend using `nvm install`.

> [!TIP]
> Also check your node version if you run into unexpected errors later during development.

### 2. Python Setup

Make sure uv (>=0.5.0) is available. See the [uv installation guide](https://docs.astral.sh/uv/getting-started/installation/) for instructions. It will manage the python installation (regardless if and which version of python is installed systemwide.)

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

### 5. Verify your setup and start developing

Run `npm run dev` in the root of the repository to start all components locally and try them out. This will use docker for some components like the postgres database.
Other components will directly run on your system, and **your systems ports will be used if available**. Live reloading is enabled for the react frontend.

To debug any issues, checkout the `./output` during, or after the run of `npm run dev`.
Read [the dev script documentation](./scripts/README.md) to learn more.

## Run tests

### Locally

To run them locally use `npm run test`.

The [E2E tests script](./scripts/README.md) is the same script we use to run `npm run dev` (just run in its E2E configuration).

To **debug the E2E tests with breakpoints** you need to run VS-Code with the Playwright extension (by Microsoft).
Inside VS-Code press `CTRL+SHIFT+D` to open the debug panel. You will see a drop down next to a green arrow.
Select one of these options, and run it:
- **All-E2Es**: Run with Playwright Debug
- **Current-E2E**: Debug Currently Open Test File

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
uv run python rei_s/generate_open_api.py
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
