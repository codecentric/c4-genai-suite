# Helm Chart - c4 GenAI Suite

## Prerequisites

- A Kubernetes cluster
- A PostgreSQL database
- Any of the following Large Language Models providers:
  - Amazon Bedrock
  - Azure OpenAI
  - Google GenAI
  - OpenAI or anything OpenAI API-compatible
  - Ollama or anything Ollama API-compatible
- One of the following vector databases:
  - Azure AI Search
  - PostgreSQL with PGVector

## Getting Started

```bash
helm install codecentric-company-chat oci://ghcr.io/codecentric/company-chat/charts/c4-genai-suite -f values.yaml
```

### Example `values.yaml`

```yaml
ingress:
  enabled: true
  host: c4.example.com
  tlsSecretName: my-tls-cert

backend:
  auth:
    enablePassword: true
    initialAdminUsername: my-admin-username
    initialAdminPassword: my-admin-password
  postgresql:
    connectionString: postgresql://my-username:my-password@my-host:my-port/my-db
  sessionSecret: my-session-secret

reis:
  enabled: true
  embeddings:
    type: azure-openai
    azureOpenAi:
      apiKey: my-openai-api-key
      endpoint: https://example-sweden-dev.openai.azure.com/
      deploymentName: text-embedding-3-large
      apiVersion: 2023-07-01-preview
      modelName: text-embedding-3-large
  vectorDatabase:
    type: azure-ai-search
    azureAiSearch:
      apiKey: my-search-api-key
      endpoint: https://example.search.windows.net
      indexName: cc-prod-rei-server
```

## Parameters

### General

| Name                        | Description                                                                   | Value   |
| --------------------------- | ----------------------------------------------------------------------------- | ------- |
| `fullnameOverride`          | Overrides the name of the resources                                           | `""`    |
| `nameOverride`              | Overrides the name of the chart                                               | `""`    |
| `networkPolicy.enabled`     | Specifies whether NetworkPolicies should be created                           | `false` |
| `grafanaDashboards.enabled` | Specifies whether a ConfigMap containing Grafana dashboards should be created | `false` |

### Ingress

| Name                       | Description                                                                 | Value   |
| -------------------------- | --------------------------------------------------------------------------- | ------- |
| `ingress.enabled`          | Specifies whether an Ingress resource should be created.                    | `false` |
| `ingress.ingressClassName` | The name of the ingressClass. One of: public-traefik, internal-traefik      | `""`    |
| `ingress.clusterIssuer`    | The cluster issuer for Let's Encrypt. Should be `letsencrypt-<ENVIRONMENT>` | `""`    |
| `ingress.host`             | The host for ingress                                                        | `""`    |
| `ingress.tlsSecretName`    | The TLS secret name. Should be c4-tls-cert                                  | `""`    |

### Backend

