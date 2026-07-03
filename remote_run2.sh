#!/bin/bash
docker stop pontoface-web || true
docker rm pontoface-web || true
docker run -d --name pontoface-web --restart unless-stopped \
  --network coolify \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.pontoface.rule=Host(\`ibavkiosk.com\`)" \
  -l "traefik.http.routers.pontoface.entrypoints=https" \
  -l "traefik.http.routers.pontoface.tls=true" \
  -l "traefik.http.routers.pontoface.tls.certresolver=letsencrypt" \
  -l "traefik.http.services.pontoface.loadbalancer.server.port=80" \
  -v /data/pontoface:/usr/share/nginx/html:ro \
  nginx:alpine
