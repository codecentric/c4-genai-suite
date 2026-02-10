# End-to-End Test Runner Script

This Node.js script automates starting the app in dev mode as well as running Playwright end-to-end tests.

## Features

It orchestrates the multiple services needed(PostgreSQL, frontend, backend, REIS, MCP Tool), checks port availability, supports persistent dev mode, and ensures graceful shutdown.

## CLI Arguments

| Flag                          | Description                                                                 |
| ----------------------------- | --------------------------------------------------------------------------- |
| `--forceUsingRunningServices` | Reuse already running services if ports are taken                           |
| `--devSetup`                  | Enables dev mode: uses port 5432 for PostgreSQL and skips DB teardown       |
| `--noAutoKill`                | Prevents automatic shutdown after test completion (implied by `--devSetup`) |
| `--forceTestsOnDev`           | Forces tests to run even in `--devSetup` mode (normally skipped)            |
| `--file <path>`               | Runs only the specified test file                                           |
| `--withoutExpensiveTests`     | Skips tests in the `expensive-tests` directory                              |
| `--withoutNormalTests`        | Skips standard E2E tests                                                    |
| `--ui`                        | Launches Playwright UI                                                      |
| `--debug`                     | Enables debug mode for Playwright                                           |

Call Example: `node scripts/run-tests.js --file tests/administration/userGroups.spec.ts --debug`

## Service Overview

| Service      | Port                        | Notes                            |
| ------------ | --------------------------- | -------------------------------- |
| `PostgreSQL` | `5432` (dev) / `5433` (e2e) | Chooses based on `--devSetup`    |
| `Backend`    | `3000`                      | Node.js/Express or equivalent    |
| `Frontend`   | `5173`                      | Vite/React frontend              |
| `REIS`       | `3201`                      | FastAPI-based microservice       |
| `Minio`      | `9000` (dev) / `9001` (e2e) | S3 Chooses based on `--devSetup` |
| `MCP Tool`   | `8000`                      | A Dockerized mcp example service |

## Log Output

All output files are written to the `./output` directory. All log files are reset with a new run of the dev/test script.

| Log File                  | Description                    |
| ------------------------- | ------------------------------ |
| `e2e-postgres-docker.log` | Docker output for PostgreSQL   |
| `frontend.log`            | Frontend dev server log        |
| `backend.log`             | Backend server log             |
| `reis.log`                | REIS service log               |
| `e2e-minio-docker.log`    | Docker output for Minio        |
| `mcp-tool.log`            | MCP tool service log           |
| `playwright-install.log`  | Playwright installation output |

Tip: use `tail -f ./output/*.log` to watch all logs live.

## Tips

| Tip                                                                                                    | Context                                 |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Run `nvm install && npm install` before this script                                                    | Ensures proper Node.js and dependencies |
| Use `--forceUsingRunningServices` if services are already running                                      | Avoids port conflicts                   |
| Press `CTRL+C` when using `--noAutoKill` to terminate all processes                                    | Manual shutdown mode                    |
| In VS-Code press `CTRL+SHIFT+D` to run all/the current E2E via the playwright extension (by Microsoft) | Enables debugging with Breakpoints      |
