# Configuração Alternativa do Webhook

Se o script automático não funcionar, você pode tentar estas alternativas:

## Opção 1: Usar curl diretamente

```bash
curl -X POST "https://api.z-api.io/instances/3ED53E69CF90C19ADB44D66739CEE648/token/SEU_TOKEN/set-webhook" -H "Content-Type: application/json" -d "{\"value\": \"https://nongrieved-maeve-shelteringly.ngrok-free.dev/webhook\"}"
```

(Substitua `SEU_TOKEN` pelo token do `.env`)

## Opção 2: Pedir ao cliente para configurar

Como você não tem acesso ao painel, peça ao cliente para:

1. Acessar: https://www.z-api.io
2. Fazer login
3. Ir na instância: `3ED53E69CF90C19ADB44D66739CEE648`
4. Configurar webhook:
   - URL: `https://nongrieved-maeve-shelteringly.ngrok-free.dev/webhook`
   - Eventos: message, message-received

## Opção 3: Testar mesmo com erro

Às vezes a API retorna erro mas o webhook é configurado. Teste:

1. Inicie o servidor: `npm start`
2. Envie uma mensagem para o WhatsApp do bot
3. Veja se aparece nos logs

Se aparecer, o webhook está funcionando mesmo com o erro!

## Opção 4: Verificar documentação da Z-API

A API pode ter mudado. Verifique:
- https://developer.z-api.io/
- Ou peça ao cliente para verificar no painel qual é o endpoint correto
