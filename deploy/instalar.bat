@echo off
chcp 65001 >nul
title PontoFace - Instalador Automatico
color 0B

echo.
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║                                                       ║
echo  ║          ██████╗  ██████╗ ███╗   ██╗████████╗ ██████╗ ║
echo  ║          ██╔══██╗██╔═══██╗████╗  ██║╚══██╔══╝██╔═══██╗║
echo  ║          ██████╔╝██║   ██║██╔██╗ ██║   ██║   ██║   ██║║
echo  ║          ██╔═══╝ ██║   ██║██║╚██╗██║   ██║   ██║   ██║║
echo  ║          ██║     ╚██████╔╝██║ ╚████║   ██║   ╚██████╔╝║
echo  ║          ╚═╝      ╚═════╝ ╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ║
echo  ║                    FACE                                ║
echo  ║                                                       ║
echo  ║   Instalador Automatico - Controle de Ponto Facial    ║
echo  ║                                                       ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.

:: ============================================
:: VERIFICAR REQUISITOS
:: ============================================

echo  [1/6] Verificando requisitos...
echo.

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERRO] Node.js nao encontrado!
    echo.
    echo  Instale o Node.js antes de continuar:
    echo  https://nodejs.org/
    echo.
    echo  Baixe a versao LTS e instale normalmente.
    echo  Depois execute este script novamente.
    echo.
    pause
    exit /b 1
)

echo  [OK] Node.js encontrado

:: Verificar npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERRO] npm nao encontrado!
    pause
    exit /b 1
)

echo  [OK] npm encontrado
echo.

:: ============================================
:: NAVEGAR PARA O DIRETORIO DO PROJETO
:: ============================================

echo  [2/6] Verificando diretorio do projeto...
echo.

:: Muda o diretorio para a pasta onde o script esta
pushd "%~dp0"

:: Sobe um nivel para a raiz do projeto
cd ..

:: Verifica se o package.json existe na pasta atual (raiz do projeto)
if not exist "package.json" (
    echo  [ERRO] Nao foi possivel encontrar o arquivo package.json na raiz do projeto.
    echo  Diretorio atual: %cd%
    echo.
    echo  Certifique-se de que a pasta 'deploy' esta dentro da pasta principal do seu projeto.
    echo.
    pause
    exit /b 1
)

echo  [OK] Diretorio do projeto encontrado: %cd%
echo.

:: ============================================
:: INSTALAR DEPENDENCIAS
:: ============================================

echo  [3/6] Instalando dependencias (npm install)...
echo  Isso pode demorar alguns minutos na primeira vez...
echo.

call npm install
if %errorlevel% neq 0 (
    echo.
    echo  [ERRO] Falha ao instalar dependencias!
    echo  Verifique sua conexao com a internet e tente novamente.
    pause
    exit /b 1
)

echo.
echo  [OK] Dependencias instaladas com sucesso
echo.

:: ============================================
:: BUILD DE PRODUCAO
:: ============================================

echo  [4/6] Compilando projeto para producao (npm run build)...
echo.

call npm run build
if %errorlevel% neq 0 (
    echo.
    echo  [ERRO] Falha na compilacao!
    echo  Verifique os erros acima e tente novamente.
    pause
    exit /b 1
)

echo.
echo  [OK] Build concluido com sucesso
echo.

:: ============================================
:: VERIFICAR RESULTADO
:: ============================================

echo  [5/6] Verificando arquivos gerados...
echo.

if not exist "dist\index.html" (
    echo  [ERRO] Arquivo dist\index.html nao encontrado!
    echo  A compilacao pode ter falhado silenciosamente.
    pause
    exit /b 1
)

if not exist "dist\assets" (
    echo  [AVISO] Pasta dist\assets nao encontrada
)

if exist "dist\.htaccess" (
    echo  [OK] .htaccess presente
) else (
    echo  [INFO] Copiando .htaccess para dist...
    if exist "public\.htaccess" (
        copy "public\.htaccess" "dist\.htaccess" >nul
        echo  [OK] .htaccess copiado
    )
)

:: Copiar verificador PHP
if exist "deploy\verificar.php" (
    copy "deploy\verificar.php" "dist\verificar.php" >nul
    echo  [OK] verificar.php copiado para dist
)

:: Contar arquivos
set /a count=0
for /r "dist" %%f in (*) do set /a count+=1
echo  [OK] %count% arquivos gerados na pasta dist\
echo.

:: ============================================
:: RESULTADO FINAL
:: ============================================

echo  [6/6] Instalacao concluida!
echo.
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║                                                       ║
echo  ║  BUILD CONCLUIDO COM SUCESSO!                         ║
echo  ║                                                       ║
echo  ║  Os arquivos para deploy estao na pasta:              ║
echo  ║                                                       ║
echo  ║     .\dist\                                           ║
echo  ║                                                       ║
echo  ║  PROXIMO PASSO:                                       ║
echo  ║                                                       ║
echo  ║  1. Abra o Gerenciador de Arquivos da Hostinger       ║
echo  ║  2. Navegue ate public_html                           ║
echo  ║  3. Apague o conteudo existente                       ║
echo  ║  4. Envie TODOS os arquivos de dentro de .\dist\      ║
echo  ║  5. Acesse https://seudominio.com/verificar.php       ║
echo  ║     para verificar se tudo esta correto               ║
echo  ║  6. Ative o SSL (HTTPS) nas configuracoes             ║
echo  ║                                                       ║
echo  ║  IMPORTANTE: Envie o CONTEUDO de dist\, nao a pasta   ║
echo  ║  dist\ em si. O index.html deve ficar dentro de       ║
echo  ║  public_html\ diretamente.                            ║
echo  ║                                                       ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.

:: Perguntar se deseja abrir a pasta
set /p OPEN_FOLDER="  Deseja abrir a pasta dist? (S/N): "
if /i "%OPEN_FOLDER%"=="S" (
    explorer "dist"
)

echo.
echo  Pressione qualquer tecla para sair...
pause >nul