| Name                                                  | Description                                                                                                                                                                                                             | Value                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `backend.enabled`                                     | Specifies whether c4 should be deployed                                                                                                                                                                                 | `true`                                       |
| `backend.baseUrl`                                     | Base URL should match `https://{{ingress.host}}`. Required for OpenID Connect or assistants using Dall-E image generation.                                                                                              | `""`                                         |
| `backend.ssl.rootCertificateConfigMapName`            | Name of the ConfigMap containing the root certificate for the external services.                                                                                                                                        | `""`                                         |
| `backend.ssl.rootCertificateConfigMapKey`             | Key in the ConfigMap that holds the root certificate for the external services.                                                                                                                                         | `ca.crt`                                     |
| `backend.auth.enablePassword`                         | Specifies if the build in Username & Password auth is used                                                                                                                                                              | `false`                                      |
| `backend.auth.initialAdminUsername`                   | The initial admin user Username saved in DB                                                                                                                                                                             | `""`                                         |
| `backend.auth.initialAdminPassword`                   | The initial admin user Password hashed and saved in DB                                                                                                                                                                  | `""`                                         |
| `backend.auth.existingAdminSecret`                    | The name of the existing k8s secret. `c4.auth.initialAdminUsername` and `c4.auth.initialAdminPassword` will be ignored. The keys must be `adminUsername` and `adminPassword`.                                           | `""`                                         |
| `backend.auth.authorizationUrl`                       | The OpenID Connect authorizationUrl                                                                                                                                                                                     | `""`                                         |
| `backend.auth.tokenUrl`                               | The OpenID Connect tokenUrl                                                                                                                                                                                             | `""`                                         |
| `backend.auth.userInfoUrl`                            | The OpenID Connect userInfoUrl                                                                                                                                                                                          | `""`                                         |
| `backend.auth.clientId`                               | The OpenID Connect clientId                                                                                                                                                                                             | `""`                                         |
| `backend.auth.clientSecret`                           | The OpenID Connect clientSecret                                                                                                                                                                                         | `""`                                         |
| `backend.auth.existingClientId`                       | The name of the existing k8s secret. `c4.auth.clientId` will be ignored. The key must be `clientId`                                                                                                                     | `""`                                         |
| `backend.auth.existingClientSecret`                   | The name of the existing k8s secret. `c4.auth.clientSecret` will be ignored. The key must be `clientSecret`                                                                                                             | `""`                                         |
| `backend.auth.microsoftClientId`                      | The Microsoft Entra ID clientId                                                                                                                                                                                         | `""`                                         |
| `backend.auth.microsoftClientSecret`                  | The Microsoft Entra ID clientSecret                                                                                                                                                                                     | `""`                                         |
| `backend.auth.microsoftTenant`                        | The Microsoft Entra ID tenant                                                                                                                                                                                           | `""`                                         |
| `backend.auth.existingMicrosoftClientId`              | The name of the existing k8s secret. `c4.auth.microsoftClientId` will be ignored. The key must be `microsoftClientId`                                                                                                   | `""`                                         |
| `backend.auth.existingMicrosoftClientSecret`          | The name of the existing k8s secret. `c4.auth.microsoftClientSecret` will be ignored. The key must be `microsoftClientSecret`                                                                                           | `""`                                         |
| `backend.auth.existingMicrosoftTenant`                | The name of the existing k8s secret. `c4.auth.microsoftTenant` will be ignored. The key must be `microsoftTenant`                                                                                                       | `""`                                         |
| `backend.postgresql.connectionString`                 | Connection string of an external Postgres. Will be ignored when `postgresql.enabled` is `true`.                                                                                                                         | `""`                                         |
| `backend.postgresql.existingConnectionStringSecret`   | The name of the existing k8s secret. `postgresql.connectionString` will be ignored. The key must be `connectionString` Will be ignored when `postgresql.enabled` is `true`.                                             | `""`                                         |
| `backend.postgresql.ssl.rootCertificateConfigMapName` | Name of the ConfigMap containing the root certificate for the external PostgreSQL database.                                                                                                                             | `""`                                         |
| `backend.postgresql.ssl.rootCertificateConfigMapKey`  | Key in the ConfigMap that holds the root certificate for the external PostgreSQL database.  Make sure that the connection string contains `sslmode=verify-ca&sslrootcert=/etc/ssl/certs/<rootCertificateConfigMapKey>`. | `ca.crt`                                     |
| `backend.postgresql.ssl.clientCertificateSecretName`  | Name of the Kubernetes Secret containing the client certificate for the external PostgreSQL database.                                                                                                                   | `""`                                         |
| `backend.postgresql.ssl.clientCertificateSecretKey`   | Key in the Secret that holds the client certificate for the external PostgreSQL database. Make sure that the connection string contains `sslcert=/etc/ssl/certs/<clientCertificateSecretKey>`.                          | `client.crt`                                 |
| `backend.postgresql.ssl.clientKeySecretKey`           | Key in the Secret that holds the client key for the external PostgreSQL database. Make sure that the connection string contains `sslkey=/etc/ssl/certs/<clientKeySecretKey>`.                                           | `client.key`                                 |
| `backend.image.repository`                            | The image repository including host, port, repo                                                                                                                                                                         | `ghcr.io/codecentric/c4-genai-suite/backend` |
| `backend.image.tag`                                   | The image tag                                                                                                                                                                                                           | `""`                                         |
| `backend.extraEnvVars`                                | An extra list of environment variables to add to the deployment.                                                                                                                                                        | `[]`                                         |
| `backend.extraVolumes`                                | An extra list of volumes to add to the deployment.                                                                                                                                                                      | `[]`                                         |
| `backend.extraVolumeMounts`                           | An extra list of volume mounts to add to the deployment.                                                                                                                                                                | `[]`                                         |
| `backend.replicaCount`                                | The number of replicas to create.                                                                                                                                                                                       | `1`                                          |
| `backend.updateStrategy.type`                         | c4 deployment strategy type.                                                                                                                                                                                            | `RollingUpdate`                              |
| `backend.resources`                                   | Set container requests and limits for different resources like CPU or memory                                                                                                                                            | `{}`                                         |
| `backend.sessionSecret`                               | The secret used to sign the session cookie                                                                                                                                                                              | `""`                                         |
| `backend.existingSessionSecret`                       | The name of the existing k8s secret. `sessionSecret` will be ignored. The key must be `sessionSecret`                                                                                                                   | `""`                                         |
| `backend.metrics.enabled`                             | Specifies whether a service for c4 metrics should be created                                                                                                                                                            | `false`                                      |
| `backend.metrics.port`                                | The c4 metrics port                                                                                                                                                                                                     | `9100`                                       |
| `backend.metrics.prometheusRule.enabled`              | Specifies whether a PrometheusRule for c4 should be created                                                                                                                                                             | `false`                                      |
| `backend.metrics.prometheusRule.ruleGroupLabels`      | Labels to add to the c4 rule group                                                                                                                                                                                      | `{}`                                         |
| `backend.metrics.serviceMonitor.enabled`              | Specifies whether a c4 ServiceMonitor should be created                                                                                                                                                                 | `false`                                      |
| `backend.metrics.serviceMonitor.interval`             | Interval at which Prometheus scrapes the metrics from the target. If empty, Prometheus uses the global scrape interval.                                                                                                 | `""`                                         |
| `backend.metrics.serviceMonitor.scrapeTimeout`        | Timeout after which Prometheus considers the scrape to be failed. If empty, Prometheus uses the global scrape timeout.                                                                                                  | `""`                                         |
| `backend.metrics.serviceMonitor.labels`               | Map of labels to add to the c4 ServiceMonitor                                                                                                                                                                           | `{}`                                         |
| `backend.service.type`                                | The service type to use, one of: ClusterIP, NodePort, LoadBalancer                                                                                                                                                      | `""`                                         |
| `backend.labels`                                      | Map of labels to add to the c4 deployment                                                                                                                                                                               | `{}`                                         |
| `backend.annotations`                                 | Map of annotations to add to the c4 deployment                                                                                                                                                                          | `{}`                                         |
| `backend.podLabels`                                   | Map of labels to add to the c4 pods                                                                                                                                                                                     | `{}`                                         |
| `backend.podAnnotations`                              | Map of annotations to add to the c4 pods                                                                                                                                                                                | `{}`                                         |
| `backend.podSecurityContext`                          | Configure the Security Context for the Pod                                                                                                                                                                              | `{}`                                         |
| `backend.containerSecurityContext`                    | Configure the Security Context for the Container                                                                                                                                                                        | `{}`                                         |

