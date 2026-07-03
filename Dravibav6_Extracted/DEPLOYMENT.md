# 🚀 Guia de Deploy - CloudIBAV

Este guia detalha como fazer deploy do CloudIBAV em servidor próprio após desenvolvimento no OnSpace.

## 📋 Visão Geral do Processo

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  OnSpace     │      │   Download   │      │    Deploy    │
│  Development │  →   │   & Build    │  →   │  Seu Servidor│
└──────────────┘      └──────────────┘      └──────────────┘
```

## 🎯 Opções de Deploy

### Opção 1: OnSpace Cloud (Recomendado)

**Vantagens:**
- ✅ Deploy automático
- ✅ Backend já configurado
- ✅ SSL/HTTPS grátis
- ✅ CDN global
- ✅ Backups automáticos

**Passos:**

1. **Publicar no OnSpace**
   ```
   Dentro do projeto OnSpace:
   1. Clique no botão "Publish" (canto superior direito)
   2. Escolha "Publish (Default)"
   3. Aguarde build e deploy
   4. Receba URL: https://<seu-projeto>.onspace.app
   ```

2. **Domínio Customizado (Opcional)**
   ```
   1. Clique em "Publish" → "Add Existing Domain"
   2. Digite seu domínio: cloudibav.com.br
   3. Configure DNS conforme instruções:
      
      Tipo  | Nome | Valor
      ------+------+---------------------------
      A     | @    | <IP fornecido pelo OnSpace>
      CNAME | www  | <seu-projeto>.onspace.app
   
   4. Aguarde propagação DNS (até 48h)
   5. SSL será provisionado automaticamente
   ```

### Opção 2: Servidor Próprio (VPS/Dedicado)

**Requisitos:**
- Servidor Linux (Ubuntu 22.04 LTS recomendado)
- 2GB RAM mínimo
- 20GB disco
- Node.js 18+
- Nginx ou Apache
- Domínio próprio
- Certificado SSL (Let's Encrypt)

---

## 🔧 Deploy em Servidor Próprio - Passo a Passo

### Etapa 1: Preparar o Código

#### 1.1 Download do OnSpace

```bash
# No OnSpace:
1. Clique no botão "Download" (canto superior direito)
2. Aguarde geração do arquivo ZIP
3. Baixe cloudibav.zip para sua máquina
```

#### 1.2 Extrair e Preparar

```bash
# Em sua máquina local
unzip cloudibav.zip
cd cloudibav

# Instalar dependências
npm install

# Build para produção
npm run build
```

**Saída esperada:**

```
vite v5.4.1 building for production...
✓ 1247 modules transformed.
dist/index.html                   0.52 kB │ gzip:  0.34 kB
dist/assets/index-abc123.css    145.23 kB │ gzip: 23.45 kB
dist/assets/index-xyz789.js     634.12 kB │ gzip: 201.34 kB
✓ built in 12.34s
```

### Etapa 2: Configurar Servidor

#### 2.1 Conectar ao Servidor

```bash
# Via SSH
ssh usuario@seu-servidor.com

# Ou usando PuTTY no Windows
```

#### 2.2 Instalar Dependências do Sistema

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Nginx
sudo apt install nginx -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Certbot (SSL)
sudo apt install certbot python3-certbot-nginx -y

# Verificar instalações
nginx -v        # nginx version: nginx/1.18.0
node -v         # v18.x.x
npm -v          # 9.x.x
```

#### 2.3 Criar Diretório da Aplicação

```bash
# Criar diretório
sudo mkdir -p /var/www/cloudibav

# Dar permissões
sudo chown -R $USER:$USER /var/www/cloudibav
```

### Etapa 3: Upload dos Arquivos

#### 3.1 Via SCP (Recomendado)

```bash
# Em sua máquina local (não no servidor)
cd cloudibav

# Copiar pasta dist/ para o servidor
scp -r dist/* usuario@seu-servidor.com:/var/www/cloudibav/

# Verificar cópia
ssh usuario@seu-servidor.com "ls -la /var/www/cloudibav"
```

#### 3.2 Via FTP/SFTP

```
Use FileZilla ou WinSCP:
1. Conecte ao servidor via SFTP
2. Navegue até /var/www/cloudibav
3. Faça upload de todos os arquivos da pasta dist/
```

### Etapa 4: Configurar Nginx

#### 4.1 Criar Configuração do Site

```bash
# Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/cloudibav
```

**Conteúdo do arquivo:**

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name cloudibav.com.br www.cloudibav.com.br;
    
    root /var/www/cloudibav;
    index index.html;
    
    # Compressão Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;
    
    # Cache de assets estáticos
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA routing - todas as rotas vão para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Logs
    access_log /var/log/nginx/cloudibav-access.log;
    error_log /var/log/nginx/cloudibav-error.log;
}
```

#### 4.2 Ativar Site

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/cloudibav /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx

# Verificar status
sudo systemctl status nginx
```

