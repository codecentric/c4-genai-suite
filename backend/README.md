# Backend

## Description

The backend is based on [Nest](https://github.com/nestjs/nest).

## Installation

Install npm dependencies
```bash
$ npm install
```

Copy the `.env.example` to `.env` and modify as desired.

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev
```

## Create migrations

Migrations are used to keep the database in sync with the entities.
Whenever a change is made to the entities a migration file should be created.

```bash
# create empty migration file with name <migration>
npm run migration:create --name=<migration>

# generate migration based on diff between typeorm entities and database
npm run migration:generate --name=<migration>

# generate migration dry run
npm run migration:generate:dryrun

# run all pending migrations
npm run migration:run

# reverts the latest migration
npm run migration:revert
```

## Create Extensions

Each extension class needs to meet the following criteria:
- class need to include the decorator @Extension
- class need to implement the interface Extension
- class must be added to the providers list in src/extensions/module.ts

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
