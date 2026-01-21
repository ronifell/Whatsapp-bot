@echo off
echo ============================================================
echo   TESTE DE CONFIGURAÇÃO DE WEBHOOK Z-API
echo ============================================================
echo.

if "%1"=="" (
    echo Usando URL padrão do ngrok...
    echo.
    echo Para usar uma URL diferente, execute:
    echo   test-webhook-config.bat https://sua-url.com/webhook
    echo.
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0test-webhook-config.ps1"
) else (
    echo Usando URL fornecida: %1
    echo.
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0test-webhook-config.ps1" "%1"
)

echo.
pause
