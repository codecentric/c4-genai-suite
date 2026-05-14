FROM docker.io/caddy:2.11.3

COPY Caddyfile /etc/caddy/Caddyfile

ENTRYPOINT ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
