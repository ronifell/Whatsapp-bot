# Guia de Logs no Console

Este guia explica o que você verá no terminal quando o bot estiver rodando e recebendo/enviando mensagens.

## 📺 O que você verá no console

Quando o bot estiver ativo, você verá logs formatados mostrando todas as mensagens recebidas e enviadas.

### Exemplo de saída no console:

```
══════════════════════════════════════════════════════════════════════
📥 MENSAGEM RECEBIDA [20/01/2026 15:30:45]
──────────────────────────────────────────────────────────────────────
👤 De: 5511999999999
💬 Mensagem: "Quero cotar um carro de 50 mil"
══════════════════════════════════════════════════════════════════════

══════════════════════════════════════════════════════════════════════
📤 MENSAGEM ENVIADA [20/01/2026 15:30:46]
──────────────────────────────────────────────────────────────────────
👤 Para: 5511999999999
💬 Mensagem:
🚗 *Consórcio de Automóvel*

Para gerar sua cotação, preciso das seguintes informações:

1. *Valor do veículo* (em R$)
2. *Prazo desejado* (em meses)
3. *Nome completo*
4. *CPF*
5. *Data de nascimento*
6. *E-mail*

Por favor, envie as informações neste formato:

Valor: R$ 50000
Prazo: 60 meses
Nome: João Silva
CPF: 123.456.789-00
Data Nascimento: 01/01/1990
Email: joao@email.com
══════════════════════════════════════════════════════════════════════

✅ Mensagem enviada com sucesso para 5511999999999

══════════════════════════════════════════════════════════════════════
📥 MENSAGEM RECEBIDA [20/01/2026 15:31:20]
──────────────────────────────────────────────────────────────────────
👤 De: 5511999999999
💬 Mensagem: "Valor: R$ 50000
Prazo: 60 meses
Nome: João Silva
CPF: 123.456.789-00
Data Nascimento: 01/01/1990
Email: joao@email.com"
══════════════════════════════════════════════════════════════════════

══════════════════════════════════════════════════════════════════════
📤 MENSAGEM ENVIADA [20/01/2026 15:31:21]
──────────────────────────────────────────────────────────────────────
👤 Para: 5511999999999
💬 Mensagem:
⏳ *Processando sua cotação...*

Estou gerando sua cotação personalizada. 
Isso pode levar alguns instantes.

Por favor, aguarde... 🤖
══════════════════════════════════════════════════════════════════════

✅ Mensagem enviada com sucesso para 5511999999999

══════════════════════════════════════════════════════════════════════
💰 COTAÇÃO ENVIADA [20/01/2026 15:31:35]
──────────────────────────────────────────────────────────────────────
👤 Para: 5511999999999
📊 Tipo: Consórcio de Automóvel
💵 Valor: R$ 50.000,00
📅 Prazo: 60 meses
💳 Parcela: R$ 1.234,56
📈 Taxa Admin: 15%
══════════════════════════════════════════════════════════════════════

══════════════════════════════════════════════════════════════════════
📤 MENSAGEM ENVIADA [20/01/2026 15:31:35]
──────────────────────────────────────────────────────────────────────
👤 Para: 5511999999999
💬 Mensagem:
✅ *Cotação Gerada com Sucesso!*

📋 *Detalhes da Cotação:*

*Tipo:* Consórcio de Automóvel
*Valor do Bem:* R$ 50.000,00
*Prazo:* 60 meses
*Parcela Mensal:* R$ 1.234,56
*Taxa de Administração:* 15%

---

*Gostou da cotação?*

Para *prosseguir com o fechamento*, digite: *FECHAR*

Precisa de ajuda? Digite: *AJUDA*
══════════════════════════════════════════════════════════════════════

✅ Mensagem enviada com sucesso para 5511999999999
```

## 📋 Tipos de logs

### 1. Mensagens Recebidas 📥
- **Formato**: `📥 MENSAGEM RECEBIDA [timestamp]`
- **Mostra**: Número do cliente e mensagem recebida
- **Quando**: Sempre que alguém envia mensagem para o WhatsApp do bot

