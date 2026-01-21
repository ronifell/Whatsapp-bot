# Guia de Configuração de Webhook

Este guia explica como configurar o webhook do Z-API quando você não tem acesso ao painel.

## 🎯 Situação

Você recebeu do cliente:
- `ZAPI_INSTANCE_ID`
- `ZAPI_TOKEN`
- `ZAPI_BASE_URL`

Mas não tem acesso ao painel Z-API para configurar o webhook manualmente.

## ✅ Solução: Configurar via API

O projeto inclui um script que configura o webhook automaticamente usando a API do Z-API.

## 📋 Passo a Passo

### 1. Configure o arquivo `.env`

Certifique-se de que o `.env` contém as credenciais do cliente:

```env
ZAPI_INSTANCE_ID=seu_instance_id_do_cliente
ZAPI_TOKEN=seu_token_do_cliente
ZAPI_BASE_URL=https://api.z-api.io
```

### 2. Obtenha uma URL pública

Você precisa de uma URL pública acessível pela internet. Duas opções:

#### Opção A: ngrok (para testes)

```bash
# Instalar ngrok (se ainda não tiver)
# Windows: baixar de https://ngrok.com/download

# Em um terminal, iniciar ngrok
ngrok http 3000
```

Você verá algo como:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

Copie a URL HTTPS: `https://abc123.ngrok.io`

#### Opção B: Servidor em produção

Se você já tem um servidor deployado:
- URL será algo como: `https://cotafacil.seudominio.com`

### 3. Configure o webhook

#### Método 1: Script manual (Recomendado)

```bash
npm run configure:webhook https://abc123.ngrok.io/webhook
```

Ou diretamente:

```bash
node configure-webhook.js https://abc123.ngrok.io/webhook
```

**Exemplo completo:**
```bash
# Terminal 1: Iniciar ngrok
ngrok http 3000
# Copie a URL: https://abc123.ngrok.io

# Terminal 2: Configurar webhook
npm run configure:webhook https://abc123.ngrok.io/webhook

# Terminal 3: Iniciar servidor
npm start
```

#### Método 2: Configuração automática no startup

Adicione no `.env`:

```env
WEBHOOK_URL=https://abc123.ngrok.io/webhook
```

Quando você iniciar o servidor (`npm start`), o webhook será configurado automaticamente.

**⚠️ Nota:** Se estiver usando ngrok, a URL muda a cada reinício. Você precisará atualizar o `WEBHOOK_URL` ou reconfigurar manualmente.

### 4. Verificar se funcionou

O script mostrará:

```
✅ Webhook configurado com sucesso!
```

Se houver erro, o script mostrará detalhes do problema.

## 🔍 Troubleshooting

### Erro 401 (Unauthorized)

**Causa:** Token inválido ou expirado

**Solução:**
- Verifique se `ZAPI_TOKEN` está correto no `.env`
- Peça ao cliente para verificar se o token ainda é válido
- Peça um novo token se necessário

### Erro 404 (Not Found)

**Causa:** Instance ID não encontrado

**Solução:**
- Verifique se `ZAPI_INSTANCE_ID` está correto no `.env`
- Confirme com o cliente qual é o Instance ID correto

### Erro 400 (Bad Request)

**Causa:** URL do webhook inválida

**Solução:**
- Certifique-se de que a URL começa com `http://` ou `https://`
- Verifique se a URL está acessível publicamente
- Teste a URL no navegador: `https://abc123.ngrok.io/webhook` (deve retornar erro 404, mas isso significa que está acessível)

### URL do ngrok mudou

**Problema:** URLs do ngrok gratuito mudam a cada reinício

**Solução:**
1. Copie a nova URL do ngrok
2. Reconfigure o webhook:
   ```bash
   npm run configure:webhook https://nova-url.ngrok.io/webhook
   ```

Ou atualize o `.env`:
```env
WEBHOOK_URL=https://nova-url.ngrok.io/webhook
```

## 📝 Exemplos de Uso

### Exemplo 1: Teste local com ngrok

```bash
# Terminal 1: ngrok
ngrok http 3000
# URL gerada: https://abc123.ngrok.io

# Terminal 2: Configurar webhook
npm run configure:webhook https://abc123.ngrok.io/webhook

# Terminal 3: Iniciar servidor
npm start
```

### Exemplo 2: Produção com servidor

```bash
# Configurar webhook uma vez
npm run configure:webhook https://cotafacil.com/webhook

# Iniciar servidor
npm start
```

### Exemplo 3: Configuração automática

```env
# .env
ZAPI_INSTANCE_ID=abc123
ZAPI_TOKEN=xyz789
ZAPI_BASE_URL=https://api.z-api.io
WEBHOOK_URL=https://cotafacil.com/webhook
```

```bash
# Iniciar servidor (webhook será configurado automaticamente)
npm start
```

## ✅ Checklist

Antes de considerar configurado:

- [ ] `.env` contém `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_BASE_URL`
- [ ] Você tem uma URL pública (ngrok ou servidor)
- [ ] Webhook foi configurado (via script ou automático)
- [ ] Servidor está rodando (`npm start`)
- [ ] Testou enviando uma mensagem para o WhatsApp do bot
- [ ] Viu a mensagem aparecer nos logs do console

## 🎯 Próximos Passos

Após configurar o webhook:

1. **Inicie o servidor:**
   ```bash
   npm start
   ```

2. **Envie uma mensagem de teste:**
   - Abra o WhatsApp
   - Envie mensagem para o número configurado em `WHATSAPP_NUMBER`
   - Exemplo: "Olá, quero cotar um carro"

3. **Verifique os logs:**
   - Você deve ver no console:
     ```
     📥 MENSAGEM RECEBIDA [timestamp]
     👤 De: 5511999999999
     💬 Mensagem: "Olá, quero cotar um carro"
     ```

4. **Confirme a resposta:**
   - O bot deve responder automaticamente
   - A resposta aparecerá nos logs também

## 💡 Dicas

- **Para desenvolvimento:** Use ngrok, mas lembre-se de reconfigurar quando a URL mudar
- **Para produção:** Use um servidor com URL fixa e configure uma vez
- **Para testes rápidos:** Use o método automático com `WEBHOOK_URL` no `.env`
- **Para controle total:** Use o script manual `npm run configure:webhook`

---

**Pronto!** Agora você pode configurar o webhook sem precisar acessar o painel Z-API! 🎉