### Frontend

| Name                                            | Description                                                                                                             | Value                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `frontend.enabled`                              | Specifies whether the frontend should be deployed                                                                       | `true`                                        |
| `frontend.image.repository`                     | The image repository including host, port, repo                                                                         | `ghcr.io/codecentric/c4-genai-suite/frontend` |
| `frontend.image.tag`                            | The image tag                                                                                                           | `""`                                          |
| `frontend.replicaCount`                         | The number of replicas to create                                                                                        | `1`                                           |
| `frontend.updateStrategy.type`                  | Frontend deployment strategy type                                                                                       | `RollingUpdate`                               |
| `frontend.resources`                            | Set container requests and limits for different resources like CPU or memory                                            | `{}`                                          |
| `frontend.extraEnvVars`                         | An extra list of environment variables to add to the deployment                                                         | `[]`                                          |
| `frontend.metrics.enabled`                      | Specifies whether a service for REIS metrics should be created.                                                         | `false`                                       |
| `frontend.metrics.serviceMonitor.enabled`       | Specifies whether a ServiceMonitor should be created for the frontend.                                                  | `false`                                       |
| `frontend.metrics.serviceMonitor.interval`      | Interval at which Prometheus scrapes the metrics from the target. If empty, Prometheus uses the global scrape interval. | `""`                                          |
| `frontend.metrics.serviceMonitor.scrapeTimeout` | Timeout after which Prometheus considers the scrape to be failed. If empty, Prometheus uses the global scrape timeout.  | `""`                                          |
| `frontend.metrics.serviceMonitor.labels`        | Map of labels to add to the Frontend ServiceMonitor.                                                                    | `{}`                                          |
| `frontend.extraVolumes`                         | An extra list of volumes to add to the deployment                                                                       | `[]`                                          |
| `frontend.extraVolumeMounts`                    | An extra list of volume mounts to add to the deployment                                                                 | `[]`                                          |
| `frontend.labels`                               | Map of labels to add to the frontend deployment                                                                         | `{}`                                          |
| `frontend.annotations`                          | Map of annotations to add to the frontend deployment                                                                    | `{}`                                          |
| `frontend.podLabels`                            | Map of labels to add to the frontend pods                                                                               | `{}`                                          |
| `frontend.podAnnotations`                       | Map of annotations to add to the frontend pods                                                                          | `{}`                                          |
| `frontend.podSecurityContext`                   | Configure the Security Context for the Pod                                                                              | `{}`                                          |
| `frontend.containerSecurityContext`             | Configure the Security Context for the Container                                                                        | `{}`                                          |