### Etapa 5: Configurar SSL (HTTPS)

```bash
# Obter certificado Let's Encrypt
sudo certbot --nginx -d cloudibav.com.br -d www.cloudibav.com.br

# Responda as perguntas:
# Email: seu-email@exemplo.com
# Termos: Agree
# Redirect HTTP to HTTPS: Yes (recomendado)

# Verificar renovação automática
sudo certbot renew --dry-run
```

**Certbot atualizará automaticamente o arquivo Nginx para:**

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name cloudibav.com.br www.cloudibav.com.br;
    
    ssl_certificate /etc/letsencrypt/live/cloudibav.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cloudibav.com.br/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # ... resto da configuração
}

server {
    if ($host = www.cloudibav.com.br) {
        return 301 https://$host$request_uri;
    }
    
    if ($host = cloudibav.com.br) {
        return 301 https://$host$request_uri;
    }
    
    listen 80;
    listen [::]:80;
    server_name cloudibav.com.br www.cloudibav.com.br;
    return 404;
}
```

### Etapa 6: Configurar Firewall

```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH (IMPORTANTE!)
sudo ufw allow OpenSSH

# Permitir HTTP e HTTPS
sudo ufw allow 'Nginx Full'

# Verificar status
sudo ufw status

# Saída esperada:
# Status: active
# To                         Action      From
# --                         ------      ----
# OpenSSH                    ALLOW       Anywhere
# Nginx Full                 ALLOW       Anywhere
```

### Etapa 7: Testar Aplicação

```bash
# 1. Acessar via navegador
https://cloudibav.com.br

# 2. Testar login
# Usuário: admin
# Senha: admin

# 3. Verificar funcionalidades
# ✅ Upload de arquivos
# ✅ Visualização de documentos
# ✅ Processamento de NF
# ✅ Dashboard financeiro
```

---

## 🔄 Processo de Atualização

### Atualizar Aplicação Após Mudanças

```bash
# 1. No OnSpace, faça as alterações necessárias

# 2. Baixe nova versão
# OnSpace → Download → cloudibav.zip

# 3. Em sua máquina local
unzip cloudibav-new.zip
cd cloudibav-new
npm install
npm run build

# 4. Fazer backup da versão atual no servidor
ssh usuario@servidor "sudo cp -r /var/www/cloudibav /var/www/cloudibav-backup-$(date +%Y%m%d)"

