import paramiko

def fix():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=10)
    
    nginx_conf = """server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /data/pontoface;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        proxy_pass http://127.0.0.1:3005;
    }
}
"""
    # Create the config file safely on remote via echo and base64 to avoid quote issues!
    import base64
    encoded = base64.b64encode(nginx_conf.encode()).decode()
    
    cmd_ssh = f"ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 \"echo 'IB@Vschool123' | sudo -S sh -c 'echo {encoded} | base64 -d > /etc/nginx/sites-available/default && systemctl restart nginx'\""
    
    stdin, stdout, stderr = ssh.exec_command(cmd_ssh)
    exit_code = stdout.channel.recv_exit_status()
    print('STDOUT:', stdout.read().decode())
    print('STDERR:', stderr.read().decode())
    print('Exit:', exit_code)
    ssh.close()

if __name__ == '__main__':
    fix()
