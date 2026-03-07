# PontoFace - Instruções de Correção e Instalação

## Resumo do Problema Identificado

O script `instalar.bat` original apresentava um problema técnico que causava o fechamento imediato da janela do terminal sem exibir mensagens de erro. A causa raiz foi identificada: **o script tentava capturar a versão do Node.js e npm usando um comando `for /f` que é sensível a espaços nos caminhos de instalação**, especialmente quando o Node.js está instalado em `C:\Program Files\nodejs`.

Quando esse comando falhava silenciosamente, o script terminava abruptamente, criando a ilusão de que nada estava acontecendo.

## O Que Foi Corrigido

O arquivo `instalar.bat` foi modificado para:

1. **Remover a captura de versão:** O script agora apenas verifica se `node` e `npm` existem, sem tentar ler seus números de versão. Isso elimina o ponto crítico de falha.

2. **Manter a funcionalidade:** Todas as outras funcionalidades do script foram preservadas:
   - Verificação de requisitos (Node.js e npm)
   - Navegação para o diretório correto do projeto
   - Instalação de dependências (`npm install`)
   - Build de produção (`npm run build`)
   - Verificação de arquivos gerados
   - Instruções finais para deploy

## Como Usar o Arquivo Corrigido

### Passo 1: Extrair o Arquivo

1. Baixe o arquivo `pontoibav_corrigido.zip`
2. Clique com o botão direito e selecione **"Extrair Tudo..."**
3. Escolha um local conveniente (ex: `C:\Users\SeuUsuario\Desktop\pontoibav`)

### Passo 2: Executar o Instalador

1. Abra a pasta extraída
2. Navegue até a pasta `deploy`
3. **Clique duas vezes em `instalar.bat`**
4. Se aparecer um aviso de segurança do Windows, clique em **"Executar"**

### Passo 3: Acompanhar a Instalação

A janela do terminal agora **permanecerá aberta** durante todo o processo, mostrando:

- `[1/6] Verificando requisitos...` - Verifica Node.js e npm
- `[2/6] Verificando diretório do projeto...` - Localiza o projeto
- `[3/6] Instalando dependências...` - Executa `npm install` (pode demorar 5-10 minutos)
- `[4/6] Compilando projeto...` - Executa `npm run build`
- `[5/6] Verificando arquivos gerados...` - Confirma a criação da pasta `dist`
- `[6/6] Instalação concluída!` - Sucesso!

### Passo 4: Próximos Passos

Após o sucesso da instalação, a pasta `dist` será criada com todos os arquivos prontos para deploy. Siga as instruções que aparecerem na tela ou consulte o arquivo `LEIA-ME.txt` na pasta `deploy`.

## Solução de Problemas

### A janela ainda fecha rapidamente?

Se a janela fechar antes de você conseguir ler as mensagens, tente isto:

1. Abra o **Prompt de Comando** (cmd.exe)
2. Navegue até a pasta do projeto: `cd C:\caminho\para\pontoibav`
3. Execute o script diretamente: `deploy\instalar.bat`
4. Agora você verá todas as mensagens e poderá identificar o erro específico

### Erro: "Node.js não encontrado"

- **Solução:** Instale o Node.js em https://nodejs.org (versão LTS recomendada)
- Após instalar, reinicie o computador
- Execute o script novamente

### Erro: "npm não encontrado"

- **Solução:** O npm é instalado automaticamente com o Node.js
- Verifique se a instalação do Node.js foi concluída corretamente
- Tente desinstalar e reinstalar o Node.js

### Erro durante "npm install"

- **Solução:** Verifique sua conexão com a internet
- Tente executar o comando manualmente:
  ```
  cd C:\caminho\para\pontoibav
  npm install
  ```
- Se o erro persistir, tente limpar o cache do npm:
  ```
  npm cache clean --force
  npm install
  ```

### Erro durante "npm run build"

- **Solução:** Verifique se há espaço em disco suficiente (pelo menos 500MB livres)
- Tente deletar a pasta `node_modules` e executar o script novamente
- Verifique se todos os arquivos do projeto foram extraídos corretamente

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `deploy/instalar.bat` | Removida captura de versão do Node.js/npm que causava falha |

## Arquivos Não Modificados

Todos os outros arquivos do projeto permanecem idênticos ao original, incluindo:

- Código-fonte (pasta `src`)
- Configurações (package.json, vite.config.ts, etc.)
- Dependências (package-lock.json)
- Documentação (LEIA-ME.txt)

## Suporte Adicional

Se após seguir estas instruções o script ainda não funcionar:

1. Copie a **mensagem de erro completa** que aparece na tela
2. Verifique se o Node.js está realmente instalado:
   ```
   node --version
   npm --version
   ```
3. Se os comandos acima não funcionarem, reinstale o Node.js

---

**Versão:** 1.0  
**Data:** 05 de Março de 2026  
**Corrigido por:** Manus AI
