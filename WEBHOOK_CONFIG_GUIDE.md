# Guia de Configuração de Webhook - Atualizado

## 🎯 Situação

O cliente forneceu o padrão de endpoint:
```
https://api.z-api.io/instances/3ED53E69CF90C19ADB44D66739CEE648/token/8AF4D86F7CA2A2FDD649066A/send-text
```

Com base nisso, criamos scripts para tentar configurar o webhook automaticamente.

## ✅ Ferramentas Criadas

### 1. **test-webhook-config.ps1** (PowerShell Script)
Script PowerShell que testa múltiplos endpoints baseados no padrão fornecido.

**Uso:**
```powershell
.\test-webhook-config.ps1
```

Ou com URL específica:
```powershell
.\test-webhook-config.ps1 https://sua-url-ngrok/webhook
```

### 2. **test-webhook-config.bat** (Batch Wrapper)
Wrapper em batch para executar o script PowerShell facilmente.

**Uso:**
```cmd
test-webhook-config.bat
```

Ou com URL específica:
```cmd
test-webhook-config.bat https://sua-url-ngrok/webhook
```

### 3. **configure-webhook.js** (Atualizado)
Script Node.js atualizado para priorizar endpoints baseados no padrão do cliente.

**Uso:**
```cmd
npm run configure:webhook https://sua-url-ngrok/webhook
```

## 🚀 Como Usar

### Passo 1: Iniciar Servidor e Ngrok

**Terminal 1 - Servidor:**
```cmd
npm start
```

**Terminal 2 - Ngrok:**
```cmd
START_NGROK.bat
```

Copie a URL HTTPS do ngrok (ex: `https://abc123.ngrok.io`)

### Passo 2: Tentar Configurar Webhook Automaticamente

**Opção A: Usar o script PowerShell (Recomendado)**
```cmd
test-webhook-config.bat https://abc123.ngrok.io/webhook
```

**Opção B: Usar o script Node.js**
```cmd
npm run configure:webhook https://abc123.ngrok.io/webhook
```

### Passo 3: Verificar Resultado

**Se funcionar:**
- Você verá: `✅ SUCESSO com [endpoint]!`
- O webhook está configurado
- Pule para o Passo 4

**Se não funcionar:**
- Você verá: `❌ NENHUM ENDPOINT FUNCIONOU`
- Siga para a Opção Manual abaixo

### Passo 4: Testar

1. Envie uma mensagem para `5511999484829` do WhatsApp
2. Verifique os logs no terminal do servidor
3. Você deve ver a mensagem recebida

## 🔧 Opção Manual (Se Automático Falhar)

Se nenhum dos scripts funcionar, peça ao cliente para configurar manualmente:

### Instruções para o Cliente:

```
Olá,

Preciso que você configure o webhook no painel Z-API.

Por favor, siga estes passos:

1. Acesse: https://www.z-api.io
2. Faça login na sua conta
3. Vá na instância: 3ED53E69CF90C19ADB44D66739CEE648
4. Configure o webhook:
   - URL: https://[URL_DO_NGROK]/webhook
   - Eventos: message, message-received
   - Método: POST
5. Salve a configuração

Depois que configurar, me avise para testarmos.

Obrigado!
```

## 📋 Endpoints Testados

Os scripts testam os seguintes endpoints (em ordem de prioridade):

1. `/set-webhook` (POST com `value`)
2. `/set-received-callback` (POST com `value`)
3. `/webhook` (POST com `url`)
4. `/callback` (POST com `value`)
5. Variações com diferentes payloads
6. Métodos PUT (menos comuns)

## 🔍 Troubleshooting

### "Todos os endpoints falharam"
- **Solução:** Configure manualmente no painel Z-API (veja Opção Manual acima)

### "Não autorizado (401)"
- **Solução:** Verifique se o token no `.env` está correto
- Execute: `npm run verify:env`

### "Endpoint não encontrado (404)"
- **Solução:** O endpoint pode não estar disponível nesta versão da Z-API
- Configure manualmente no painel

### "Webhook configurado mas não recebe mensagens"
- Verifique se o ngrok está rodando
- Verifique se a URL do ngrok está correta no painel Z-API
- Verifique se os eventos estão marcados no painel
- Teste o endpoint localmente: `test-webhook.bat`

## 💡 Dicas

1. **Sempre teste localmente primeiro:**
   ```cmd
   test-webhook.bat
   ```
   Isso verifica se seu endpoint está funcionando antes de configurar no Z-API.

2. **URL do ngrok muda:**
   - Se você reiniciar o ngrok, a URL muda
   - Atualize a configuração do webhook com a nova URL

3. **Logs são importantes:**
   - Sempre verifique os logs do servidor
   - Eles mostram se as mensagens estão chegando

## 📝 Resumo dos Arquivos

- `test-webhook-config.ps1` - Script PowerShell principal
- `test-webhook-config.bat` - Wrapper batch para fácil execução
- `configure-webhook.js` - Script Node.js atualizado
- `test-webhook.bat` - Testa endpoint localmente
- `verify-env.bat` - Verifica configuração do .env

---

**Pronto para testar!** 🚀

Execute `test-webhook-config.bat` com a URL do seu ngrok e veja se funciona!
