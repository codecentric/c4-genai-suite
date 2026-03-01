FROM docker.io/caddy:2.11.1

COPY Caddyfile /etc/caddy/Caddyfile

ENTRYPOINT ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
