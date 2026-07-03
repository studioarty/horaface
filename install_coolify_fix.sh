ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 << 'EOF'
echo "IB@Vschool123" | sudo -S sh -c '
export DEBIAN_FRONTEND=noninteractive
echo "Restarting Coolify installer..." > /tmp/coolify_install.log
nohup bash -x /tmp/install.sh >> /tmp/coolify_install.log 2>&1 &
echo "Instalador reiniciado."
'
EOF
