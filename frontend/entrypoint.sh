#!/bin/sh

if [ "$PORT" -lt 1024 ]; then
  setcap 'cap_net_bind_service=+ep' /usr/bin/caddy
fi

exec caddy run --config /etc/caddy/Caddyfile