# Troubleshooting ngrok

## 🔄 Problema: Session Status "reconnecting" ou "closed"

### Sintomas:
```
Session Status                reconnecting (not reconnecting, session closed by the client side)
```

### Solução:

1. **Feche o ngrok completamente:**
   - Pressione `Ctrl+C` no terminal do ngrok
   - Certifique-se de que o processo foi encerrado

2. **Reinicie o ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Aguarde até ver:**
   ```
   Session Status                online
   Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
   ```

4. **Copie a URL HTTPS** (ex: `https://abc123.ngrok.io`)

5. **Configure o webhook:**
   ```bash
   npm run configure:webhook https://abc123.ngrok.io/webhook
   ```

## ⚠️ Problema: URL não aparece

### Se você não vê a URL de forwarding:

1. **Verifique se o servidor está rodando:**
   ```bash
   npm start
   ```
   (Em outro terminal)

2. **Verifique se a porta 3000 está livre:**
   ```bash
   netstat -ano | findstr :3000
   ```

3. **Tente outra porta:**
   ```bash
   ngrok http 3001
   ```
   E ajuste o PORT no `.env` se necessário

## 🔐 Problema: Autenticação necessária

### Se aparecer erro de autenticação:

1. **Crie uma conta gratuita:**
   - Acesse: https://dashboard.ngrok.com/signup

2. **Obtenha seu authtoken:**
   - No painel do ngrok, copie o authtoken

3. **Configure:**
   ```bash
   ngrok config add-authtoken seu_token_aqui
   ```

4. **Reinicie o ngrok:**
   ```bash
   ngrok http 3000
   ```

## 🔄 Problema: URL muda a cada reinício

### Isso é normal no plano gratuito!

**Solução:**
- Toda vez que reiniciar o ngrok, você precisará reconfigurar o webhook:
  ```bash
  npm run configure:webhook https://NOVA_URL.ngrok.io/webhook
  ```

**Alternativa para produção:**
- Use um servidor com URL fixa (não ngrok)
- Ou considere o plano pago do ngrok que permite URLs fixas

## ✅ Checklist: ngrok funcionando corretamente

Quando o ngrok estiver funcionando, você deve ver:

```
ngrok

Session Status                online          ← Deve estar "online"
Account                       [seu email] (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000  ← URL importante!

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Elementos importantes:**
- ✅ Session Status: **online**
- ✅ Forwarding: mostra URL HTTPS → localhost:3000
- ✅ Web Interface: http://127.0.0.1:4040 (para ver estatísticas)

## 🎯 Fluxo Completo Correto

1. **Terminal 1: Iniciar servidor**
   ```bash
   npm start
   ```
   Aguarde até ver: "✅ Servidor rodando na porta 3000"

2. **Terminal 2: Iniciar ngrok**
   ```bash
   ngrok http 3000
   ```
   Aguarde até ver: "Session Status: online" e a URL de forwarding

3. **Terminal 3: Configurar webhook**
   ```bash
   npm run configure:webhook https://abc123.ngrok.io/webhook
   ```
   (Use a URL que apareceu no ngrok)

4. **Testar:**
   - Envie uma mensagem para o WhatsApp do bot
   - Veja os logs no Terminal 1

## 💡 Dicas

- **Mantenha o ngrok rodando** enquanto testar
- **Não feche o terminal do ngrok** durante os testes
- **Use o Web Interface** (http://127.0.0.1:4040) para ver requisições em tempo real
- **Para produção**, considere deploy em servidor com URL fixa

---

**Se ainda tiver problemas, verifique:**
- Servidor está rodando na porta 3000?
- Firewall não está bloqueando?
- Internet está funcionando?
- Credenciais Z-API estão corretas no `.env`?