### REIS

| Name                                                          | Description                                                                                                             | Value                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `reis.enabled`                                                | Specifies whether the REIS microservice should be deployed                                                              | `false`                                   |
| `reis.replicaCount`                                           | The number of replicas to create.                                                                                       | `1`                                       |
| `reis.updateStrategy.type`                                    | REIS deployment strategy type.                                                                                          | `RollingUpdate`                           |
| `reis.host`                                                   | The REIS container host to bind to                                                                                      | `0.0.0.0`                                 |
| `reis.image.repository`                                       | The image repository including host, port, repo                                                                         | `ghcr.io/codecentric/c4-genai-suite/reis` |
| `reis.image.tag`                                              | The image tag                                                                                                           | `""`                                      |
| `reis.metrics.enabled`                                        | Specifies whether a service for REIS metrics should be created                                                          | `false`                                   |
| `reis.metrics.port`                                           | The REIS metrics port                                                                                                   | `9200`                                    |
| `reis.metrics.prometheusRule.enabled`                         | Specifies whether a PrometheusRule for REIS should be created                                                           | `false`                                   |
| `reis.metrics.prometheusRule.ruleGroupLabels`                 | Labels to add to the c4 rule group                                                                                      | `{}`                                      |
| `reis.metrics.serviceMonitor.enabled`                         | Specifies whether a REIS ServiceMonitor should be created                                                               | `false`                                   |
| `reis.metrics.serviceMonitor.interval`                        | Interval at which Prometheus scrapes the metrics from the target. If empty, Prometheus uses the global scrape interval. | `""`                                      |
| `reis.metrics.serviceMonitor.scrapeTimeout`                   | Timeout after which Prometheus considers the scrape to be failed. If empty, Prometheus uses the global scrape timeout.  | `""`                                      |
| `reis.metrics.serviceMonitor.labels`                          | Map of labels to add to the REIS ServiceMonitor                                                                         | `{}`                                      |
| `reis.embeddings.type`                                        | The embedding api type to use, one of: azure-openai, openai                                                             | `""`                                      |
| `reis.embeddings.azureOpenAi.apiKey`                          | API key for Azure OpenAI.                                                                                               | `""`                                      |
| `reis.embeddings.azureOpenAi.existingApiKeySecret`            | Name of the Kubernetes Secret containing the Azure OpenAI API Key. The key must be `azureOpenAiApiKey`.                 | `""`                                      |
| `reis.embeddings.azureOpenAi.endpoint`                        | The Azure OpenAI endpoint.                                                                                              | `""`                                      |
| `reis.embeddings.azureOpenAi.deploymentName`                  | The Azure OpenAI deployment name.                                                                                       | `""`                                      |
| `reis.embeddings.azureOpenAi.apiVersion`                      | The Azure OpenAI API version.                                                                                           | `""`                                      |
| `reis.embeddings.azureOpenAi.modelName`                       | The Azure OpenAI model name.                                                                                            | `""`                                      |
| `reis.embeddings.openAi.apiKey`                               | API key for OpenAI.                                                                                                     | `""`                                      |
| `reis.embeddings.openAi.existingApiKeySecret`                 | Name of the Kubernetes Secret containing the OpenAI API Key. The key must be `openAiApiKey`.                            | `""`                                      |
| `reis.embeddings.openAi.endpoint`                             | The OpenAI endpoint.                                                                                                    | `""`                                      |
| `reis.embeddings.openAi.deploymentName`                       | The OpenAI deployment name.                                                                                             | `""`                                      |
| `reis.embeddings.openAi.modelName`                            | The OpenAI model name.                                                                                                  | `""`                                      |
| `reis.speechToText.type`                                      | The speech-to-text api type to use, one of: azure-openai-whisper. Leave empty to disable.                               | `""`                                      |
| `reis.speechToText.azureOpenAiWhisper.apiKey`                 | API key for Azure OpenAI Whisper.                                                                                       | `""`                                      |
| `reis.speechToText.azureOpenAiWhisper.existingApiKeySecret`   | Name of the Kubernetes Secret containing the Azure OpenAI Whisper API Key. The key must be `azureOpenAiWhisperApiKey`.  | `""`                                      |
| `reis.speechToText.azureOpenAiWhisper.endpoint`               | The Azure OpenAI Whisper endpoint.                                                                                      | `""`                                      |
| `reis.speechToText.azureOpenAiWhisper.deploymentName`         | The Azure OpenAI Whisper deployment name.                                                                               | `""`                                      |
| `reis.speechToText.azureOpenAiWhisper.apiVersion`             | The Azure OpenAI Whisper API version.                                                                                   | `""`                                      |
| `reis.extraEnvVars`                                           | An extra list of environment variables to add to the deployment.                                                        | `[]`                                      |
| `reis.extraVolumes`                                           | An extra list of volumes to add to the deployment.                                                                      | `[]`                                      |
| `reis.extraVolumeMounts`                                      | An extra list of volume mounts to add to the deployment.                                                                | `[]`                                      |
| `reis.resources`                                              | Set container requests and limits for different resources like CPU or memory                                            | `{}`                                      |
| `reis.vectorDatabase.type`                                    | The search api type to use, one of: azure-ai-search, pgvector                                                           | `""`                                      |
| `reis.vectorDatabase.azureAiSearch.apiKey`                    | API Key for Azure AI Search.                                                                                            | `""`                                      |
| `reis.vectorDatabase.azureAiSearch.existingApiKeySecret`      | Name of the Kubernetes Secret containing the Azure AI Search API Key. The key must be `azureAiSearchApiKey`.            | `""`                                      |
| `reis.vectorDatabase.azureAiSearch.endpoint`                  | The Azure AI Search endpoint.                                                                                           | `""`                                      |
| `reis.vectorDatabase.azureAiSearch.indexName`                 | The Azure AI Search index.                                                                                              | `""`                                      |
| `reis.vectorDatabase.pgVector.connectionString`               | PostgreSQL connection string for a PGVector database. Must use protocol `postgresql+psycopg://`.                        | `""`                                      |
| `reis.vectorDatabase.pgVector.existingConnectionStringSecret` | The name of an existing k8s secret. `reis.search.connectionString` will be ignored. The key must be `connectionString`. | `""`                                      |
| `reis.vectorDatabase.pgVector.indexName`                      | Name of the collection used for the PGVector store (this is a logical distinction in the same table).                   | `""`                                      |
| `reis.workers`                                                | Number of concurrent threads to process the uploaded files                                                              | `2`                                       |
| `reis.batchSize`                                              | Number of chunks uploaded to the vectorstore at once                                                                    | `100`                                     |
| `reis.tmpFilesRoot`                                           | The root directory for temporary files                                                                                  | `""`                                      |
| `reis.labels`                                                 | Map of labels to add to the REI-S deployment                                                                            | `{}`                                      |
| `reis.annotations`                                            | Map of annotations to add to the REI-S deployment                                                                       | `{}`                                      |
| `reis.podLabels`                                              | Map of labels to add to the REI-S pods                                                                                  | `{}`                                      |
| `reis.podAnnotations`                                         | Map of annotations to add to the REI-S pods                                                                             | `{}`                                      |
| `reis.podSecurityContext`                                     | Configure the Security Context for the Pod                                                                              | `{}`                                      |
| `reis.containerSecurityContext`                               | Configure the Security Context for the Container                                                                        | `{}`                                      |

