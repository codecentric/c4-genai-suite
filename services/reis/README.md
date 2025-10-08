# REI-S

**R**etrieval **E**xtraction **I**ngestion **S**erver

This server offers RAG functionality for c4.

## Getting started

For development, install `python` and `poetry`. Then the REI-S can be started with

```bash
poetry install --with dev
poetry run fastapi dev rei_s/app.py --port 3201
```

## Testing

The tests can be run with

```bash
poetry run pytest -rs
```

Note that end-to-end (e2e) Tests, which test the integration to a third party service (e.g., pgvector, whispher, AI Search),
will be skipped if the corresponding connection information is not given as either an environment variable
or in ".env.test" in the reis root directory.

Unit tests and e2e tests can also run selectively with

```bash
poetry run pytest -rs tests/unit
poetry run pytest -rs tests/e2e
```

Also note that the stress tests are always skipped and can be run with the following command.
They need an independent running instance of REI-S.
The url of REI-S can be defined with the environment variable `TEST_REIS_URL` and falls back to `http://localhost:3201`.
However be careful against which environment you run it, since it might generate costs.

We suggest to run it against a local postgres with the `random-test-embeddings` embeddings provider.

```bash
poetry run pytest -rs --stress tests/stress
```

## Open API

To generate the specs `reis-dev-spec.json`, run `poetry run python rei_s/generate_open_api.py` in this directory.

## Vector stores

Currently REI-S supports Azure AI Search and pgvector (e.g. provided by the [c4 docker compose dev setup](../../dev/postgres/docker-compose.yml))

The used store can be specified using the environment variables:

### Azure AI Search:

```bash
STORE_TYPE=azure-ai-search
# other STORE_AZURE_AI_SEARCH_* variables from .env.example
```

### pgvector:

```bash
STORE_TYPE=pgvector
STORE_PGVECTOR_URL=postgres+psycopg://admin:secret@localhost:5432/cccc
```

## File stores

Optionally, REIS can save a pdf preview of the uploaded file in a file store.

This feature is activated by supplying a FILE_STORE_TYPE env variable.

If it is activated, c4 will be able to show a pdf version of the uploaded file,
if a user clicks on a source.

Note that activation of this feature will lead to every file to be converted to
a pdf before being parsed and chunked. This is necessary to supply the metadata
of the chunks with the correct page number.

Also, if this feature is active, LibreOffice needs to be available on the system.
In our the docker image, this is the case.

On MacOS it might be necessary to install further system dependecies for pdf generation
with `brew install glib cairo pango gdk-pixbuf harfbuzz libxml2 libxslt gobject-introspection fontconfig freetype pkg-config libffi`

### S3:

```bash
FILE_STORE_TYPE=s3
# other FILE_STORE_S3_* variables from .env.example
```

### filesystem:

This option will save the files at a specified location in the file system.

This is not advised to use in production, but provided for easy setup for experiments and development.

## Example configuration in c4

In c4, the configuration is a multi step process.

![video showing the process of configuring file search for an assistant](./docs/rag.webp)

### Create a bucket

First, a bucket needs to be created: `Administration > Files > "+"`

Choose a sensible name and the REI-S instance as the Endpoint.
For local development it is by default `http://localhost:3201`.
If you want to use the REI-S started with the docker compose, use `http://reis:3201`.

For a detailled explanation about all the option, see [the administrator documentation.](../../frontend/public/docs/admin/files/index.md)

### Add an extension to the deployment

Next, an Extension needs to be added to a deployment: `Administration > Assistants > [asstistant name] > Add Extension`

You can choose one of the extensions which handle files and are integrated with REI-S.
A detailled explanation which extension should be used for which use case is available in [the administrator documentation](../../frontend/public/docs/admin/assistants/index.md)

### When are user files queried

Currently the LLM is encouraged to query the user files and is possibly given a list of the filenames to decide whether a query is performed against the files (if the tool description has enough space left to fit all filenames).
However, the LLM might decide that it already knows the answer or does not recognize that a tool call to the file tool would be advantageous.

These cases can be mitigated by changing the prompt to explicitly mention that the LLM should look up a file.

If this is not an option, the admin can modify the bucket description or the system prompt can be extended with explicit directions.
