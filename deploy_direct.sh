scp -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no /tmp/frontend.tar ibav@192.168.10.113:/tmp/frontend.tar

ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 << 'EOF'
echo "IB@Vschool123" | sudo -S sh -c '
mkdir -p /data/pontoface
rm -rf /data/pontoface/*
tar -xf /tmp/frontend.tar -C /data/pontoface
docker stop pontoface-web || true
docker rm pontoface-web || true
docker run -d --name pontoface-web --restart unless-stopped -p 8085:80 -v /data/pontoface:/usr/share/nginx/html:ro nginx:alpine
'
EOF
echo "Deploy Realizado com Sucesso!"