## Migrations

## 0.6.0 to 0.7.0

- secrets section in `values.yaml` was removed
- registry section was added and is required to pull images

## 0.10.1 to 1.0.0

c4-specific values have been moved under the `c4` key. The following values have been moved:

- `replicaCount` -> `c4.replicaCount`
- `port` -> `c4.port`
- `auth.*` -> `c4.auth.*`
- `externalPostgresql.*` -> `c4.externalPostgresql.*`
- `image.*` -> `c4.image.*`
- `ingress.*` -> `c4.ingress.*`
- `sessionSecret` -> `c4.sessionSecret`
- `existingSessionSecret` -> `c4.existingSessionSecret`
- `service.type` -> `c4.service.type`
- `tlsOption.enabled` -> `c4.tlsOptions.enabled`

The following default values have been changed:

- `postgresql.enabled` now defaults to `false`
- `rag.enabled` now defaults to `false`

## 1.4.0 to 2.0.0

The method for generating the chart's full name has been revised. This change might result in the recreation of
resources under different names, but no data will be lost. If you want to prevent resources from being renamed, set the
`fullnameOverride` value to match the release name. You can obtain the release name by using the `helm list` command,
where it is found in the `name` column.

Additionally, all labels and selectors have been updated to support multiple deployments within the same namespace.
Since deployment selectors are immutable, deployments and the ingress have been renamed in this release. Depending on
your deployment method, you may need to manually delete the old resources. Old resources can be identified by these
names:
- The deployment `{{ .Release.Name }}` (now called `{{ .Release.Name }}-c4`)
- The deployment `{{ .Release.Name }}-rag` (now called `{{ .Release.Name }}-rag-deprecated`)
- The deployment `{{ .Release.Name }}-reis` (now called `{{ .Release.Name }}-rei-s`)
- The ingress `{{ .Release.Name }}-ingress` (now called `{{ .Release.Name }}-c4`)