### 2. Mensagens Enviadas 📤
- **Formato**: `📤 MENSAGEM ENVIADA [timestamp]`
- **Mostra**: Número do cliente e mensagem enviada pelo bot
- **Quando**: Sempre que o bot responde

### 3. Cotações Enviadas 💰
- **Formato**: `💰 COTAÇÃO ENVIADA [timestamp]`
- **Mostra**: Resumo da cotação (tipo, valor, prazo, parcela, taxa)
- **Quando**: Quando uma cotação é gerada e enviada

### 4. Mensagens com Link 🔗
- **Formato**: `📤 MENSAGEM COM LINK ENVIADA [timestamp]`
- **Mostra**: Mensagem que contém links
- **Quando**: Quando o bot envia mensagens com links

### 5. Erros ❌
- **Formato**: `❌ Erro ao...`
- **Mostra**: Detalhes do erro
- **Quando**: Quando algo dá errado

### 6. Informações ℹ️
- **Formato**: `ℹ️ ...` ou `⚠️ ...`
- **Mostra**: Avisos e informações do sistema
- **Quando**: Eventos importantes do sistema

## 🎯 Benefícios

1. **Visibilidade completa**: Você vê todas as mensagens em tempo real
2. **Rastreamento**: Timestamp em cada mensagem
3. **Debug fácil**: Formatação clara facilita identificar problemas
4. **Monitoramento**: Acompanhe o fluxo completo de conversas

## 💡 Dicas

### Filtrar logs no terminal

**Windows PowerShell:**
```powershell
npm start | Select-String "MENSAGEM"
```

**Linux/Mac:**
```bash
npm start | grep "MENSAGEM"
```

### Salvar logs em arquivo

**Windows PowerShell:**
```powershell
npm start | Tee-Object -FilePath logs.txt
```

**Linux/Mac:**
```bash
npm start | tee logs.txt
```

### Ver apenas mensagens recebidas

```bash
npm start | grep "📥 MENSAGEM RECEBIDA"
```

### Ver apenas mensagens enviadas

```bash
npm start | grep "📤 MENSAGEM ENVIADA"
```

### Ver apenas cotações

```bash
npm start | grep "💰 COTAÇÃO ENVIADA"
```

## 🔍 Exemplo de sessão completa

```
══════════════════════════════════════════════════════════════════════
📥 MENSAGEM RECEBIDA [20/01/2026 15:30:45]
──────────────────────────────────────────────────────────────────────
👤 De: 5511999999999
💬 Mensagem: "Olá"
══════════════════════════════════════════════════════════════════════

══════════════════════════════════════════════════════════════════════
📤 MENSAGEM ENVIADA [20/01/2026 15:30:46]
──────────────────────────────────────────────────────────────────────
👤 Para: 5511999999999
💬 Mensagem:
Olá! 👋

Bem-vindo ao *CotaFácil Alphaville*!

Sou seu assistente virtual e estou aqui para ajudar com tudo sobre consórcio.

Posso responder suas dúvidas sobre consórcio de automóvel, imóvel, ou outros tipos. E quando você estiver pronto, também posso gerar uma cotação personalizada para você.

Como posso te ajudar hoje? 😊
══════════════════════════════════════════════════════════════════════

✅ Mensagem enviada com sucesso para 5511999999999

══════════════════════════════════════════════════════════════════════
📥 MENSAGEM RECEBIDA [20/01/2026 15:31:00]
──────────────────────────────────────────────────────────────────────
👤 De: 5511999999999
💬 Mensagem: "Quero cotar um carro"
══════════════════════════════════════════════════════════════════════

[... continua ...]
```

## ✅ Resumo

Agora você pode:
- ✅ Ver todas as mensagens recebidas em tempo real
- ✅ Ver todas as mensagens enviadas pelo bot
- ✅ Acompanhar cotações sendo geradas
- ✅ Identificar problemas rapidamente
- ✅ Monitorar o fluxo completo de conversas

**Tudo isso diretamente no terminal onde você roda `npm start`!** 🎉
