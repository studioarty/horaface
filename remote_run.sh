#!/bin/bash
docker stop pontoface-web || true
docker rm pontoface-web || true
docker run -d --name pontoface-web --restart unless-stopped \
  --network coolify \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.pontoface-http.rule=Host(\`ibavkiosk.com\`)" \
  -l "traefik.http.routers.pontoface-http.entrypoints=web" \
  -l "traefik.http.routers.pontoface-http.middlewares=redirect-to-https" \
  -l "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https" \
  -l "traefik.http.routers.pontoface-https.rule=Host(\`ibavkiosk.com\`)" \
  -l "traefik.http.routers.pontoface-https.entrypoints=websecure" \
  -l "traefik.http.routers.pontoface-https.tls=true" \
  -l "traefik.http.routers.pontoface-https.tls.certresolver=letsencrypt" \
  -l "traefik.http.services.pontoface.loadbalancer.server.port=80" \
  -v /data/pontoface:/usr/share/nginx/html:ro \
  nginx:alpine
