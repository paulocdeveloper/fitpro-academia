@echo off
chcp 65001 >nul
title FitPro — arranque
cd /d "%~dp0"

echo.
echo === FitPro: instalar, base de dados e servidor ===
echo Pasta: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale Node 20+ em https://nodejs.org
  pause
  exit /b 1
)

echo [1/4] npm install...
call npm install
if errorlevel 1 (
  echo [ERRO] npm install falhou.
  pause
  exit /b 1
)

echo.
echo [2/4] Criar/atualizar base e tabelas ^(db:bootstrap^)...
call npm run db:bootstrap
if errorlevel 1 (
  echo.
  echo [ERRO] Base de dados: confirme que o MySQL esta LIGADO e o ficheiro .env
  echo        tem DB_HOST, DB_PORT, DB_USER, DB_PASSWORD e DB_DATABASE corretos.
  echo        O utilizador MySQL precisa de permissao para criar a base ^(ou crie a base manualmente^).
  pause
  exit /b 1
)

echo.
echo [2b] Migração SaaS ^(colunas academia_id + contas sem academia^)...
call npm run db:fix-saas
if errorlevel 1 (
  echo [AVISO] db:fix-saas falhou — tente npm run db:bootstrap de novo.
)

echo.
echo [3/4] Garantir login master@academia.com ^(db:seed-master^)...
call npm run db:seed-master
if errorlevel 1 (
  echo [ERRO] db:seed-master falhou — verifique o .env e a base "academia".
  pause
  exit /b 1
)

echo.
echo [4/4] Servidor em http://localhost:3000
echo        Login: master@academia.com  /  Master@123
echo.
call npm run dev
pause
