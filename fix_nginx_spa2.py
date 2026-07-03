import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect('192.168.10.100', username='root', password='IB@Vschool123', timeout=5)
    
    commands = [
        "sudo docker rm -f pontoface-web",
        "sudo docker run -d --name pontoface-web --restart unless-stopped "
        "--network coolify "
        "-l 'traefik.enable=true' "
        "-l \"traefik.http.routers.pontoface-http.rule=Host('ibavkiosk.com')\" "
        "-l \"traefik.http.routers.pontoface-http.entrypoints=http\" "
        "-l \"traefik.http.routers.pontoface-http.middlewares=redirect-to-https\" "
        "-l \"traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https\" "
        "-l \"traefik.http.routers.pontoface-https.rule=Host('ibavkiosk.com')\" "
        "-l \"traefik.http.routers.pontoface-https.entrypoints=https\" "
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
