@echo off
echo ===================================================
echo   ATUALIZANDO PONTOFACE - ZERO CPF (DB + FRONTEND)
echo ===================================================
echo.
echo [1/3] Enviando Arquivos do Frontend...
echo y | pscp -pw P@ssw0rd123! frontend.tar root@192.168.10.100:/tmp/
echo.
echo [2/3] Enviando Arquivos do Backend...
echo y | pscp -pw P@ssw0rd123! backend.tar root@192.168.10.100:/tmp/
echo.
echo [3/3] Aplicando no Container Proxmox (LXC 102)...
echo y | plink -batch -pw P@ssw0rd123! root@192.168.10.100 "pct push 102 /tmp/frontend.tar /tmp/frontend.tar && pct push 102 /tmp/backend.tar /tmp/backend.tar && pct exec 102 -- bash -c 'rm -rf /var/www/pontoface/* && tar -xf /tmp/frontend.tar -C /var/www/pontoface/ && tar -xf /tmp/backend.tar -C /opt/pontoface-api/ && cd /opt/pontoface-api && npx prisma generate && npx prisma db push --accept-data-loss && pm2 restart pontoface-api'"
echo.
echo ===================================================
echo   ATUALIZACAO CONCLUIDA COM SUCESSO!
echo   Pode fechar esta janela.
echo ===================================================
pause
