ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 << 'EOF'
echo "IB@Vschool123" | sudo -S sh -c '
export DEBIAN_FRONTEND=noninteractive
echo "Downloading Coolify installer..." > /tmp/coolify_install.log
nohup bash -c "curl -fsSL https://cdn.coollabs.io/coolify/install.sh -o /tmp/install.sh && bash -x /tmp/install.sh -f" >> /tmp/coolify_install.log 2>&1 &
echo "Instalação do Coolify disparada em Background! Verificando logs..."
'
EOF
