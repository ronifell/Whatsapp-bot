# Teste Rápido - Windows

## ✅ Configuração Confirmada

- **ZAPI_INSTANCE_ID:** `3ED53E69CF90C19ADB44D66739CEE648`
- **WHATSAPP_NUMBER:** `5511999484829`

## 🚀 Passos Rápidos para Testar

### 1. Verificar Configuração

```cmd
verify-env.bat
```

Isso verifica se todas as variáveis do `.env` estão configuradas corretamente.

### 2. Iniciar o Servidor

Abra um terminal PowerShell ou CMD e execute:

```cmd
npm start
```

Você deve ver:
```
✅ Servidor rodando na porta 3000
📡 Webhook URL: http://localhost:3000/webhook
```

**Mantenha este terminal aberto!**

### 3. Iniciar ngrok

Abra **outro terminal** e execute:

```cmd
START_NGROK.bat
```

Ou manualmente:
```cmd
ngrok.exe http 3000
```

**Copie a URL HTTPS** que aparece (ex: `https://abc123.ngrok.io`)

### 4. Testar Endpoint Localmente (Opcional)

Em **outro terminal**, execute:

```cmd
test-webhook.bat
```

Se você ver `{"status":"received"}`, o endpoint está funcionando! ✅

### 5. Configurar Webhook

**Opção A: Tentar Configuração Automática (Recomendado)**

Execute o script de teste que tenta configurar automaticamente:

```cmd
test-webhook-config.bat
```

Ou com uma URL específica:
```cmd
test-webhook-config.bat https://sua-url-ngrok/webhook
```

O script tentará vários endpoints baseados no padrão fornecido pelo cliente.

**Opção B: Configuração Manual no Painel Z-API**

Se a opção A não funcionar, peça ao cliente para configurar:

1. Acesse: https://www.z-api.io
2. Faça login
3. Vá na instância: **3ED53E69CF90C19ADB44D66739CEE648**
4. Configure o webhook:
   - **URL:** `https://sua-url-ngrok/webhook` (use a URL do passo 3)
   - **Eventos:** `message`, `message-received`
   - **Método:** `POST`
5. Salve a configuração

### 6. Testar com WhatsApp Real

1. Abra o WhatsApp no seu celular
2. Envie uma mensagem para: **5511999484829**
3. Mensagem de teste: "Olá, quero cotar um carro"

### 7. Verificar Logs

No terminal onde o servidor está rodando, você deve ver:

```
══════════════════════════════════════════════════════════════════
📥 MENSAGEM RECEBIDA [timestamp]
──────────────────────────────────────────────────────────────────
👤 De: 5511999999999
💬 Mensagem: "Olá, quero cotar um carro"
══════════════════════════════════════════════════════════════════
```

Se você ver essa mensagem, **o webhook está funcionando!** 🎉

## 📋 Checklist Rápido

- [ ] Execute `verify-env.bat` - todas variáveis OK?
- [ ] Servidor rodando (`npm start`)
- [ ] Ngrok rodando (`START_NGROK.bat`)
- [ ] URL do ngrok copiada
- [ ] Tentou configurar webhook (`test-webhook-config.bat`)
- [ ] OU webhook configurado no painel Z-API (se automático falhou)
- [ ] Mensagem enviada para `5511999484829`
- [ ] Logs aparecem no console

## ❌ Problemas Comuns

### "Servidor não inicia"
- Verifique se a porta 3000 está livre
- Execute `verify-env.bat` para verificar configurações

### "Ngrok não funciona"
- Veja `INSTALL_NGROK.md` para instruções de instalação
- Certifique-se de que o ngrok.exe está na pasta do projeto

### "Webhook não recebe mensagens"
- Verifique se a URL do ngrok está correta no painel Z-API
- Certifique-se de que o ngrok está apontando para a porta 3000
- Verifique se os eventos estão marcados no painel Z-API

### "Mensagem não aparece nos logs"
- Verifique se o número do remetente está correto
- Certifique-se de que está enviando para `5511999484829`
- Verifique se o servidor está rodando

## 💡 Dica

Se o webhook funcionar, você verá o bot responder automaticamente! O sistema está configurado para:
1. Receber a mensagem
2. Processar com IA
3. Responder automaticamente

---

**Pronto para testar!** 🚀