# 5. Upload da nova versão
scp -r dist/* usuario@servidor:/var/www/cloudibav/

# 6. Limpar cache do Nginx
ssh usuario@servidor "sudo systemctl reload nginx"

# 7. Testar aplicação
# Abra https://cloudibav.com.br e teste
```

---

## 🎯 Deploy com Docker (Opcional)

### Dockerfile

Crie `Dockerfile` na raiz do projeto:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração Nginx para SPA
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

Crie `docker-compose.yml`:

```yaml
version: '3.8'

services:
  cloudibav:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

### Deploy com Docker

```bash
# Build da imagem
docker-compose build

# Iniciar container
docker-compose up -d

# Verificar logs
docker-compose logs -f

# Parar container
docker-compose down
```

---

## 🌐 DNS Configuration

### Configurar Registros DNS

No seu provedor de DNS (GoDaddy, Registro.br, etc):

```
Tipo  | Nome             | Valor                  | TTL
------+------------------+------------------------+------
A     | @                | <IP do servidor>       | 3600
A     | www              | <IP do servidor>       | 3600
CNAME | api              | @                      | 3600
TXT   | @                | "v=spf1 include:..."   | 3600
```

### Verificar Propagação

```bash
# Via terminal
nslookup cloudibav.com.br

# Ou use online
# https://dnschecker.org
```

---

## 📊 Monitoramento em Produção

### 1. Logs do Nginx

```bash
# Access logs
sudo tail -f /var/log/nginx/cloudibav-access.log

# Error logs
sudo tail -f /var/log/nginx/cloudibav-error.log

# Filtrar erros 4xx e 5xx
sudo grep " 4[0-9][0-9] " /var/log/nginx/cloudibav-access.log
sudo grep " 5[0-9][0-9] " /var/log/nginx/cloudibav-access.log
```

### 2. Recursos do Servidor

```bash
# CPU e RAM
htop

# Espaço em disco
df -h

# Processos Nginx
ps aux | grep nginx
```

### 3. Uptime Monitoring

Configure monitoramento externo:

- **UptimeRobot** (grátis): https://uptimerobot.com
- **Pingdom** (pago): https://www.pingdom.com
- **StatusCake** (grátis): https://www.statuscake.com

Configuração exemplo:

```
URL to monitor: https://cloudibav.com.br
Check interval: 5 minutes
Alert method: Email, SMS
```

### 4. Application Performance

Use ferramentas de APM:

```bash
# Google Lighthouse (manual)
# Chrome DevTools → Lighthouse → Generate report

# WebPageTest (online)
# https://www.webpagetest.org

# GTmetrix (online)
# https://gtmetrix.com
```

---

## 🔒 Segurança em Produção

### 1. Headers de Segurança

Adicione ao Nginx:

```nginx
# Em /etc/nginx/sites-available/cloudibav

server {
    # ... configuração existente
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https://*.backend.onspace.ai; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
    
    # ... resto da configuração
}
```

### 2. Rate Limiting

```nginx
# No topo de /etc/nginx/nginx.conf

http {
    # ... configurações existentes
    
    # Zone de rate limiting
    limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;
    
    # ... resto
}
```

```nginx
# Em /etc/nginx/sites-available/cloudibav

server {
    # ... configuração existente
    
    location / {
        limit_req zone=one burst=20 nodelay;
        try_files $uri $uri/ /index.html;
    }
}
```

### 3. Fail2Ban (Proteção DDoS)

```bash
# Instalar
sudo apt install fail2ban -y

# Configurar
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/cloudibav-error.log

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/cloudibav-access.log
maxretry = 6
```

```bash
# Reiniciar Fail2Ban
sudo systemctl restart fail2ban

# Verificar status
sudo fail2ban-client status
```

---

## 🔄 Backup e Recuperação

### 1. Backup Automático

Crie script de backup:

```bash
# Criar arquivo
sudo nano /usr/local/bin/backup-cloudibav.sh
```

```bash
#!/bin/bash

# Configurações
BACKUP_DIR="/var/backups/cloudibav"
APP_DIR="/var/www/cloudibav"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup da aplicação
tar -czf $BACKUP_DIR/cloudibav-app-$DATE.tar.gz $APP_DIR

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "cloudibav-app-*.tar.gz" -mtime +7 -delete

echo "Backup concluído: cloudibav-app-$DATE.tar.gz"
```

```bash
# Dar permissão de execução
sudo chmod +x /usr/local/bin/backup-cloudibav.sh

# Agendar no cron (diário às 2h)
sudo crontab -e

# Adicionar linha:
0 2 * * * /usr/local/bin/backup-cloudibav.sh >> /var/log/backup-cloudibav.log 2>&1
```

### 2. Restaurar Backup

```bash
# Listar backups
ls -lh /var/backups/cloudibav/

# Restaurar backup específico
sudo tar -xzf /var/backups/cloudibav/cloudibav-app-20260326_020000.tar.gz -C /

# Recarregar Nginx
sudo systemctl reload nginx
```

---

## 🚨 Troubleshooting em Produção

### Problema: Site não carrega

```bash
# 1. Verificar Nginx
sudo systemctl status nginx

# 2. Verificar logs
sudo tail -50 /var/log/nginx/cloudibav-error.log

# 3. Testar configuração
sudo nginx -t

# 4. Verificar permissões
ls -la /var/www/cloudibav

# 5. Verificar DNS
nslookup cloudibav.com.br
```

### Problema: SSL não funciona

```bash
# 1. Verificar certificado
sudo certbot certificates

# 2. Renovar manualmente
sudo certbot renew --force-renewal

# 3. Verificar configuração Nginx
sudo nano /etc/nginx/sites-available/cloudibav

# 4. Testar SSL online
# https://www.ssllabs.com/ssltest/
```

### Problema: Performance ruim

```bash
# 1. Verificar recursos
htop
free -h
df -h

# 2. Verificar cache do Nginx
# Adicionar em /etc/nginx/nginx.conf
http {
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;
}

# 3. Otimizar Nginx
sudo nano /etc/nginx/nginx.conf

# Ajustar:
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
```

---

## 📈 Checklist Pré-Deploy

Antes de fazer deploy em produção:

```
✅ Build da aplicação sem erros
✅ Variáveis de ambiente configuradas
✅ Backend OnSpace Cloud funcionando
✅ Servidor com requisitos mínimos
✅ Domínio configurado e propagado
✅ SSL/HTTPS configurado
✅ Firewall configurado
✅ Backups automáticos agendados
✅ Monitoramento configurado
✅ Headers de segurança adicionados
✅ Testes de funcionalidade executados
✅ Documentação atualizada
```

---

**✅ Deploy Concluído!**

Seu CloudIBAV está agora em produção. Continue para:
- [📖 Manual do Usuário](USER_GUIDE.md)
- [✨ Documentação de Funcionalidades](FEATURES.md)
