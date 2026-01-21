@echo off
echo ========================================
echo   Iniciando ngrok para porta 3000
echo ========================================
echo.
echo Aguarde enquanto o ngrok inicia...
echo.
echo IMPORTANTE: Copie a URL HTTPS que aparecer abaixo
echo Exemplo: https://abc123.ngrok.io
echo.
echo Para configurar o webhook, use:
echo npm run configure:webhook https://SUA_URL_AQUI.ngrok.io/webhook
echo.
echo ========================================
echo.

ngrok http 3000

pause
