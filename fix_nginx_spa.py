import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    spa_conf = """server {
    listen       80;
    server_name  localhost;
    location / {
        root   /usr/share/nginx/html;
        index  index.html;
        try_files $uri $uri/ /index.html;
    }
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
"""
    # Escaping for echo
    spa_conf_escaped = spa_conf.replace('$', '\\$').replace('"', '\\"')

    commands = [
        f"echo \"{spa_conf_escaped}\" | sudo tee /data/spa.conf",
        "sudo docker rm -f pontoface-web",
        "sudo docker run -d --name pontoface-web --restart unless-stopped "
        "--network coolify "
        "-l \"traefik.enable=true\" "
        "-l \"traefik.http.routers.pontoface-http.rule=Host(\\`ibavkiosk.com\\`)\" "
        "-l \"traefik.http.routers.pontoface-http.entrypoints=web\" "
        "-l \"traefik.http.routers.pontoface-http.middlewares=redirect-to-https\" "
        "-l \"traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https\" "
        "-l \"traefik.http.routers.pontoface-https.rule=Host(\\`ibavkiosk.com\\`)\" "
        "-l \"traefik.http.routers.pontoface-https.entrypoints=websecure\" "
        "-l \"traefik.http.routers.pontoface-https.tls=true\" "
        "-l \"traefik.http.routers.pontoface-https.tls.certresolver=letsencrypt\" "
        "-l \"traefik.http.services.pontoface.loadbalancer.server.port=80\" "
        "-v /data/pontoface:/usr/share/nginx/html:ro "
        "-v /data/spa.conf:/etc/nginx/conf.d/default.conf:ro "
        "nginx:alpine"
    ]

    cmd_string = " && ".join(commands)
    
    run_cmd = (f"ssh -i /root/.ssh/id_ed25519 -o StrictHostKeyChecking=no ibav@192.168.10.113 "
               f"\"echo 'IB@Vschool123' | sudo -S bash -c '{cmd_string}'\"")
               
    stdin, stdout, stderr = ssh.exec_command(run_cmd)
    
    print("[*] Reconfigurando Nginx para modo SPA:")
    print(stdout.read().decode().strip())
    err = stderr.read().decode().strip()
    if err and "sudo" not in err:
        print("[*] ERRO:", err)
    
    ssh.close()
except Exception as e:
    print("Erro geral:", e)
