FROM docker.io/caddy:2.10.0

COPY Caddyfile /etc/caddy/Caddyfile

ENV PORT=80
ENV FRONTEND_PORT=80
ENV BACKEND_PORT=3000

ENTRYPOINT ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
