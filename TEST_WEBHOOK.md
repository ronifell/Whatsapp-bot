# Teste do Webhook - Guia Rápido

## 🎯 Situação Atual

O script de configuração automática falhou, mas **isso não significa que o webhook não funcione**. Às vezes a API retorna erro mas o webhook é configurado internamente.

## ✅ Teste Rápido (Recomendado)

### Passo 1: Iniciar o Servidor

**Windows (PowerShell ou CMD):**
```cmd
npm start
```

**Ou abra um novo terminal e execute:**
```cmd
cd "E:\E disk\Ronifell Data\My projects\Amanda\cotafacil-automacao"
npm start
```

Você deve ver:
```
✅ Servidor rodando na porta 3000
📡 Webhook URL: http://localhost:3000/webhook
```

### Passo 2: Verificar se ngrok está rodando

**Windows:**

**Opção 1: Usar o script batch (mais fácil)**
```cmd
START_NGROK.bat
```

**Opção 2: Executar ngrok manualmente**
```cmd
ngrok.exe http 3000
```

**Opção 3: Se ngrok estiver no PATH**
```cmd
ngrok http 3000
```

Certifique-se de que o ngrok está ativo e apontando para a porta 3000.
Copie a URL HTTPS que aparece (ex: `https://nongrieved-maeve-shelteringly.ngrok-free.dev`)

**Dica:** Se você não tem ngrok instalado, veja `INSTALL_NGROK.md` para instruções de instalação no Windows.

### Passo 3: Configurar Webhook Manualmente no Painel Z-API

1. Acesse: https://www.z-api.io
2. Faça login
3. Vá na instância: `3ED53E69CF90C19ADB44D66739CEE648`
4. Configure o webhook:
   - URL: `https://nongrieved-maeve-shelteringly.ngrok-free.dev/webhook`
   - Eventos: `message`, `message-received`
   - Método: `POST`
5. Salve a configuração

### Passo 4: Testar Enviando uma Mensagem

1. Abra o WhatsApp no celular
2. Envie uma mensagem para o número: `5511999484829`
3. Mensagem de teste: "Olá, quero cotar um carro"

### Passo 5: Verificar os Logs

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

## 🔍 Teste Alternativo: Simular Webhook Localmente

### Windows (PowerShell ou CMD)

**Opção 1: Usar o script batch (mais fácil)**
```cmd
test-webhook.bat
```

**Opção 2: Usar curl no PowerShell**
```powershell
curl.exe -X POST http://localhost:3000/webhook `
  -H "Content-Type: application/json" `
  -d '{\"phone\": \"5511999999999\", \"message\": {\"text\": \"Olá, quero cotar um carro\"}, \"instanceId\": \"3ED53E69CF90C19ADB44D66739CEE648\"}'
```

**Opção 3: Usar curl no CMD**
```cmd
curl -X POST http://localhost:3000/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"phone\": \"5511999999999\", \"message\": {\"text\": \"Olá, quero cotar um carro\"}, \"instanceId\": \"3ED53E69CF90C19ADB44D66739CEE648\"}"
```

**Opção 4: Usar Invoke-WebRequest (PowerShell nativo)**
```powershell
$body = @{
    phone = "5511999999999"
    message = @{
        text = "Olá, quero cotar um carro"
    }
    instanceId = "3ED53E69CF90C19ADB44D66739CEE648"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/webhook" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Linux/Mac

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "message": {
      "text": "Olá, quero cotar um carro"
    },
    "instanceId": "3ED53E69CF90C19ADB44D66739CEE648"
  }'
```

Você deve ver a mensagem processada nos logs do servidor.

## ❌ Se Não Funcionar

Se após configurar manualmente no painel e enviar uma mensagem você **não** ver os logs:

1. **Verifique o ngrok:**
   - Certifique-se de que está rodando
   - Verifique se a URL mudou (ngrok gratuito muda a cada reinício)
   - Atualize a URL no painel Z-API

2. **Verifique o servidor:**
   - Certifique-se de que está rodando na porta 3000
   - Verifique se há erros no console

3. **Verifique o webhook no painel Z-API:**
   - Confirme que a URL está correta
   - Confirme que os eventos estão marcados
   - Tente testar o webhook no painel (alguns painéis têm botão "Testar")

4. **Verifique o número do WhatsApp:**
   - Confirme que `WHATSAPP_NUMBER=5511999484829` está correto no `.env`
   - O número deve estar no formato: código do país + DDD + número (sem espaços)

## 💡 Dica Importante

Se o webhook funcionar após configuração manual, você pode:
- Deixar configurado manualmente (funciona perfeitamente)
- Ou tentar automatizar depois quando descobrir o endpoint correto da Z-API

## 📋 Checklist de Teste

- [ ] Servidor rodando (`npm start`)
- [ ] Ngrok rodando e URL copiada
- [ ] Webhook configurado no painel Z-API
- [ ] Mensagem enviada para `5511999484829`
- [ ] Logs aparecem no console do servidor
- [ ] Bot responde automaticamente

---

**Pronto!** Siga esses passos e você saberá rapidamente se o webhook está funcionando! 🚀
