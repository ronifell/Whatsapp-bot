@echo off
echo ============================================================
echo   TESTE DO WEBHOOK - WINDOWS
echo ============================================================
echo.

echo [1/3] Testando endpoint local do webhook...
echo.
echo Enviando requisição de teste para http://localhost:3000/webhook
echo.

curl -X POST http://localhost:3000/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"phone\": \"5511999999999\", \"message\": {\"text\": \"Teste do webhook\"}, \"instanceId\": \"3ED53E69CF90C19ADB44D66739CEE648\"}"

echo.
echo.
echo ============================================================
echo   RESULTADO
echo ============================================================
echo.
echo Se você viu {"status":"received"} acima, o endpoint está funcionando!
echo.
echo Verifique o console do servidor (npm start) para ver se a mensagem foi processada.
echo.
echo ============================================================
echo.
pause
