FROM docker.io/caddy:2.10.0

COPY Caddyfile /etc/caddy/Caddyfile

ENTRYPOINT ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
