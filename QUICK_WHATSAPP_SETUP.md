# Setup Rápido - WhatsApp do Cliente

## ⚡ Passos Rápidos

### 1. Editar `.env`

Abra o arquivo `.env` e configure:

```env
# NÚMERO DO CLIENTE (formato: 5511999999999 - sem espaços/hífens)
WHATSAPP_NUMBER=5511999999999

# Z-API (obter no painel z-api.io)
ZAPI_INSTANCE_ID=seu_instance_id
ZAPI_TOKEN=seu_token

# Admin para notificações
ADMIN_WHATSAPP=5511888888888
```

### 2. Iniciar Servidor

```bash
npm start
```

### 3. Expor URL Pública (ngrok)

Em outro terminal:

```bash
ngrok http 3000
```

Copie a URL HTTPS (ex: `https://abc123.ngrok.io`)

### 4. Configurar Webhook no Z-API

1. Acesse [z-api.io](https://www.z-api.io)
2. Vá em sua instância → Webhooks
3. Configure URL: `https://sua-url-ngrok/webhook`
4. Salve

### 5. Testar

Envie uma mensagem do WhatsApp do cliente para o número configurado.

---

**📖 Guia completo:** Veja `WHATSAPP_INTEGRATION_GUIDE.md` para detalhes.