## 2.4.4 to 3.0.0

The rag-server was removed. If it is configured for any Bucket in the Files extension of the Deployment, it has to be replaced by REIS.

To migrate the data managed by the rag-server to REIS, the rag-server offers an enpoint for the versions >=1.0.0, <= 2.4.4.
The import-endpoint of REIS is available for all versions >=1.0.0.

### Migrate from rag-server to REIS

The rag-server api offers a `dump` endpoint, which dumps the content of the configured
vectorstore.

REIS offers an `import` endpoint, which adds the dump to its vector store.
Note that the embedding will be recalculated on import.

In theory, the following two example calls to curl should be enough to migrate the data from
the rag-server to REIS.
Note that every index must be dumped separately, if you use multiple indexes
(look it up in the web interface of Azure AI Search or your pgvector database if unsure).

If you import the same data twice, the entries in the vector store should be updated instead of duplicated.
Also note there is no undo button for the import.

For example, a migration can be performed with these calls to the endpoints. Ensure that you use the correct hostnames and index names.

```bash
curl http://rag:3200/files/dump?indexName=cc-rag-server > dump.json
curl -X POST --data "@dump.json" -H 'Content-Type: application/json' http://reis:3201/files/import?indexName=cc-reis-server
```

After the import, the endpoint of the bucket configuration can be switched in the admin menu of c4 under Files > Bucket.

#### Known problems

It seems that for pgvector the `indexName` (e.g. `cc-reis-server`) can not be updated if it was first imported with, e.g., a typo.
In the presumably very rare case that it is needed, there are some solution strategies depending on the content of the database before the import:
- if pgvector was never used for REIS before: drop the `langchain_pg_embedding` table.
- if the `indexName` with the typo did not exist before: remove all entries of `langchain_pg_embedding` with the wrong value in the column `collection_id`
- otherwise, you might have to parse the dump for all ids and delete those from `langchain_pg_embedding`

## 3.1.0 to 3.1.1

The values `reis.embeddings.instanceName` and `reis.search.apiVersion` are not needed anymore.

## 3.x to 4.0.0

The value `c4.auth.baseUrl` was moved to `c4.baseUrl`.

## 4.x to 5.0.0

The following values were moved:
- `reis.search.type` to `reis.vectorDatabase.type`
- `reis.search.endpoint` to `reis.vectorDatabase.azureAiSearch.endpoint`
- `reis.search.indexName` to `reis.vectorDatabase.azureAiSearch.indexName`

## 5.x.x to 6.0.0

### In-Cluster PostgreSQL Removed

