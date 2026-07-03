# 📘 PontoFace & Studio Arty - Documentação Oficial

Bem-vindo à documentação completa do sistema **PontoFace**. Utilize o menu abaixo para navegar interativamente pelas seções.

---

## 📑 Menu Interativo

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Funcionalidades Principais](#2-funcionalidades-principais)
3. [Guia de Instalação: Servidor Próprio (Local/VPS)](#3-guia-de-instalação-servidor-próprio-localvps)
4. [Guia de Instalação: Hospedagem (Ex: Hostinger)](#4-guia-de-instalação-hospedagem-ex-hostinger)
5. [Backup Seguro](#5-backup-seguro)

---

## 1. Visão Geral do Sistema

O **PontoFace** é um sistema avançado de controle de ponto e gestão de presença que utiliza **Reconhecimento Facial em Tempo Real** (via `face-api.js`), garantindo alta precisão no registro de horas. Conta com recursos de **Digital Signage (Mídia Indoor)** para exibição de anúncios corporativos e um ecossistema robusto para ambientes multi-dispositivos (Totens e Quiosques).

O sistema trabalha com uma arquitetura híbrida (Frontend em React/Vite + Backend em Node.js com SQLite/Prisma), oferecendo alta performance mesmo em redes locais isoladas.

---

## 2. Funcionalidades Principais

Aqui estão as principais funções do sistema explicadas detalhadamente:

- 👤 **Reconhecimento Facial (Biometria Avançada):** Utiliza modelos locais (`face-api.js`) com inferência via `Float32Array`, realizando o *match* facial em milissegundos. Funciona localmente sem depender de APIs externas pagas.
- 📺 **Modos de Digital Signage (Mural Digital):** Transforma o Kiosk de ponto em uma tela de avisos quando ocioso. Suporta imagens, vídeos, feeds RSS dinâmicos, e layouts 3D imersivos.
- 🔄 **Hot-Polling & Sincronização:** Sincronização automática e resiliente de dados entre os Totens e o servidor central, tolerando falhas de rede temporárias (Payloads de até 50MB).
- 🗣️ **Síntese de Voz Inteligente (TTS Gemini 3.1 Pro):** Integrado a inteligência artificial para saudação de funcionários com cache local de MP3 (geração inteligente de feedbacks auditivos).
- 🗺️ **Check-in Mobile via GPS:** O sistema suporta validação de ponto geolocalizada via mobile, criando "cercas virtuais" para garantir que o funcionário está no local de trabalho correto.
- 📊 **Relatórios Avançados e XLSX:** Extração completa de dados (pontos, folha de fechamento, relatórios de anomalia) exportáveis para PDF estruturado e planilhas XLSX.
- 🎨 **Temas Dinâmicos (Cyberpunk, Glassmorphism, etc):** Interface de usuário customizável com temas premium, otimizados para telas de alta definição.
- 🛡️ **Segurança MAX & Modo Kiosk:** O frontend conta com um "Kiosk Escape", bloqueando a saída não autorizada de funcionários da tela de ponto, requerendo PIN de administrador.

---

## 3. Guia de Instalação: Servidor Próprio (Local/VPS)

Para rodar o PontoFace na rede da sua empresa ou em um servidor Windows/Linux próprio.

### Pré-requisitos
- **Node.js** (Versão 18 ou superior)
- **Git**

### Passo a Passo

1. **Extraia o código-fonte:**
   Descompacte o arquivo de backup (`PontoFace_Backup_Seguro.zip`) em uma pasta no servidor.

2. **Instalação do Backend:**
   O backend está embutido ou na pasta `backend/`.
   ```bash
   cd backend
   npm install
   ```
   **Configuração do Banco Local:** O sistema utiliza SQLite (Prisma). Configure o `.env` se necessário, ou basta rodar as migrations:
   ```bash
   npx prisma db push
   # ou
   npm run prisma:deploy
   ```
   Inicie o servidor local:
   ```bash
   npm run start
   ```

3. **Instalação do Frontend:**
   Em um novo terminal, volte para a raiz do projeto (onde está o React/Vite).
   ```bash
   npm install
   ```
   Configure o `.env` do frontend apontando para seu IP local (ex: `VITE_API_URL=http://localhost:3000`).
   
4. **Construção (Build) ou Execução:**
   Para rodar em modo de desenvolvimento interativo:
   ```bash
   npm run dev
   ```
   Para produção (servir usando NGINX ou PM2):
   ```bash
   npm run build
   # O resultado ficará na pasta /dist
   ```

---

## 4. Guia de Instalação: Hospedagem (Ex: Hostinger)

Se deseja hospedar o PontoFace na nuvem (CPanel/hPanel com suporte a Node.js).

### Passo a Passo (Hostinger)

1. **Acesso ao Painel:**
   Acesse o hPanel da Hostinger e vá em **Hospedagem > Gerenciar > Avançado > App Node.js**.

2. **Upload dos Arquivos:**
   - Faça o upload do seu `.zip` do backend na opção **Gerenciador de Arquivos**.
   - Extraia os arquivos na pasta `public_html` (ou num subdiretório específico para a API).

3. **Criar a Aplicação Node.js:**
   - No painel App Node.js, crie um novo aplicativo apontando para o diretório raiz do backend.
   - O arquivo de inicialização deve ser `server.js` ou `index.js`.
   - Clique em **Instalar NPM** pelo próprio painel da Hostinger para baixar as dependências.
   - Inicie o App. A API agora responderá na URL que você definiu (Ex: `https://api.seudominio.com`).

4. **Publicando o Frontend:**
   - No seu computador, abra o código-fonte Frontend.
   - Configure o `.env` de produção, informando a URL da API que acabou de criar na hospedagem:
     ```env
     VITE_API_URL=https://api.seudominio.com
     ```
   - Rode o comando de build localmente:
     ```bash
     npm run build
     ```
   - Pegue todo o conteúdo gerado dentro da pasta `/dist` e faça upload via FTP ou Gerenciador de Arquivos para a raiz do domínio principal (Ex: `public_html` associado a `https://seudominio.com`).

5. **Ajuste de Rotas (React Router Hostinger):**
   - Na Hostinger, crie um arquivo `.htaccess` dentro do `public_html` para que as rotas do React funcionem (Single Page Application):
     ```apache
     <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /
       RewriteRule ^index\.html$ - [L]
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule . /index.html [L]
     </IfModule>
     ```

---

## 5. Backup Seguro

O backup completo e limpo do seu código fonte (sem a pasta `node_modules` para não sobrecarregar o tamanho) foi gerado e salvo como:

👉 **`PontoFace_Backup_Seguro.zip`**

Guarde este arquivo em um local seguro (Pendrive, Google Drive, etc.). Ele contém toda a lógica do PontoFace versão final!

---
*Documentação gerada automaticamente pela IA de Infraestrutura e Desenvolvimento PontoFace.*
