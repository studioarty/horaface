#!/bin/bash
docker rm -f pontoface-web
docker run -d --name pontoface-web \
  --network coolify \
  --restart unless-stopped \
  -v /data/spa.conf:/etc/nginx/conf.d/default.conf:ro \
  -v /data/pontoface:/usr/share/nginx/html:ro \
  -l "traefik.enable=true" \
  -l "traefik.docker.network=coolify" \
  -l "traefik.http.routers.pontoface-http.entrypoints=http" \
  -l "traefik.http.routers.pontoface-http.middlewares=redirect-to-https" \
  -l "traefik.http.routers.pontoface-http.rule=Host(\`ibavkiosk.com\`)" \
  -l "traefik.http.routers.pontoface-http.service=pontoface" \
  -l "traefik.http.routers.pontoface-https.entrypoints=https" \
  -l "traefik.http.routers.pontoface-https.rule=Host(\`ibavkiosk.com\`)" \
  -l "traefik.http.routers.pontoface-https.service=pontoface" \
  -l "traefik.http.routers.pontoface-https.tls=true" \
  -l "traefik.http.routers.pontoface-https.tls.certresolver=letsencrypt" \
  -l "traefik.http.routers.pontoface-local.rule=Host(\`192.168.10.113\`)" \
  -l "traefik.http.routers.pontoface-local.entrypoints=http" \
  -l "traefik.http.routers.pontoface-local.service=pontoface" \
  -l "traefik.http.services.pontoface.loadbalancer.server.port=80" \
  nginx:alpine