The Bitnami PostgreSQL subchart has been removed. An external PostgreSQL database is now required before deploying this
chart.
If you were previously using the included PostgreSQL subchart, you will need to migrate your data to an external
database.

### External PostgreSQL Values Moved

The following configuration values have been moved to new locations:

- `c4.externalPostgresql.connectionString` moved to `c4.postgresql.connectionString`
- `c4.externalPostgresql.existingConnectionString` moved to `c4.postgresql.existingConnectionStringSecret`
- `c4.externalPostgresql.ssl.*` moved to `c4.postgresql.ssl.*`

### Restructured Secret Values

The following configuration values have been moved to new locations:

- `reis.secrets.openAiKey` moved to `reis.embeddings.azureOpenAi.apiKey` and/or
  `reis.speechToText.azureOpenAiWhisper.apiKey` (
  see [Speech-to-Text changes below](#restructured-speech-to-text-values))
- `reis.secrets.existingOpenaiApiKey` moved to `reis.embeddings.azureOpenAi.existingApiKeySecret` and/or
  `reis.speechToText.azureOpenAiWhisper.existingApiKeySecret`
- `reis.secrets.searchApiKey` moved to `reis.vectorDatabase.azureAiSearch.apiKey`
- `reis.secrets.existingSearchApiKey` moved to `reis.vectorDatabase.azureAiSearch.existingApiKeySecret`

Additionally, the key names inside existing Kubernetes secrets have changed:

- For Azure OpenAI: The secret referenced by `reis.embeddings.azureOpenAi.existingApiKeySecret` must use key
  `azureOpenaiApiKey` (previously `openaiApiKey`)
- For Azure OpenAI Whisper: The secret referenced by `reis.speechToText.azureOpenAiWhisper.existingApiKeySecret` must
  use key `azureOpenAiWhisperApiKey` (previously `openaiApiKey`)
- For Azure AI Search: The secret referenced by `reis.vectorDatabase.azureAiSearch.existingApiKeySecret` must use key
  `azureAiSearchApiKey` (previously `searchApiKey`)

### Restructured Speech-to-Text Values

Azure OpenAI Whisper now uses a separate API key configuration instead of sharing the Azure OpenAI embeddings API key.
While you can still use the same API key value for both services, it needs to be configured separately in two locations.

If you previously had an API key configured at `reis.secrets.openAiKey`, you now need to configure it in these locations
as needed:

- `reis.embeddings.azureOpenAi.apiKey` for embeddings functionality
- `reis.speechToText.azureOpenAiWhisper.apiKey` for speech-to-text functionality

If using existing secrets (previously configured at `reis.secrets.existingOpenaiApiKey`), you need to reference them in:

- `reis.embeddings.azureOpenAi.existingApiKeySecret` - For embeddings functionality
- `reis.speechToText.azureOpenAiWhisper.existingApiKeySecret` - For speech-to-text functionality

Additionally, the following Speech-to-Text configuration values have been relocated:

- `reis.speechToText.endpoint` moved to `reis.speechToText.azureOpenAiWhisper.endpoint`
- `reis.speechToText.deploymentName` moved to `reis.speechToText.azureOpenAiWhisper.deploymentName`
- `reis.speechToText.apiVersion` moved to `reis.speechToText.azureOpenAiWhisper.apiVersion`

### Custom Network Policy Ingress Rule

The value `networkPolicy.customIngressRuleFrom` has been removed. Custom network policies should now be managed
separately outside this Helm chart.

## 6.x.x to 7.0.0

c4's backend and frontend are now deployed as separate components.

Configuration values have been relocated as follows:

- All `c4.*` settings moved to `backend.*`
- All `c4.ingress.*` settings moved to `ingress.*`

The new `frontend.*` settings are optional and only needed when customizing:

- Labels and annotations
- Extra environment variables
- Extra volumes and volume mounts
- Pod resources

## 7.0.0 to 8.0.0

The Helm Chart has been renamed to `c4-genai-suite`. As a result, you cannot upgrade an existing installation using
`helm upgrade`. However, because the chart’s components are stateless, you can install the new chart alongside the old
one and configure it to use the same persistence layer — specifically, your existing PostgreSQL database and vector
database (Azure OpenAI or PGVector).

To achieve a zero-downtime migration, install the new chart in parallel with the old chart, verify that everything is
working as expected, and then uninstall the old chart.
