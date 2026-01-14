# Configuration

## Basic settings

| Env Variable   | Required            | Default | Description                                                              |
|----------------|---------------------|---------|--------------------------------------------------------------------------|
| BASE_URL       | Yes                 | None    | Required for OpenID Connect or assistants using Dall-E image generation. |
| DB_URL         | Yes                 | None    |                                                                          |
| SESSION_SECRET | NODE_ENV=production | None    |                                                                          |
| NODE_ENV       | No                  | None    |                                                                          |
| EXTENSIONS     | No                  | None    | ","-separated list of enabled extensions, when empty all enabled         |
| PORT           | No                  | 3000    |                                                                          |


## Logging (LLM)

| Env Variable   | Required | Default | Description |
|----------------|----------|---------|-------------|
| LOG_RAG_CHUNKS | No       | None    | boolean     |
| LOG_LLM_AGENT  | No       | None    | boolean     |

## Metrics

| Env Variable             | Required  | Default | Description                     |
|--------------------------|-----------|---------|---------------------------------|
| METRICS_PORT             | No        | 9100    | Can be disabled by setting to 0 |

## Authentication

### Local

| Env Variable                     | Required | Default       | Description                             |
|----------------------------------|----------|---------------|-----------------------------------------|
| AUTH_ENABLE_PASSWORD             | No       | None          | boolean                                 |
| AUTH_TRUST_PROXY                 | No       | None          | boolean                                 |  
| AUTH_TRUST_COOKIE                | No       | _oauth2_proxy | used only when AUTH_TRUST_PROXY = true  |
| AUTH_INITIAL_ADMIN_USERNAME      | No       | None          |                                         |
| AUTH_INITIALUSER_APIKEY          | No       | None          |                                         |
| AUTH_INITIAL_ADMIN_PASSWORD      | No       | None          |                                         |
| AUTH_INITIAL_ADMIN_ROLE_REQUIRED | No       | false         | true, when initial user should be admin | 

### Github

| Env Variable             | Required  | Default | Description |
|--------------------------|-----------|---------|-------------|
| AUTH_GITHUB_CLIENTID     | No        | None    |             |
| AUTH_GITHUB_CLIENTSECRET | No        | None    |             |

### Google

| Env Variable             | Required  | Default   | Description |
|--------------------------|-----------|-----------|-------------|
| AUTH_GOOGLE_CLIENTID     | No        | None      |             |
| AUTH_GOOGLE_CLIENTSECRET | No        | None      |             |

### Microsoft

| Env Variable                | Required  | Default   | Description |
|-----------------------------|-----------|-----------|-------------|
| AUTH_MICROSOFT_CLIENTID     | No        | None      |             |
| AUTH_MICROSOFT_CLIENTSECRET | No        | None      |             |
| AUTH_MICROSOFT_TENANT       | No        | None      |             |


### OAuth

| Env Variable                 | Required  | Default   | Description |
|------------------------------|-----------|-----------|-------------|
| AUTH_OAUTH_AUTHORIZATION_URL | No        | None      |             |
| AUTH_OAUTH_BRAND_COLOR       | No        | None      |             |
| AUTH_OAUTH_BRAND_NAME        | No        | None      |             |
| AUTH_OAUTH_CLIENTID          | No        | None      |             |
| AUTH_OAUTH_CLIENTSECRET      | No        | None      |             |
| AUTH_OAUTH_TOKEN_URL         | No        | None      |             |
| AUTH_OAUTH_USER_INFO_URL     | No        | None      |             |


## Langfuse

| Env Variable        | Required  | Default                    | Description |
|---------------------|-----------|----------------------------|-------------|
| LANGFUSE_PUBLIC_KEY | No        | None                       |             |
| LANGFUSE_BASE_URL   | No        | https://cloud.langfuse.com |             |
| LANGFUSE_SECRET_KEY | No        | None                       |             |