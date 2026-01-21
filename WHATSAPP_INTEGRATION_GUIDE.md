# Guia de Integração com WhatsApp do Cliente

Este guia explica como configurar e testar o bot com o número de WhatsApp real do cliente.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:
- ✅ Conta Z-API criada e ativa
- ✅ Instância Z-API configurada e conectada ao WhatsApp
- ✅ Credenciais Z-API (Instance ID e Token)
- ✅ Servidor rodando (local ou em produção)
- ✅ URL pública acessível para o webhook

## 🔧 Passo 1: Configurar o Arquivo .env

Edite o arquivo `.env` na raiz do projeto com as seguintes informações:

```env
# Z-API Configuration (OBRIGATÓRIO)
ZAPI_INSTANCE_ID=seu_instance_id_aqui
ZAPI_TOKEN=seu_token_aqui
ZAPI_BASE_URL=https://api.z-api.io

# WhatsApp Business Number (NÚMERO DO CLIENTE)
# Formato: código do país + DDD + número (sem espaços, parênteses ou hífens)
# Exemplo: 5511999999999 (Brasil: 55, DDD: 11, número: 999999999)
WHATSAPP_NUMBER=5511999999999

# Admin WhatsApp (para notificações de atendimento humano)
# Use o número do administrador/consultor que receberá notificações
ADMIN_WHATSAPP=5511888888888

# Canopus Credentials (OBRIGATÓRIO)
CANOPUS_URL=https://url-do-canopus.com.br
CANOPUS_USERNAME=seu_usuario
CANOPUS_PASSWORD=sua_senha

# OpenAI API (OBRIGATÓRIO)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Server Configuration
PORT=3000
NODE_ENV=production

# Quotation Mode
# 'pre-scraped' = modo rápido (recomendado)
# 'scraping' = modo completo (mais lento)
QUOTATION_MODE=pre-scraped
```

### ⚠️ Importante sobre o formato do número:

- **Formato correto**: `5511999999999` (sem espaços, sem hífens, sem parênteses)
- **Formato incorreto**: `+55 11 99999-9999` ou `(11) 99999-9999`
- O número deve incluir o código do país (55 para Brasil)
- Remova o zero inicial do DDD se houver

## 🌐 Passo 2: Configurar URL Pública para Webhook

O Z-API precisa de uma URL pública para enviar mensagens recebidas. Você tem duas opções:

### Opção A: ngrok (Para Testes Locais) ⚡

**Ideal para:** Testes rápidos durante desenvolvimento

1. **Instalar ngrok:**
   - Windows: Baixe de [https://ngrok.com/download](https://ngrok.com/download)
   - Ou use: `choco install ngrok` (se tiver Chocolatey)
   - Ou baixe o executável e adicione ao PATH

2. **Iniciar o servidor local:**
   ```bash
   npm start
   ```

3. **Em outro terminal, iniciar ngrok:**
   ```bash
   ngrok http 3000
   ```

4. **Copiar a URL HTTPS:**
   - Você verá algo como: `https://abc123.ngrok.io`
   - **Copie esta URL completa** (com https://)
   - Esta URL será usada no próximo passo

**⚠️ Nota:** URLs do ngrok mudam a cada reinício (exceto com plano pago). Para testes contínuos, considere a Opção B.

### Opção B: Servidor em Produção (Recomendado) 🚀

**Ideal para:** Ambiente de produção e testes contínuos

1. **Deploy em VPS** (DigitalOcean, AWS, etc.)
2. **Configurar domínio** (opcional, mas recomendado)
3. **Configurar HTTPS** (obrigatório para produção)
4. **URL será algo como:** `https://cotafacil.seudominio.com`

**Veja instruções detalhadas de deploy em:** `SETUP_GUIDE.md` (seção 6)

## 🔗 Passo 3: Configurar Webhook no Z-API

1. **Acesse o painel Z-API:**
   - Vá para [https://www.z-api.io](https://www.z-api.io)
   - Faça login com sua conta

2. **Selecione sua instância:**
   - Clique na instância conectada ao WhatsApp do cliente

3. **Acesse a seção Webhooks:**
   - No menu lateral, clique em "Webhooks" ou "Integrações"

4. **Configure o webhook:**
   - **URL do Webhook:** `https://sua-url-publica/webhook`
     - Exemplo com ngrok: `https://abc123.ngrok.io/webhook`
     - Exemplo com servidor: `https://cotafacil.seudominio.com/webhook`
   
   - **Eventos a receber:**
     - ✅ Marque "message" ou "message-received"
     - ✅ Marque "message-status" (opcional, para status de entrega)
   
   - **Método:** POST
   
   - **Headers** (se necessário):
     - Content-Type: application/json

5. **Salvar configuração:**
   - Clique em "Salvar" ou "Atualizar"
   - Aguarde confirmação

## ✅ Passo 4: Verificar Configuração

Antes de testar, verifique se tudo está configurado:

1. **Verificar variáveis de ambiente:**
   ```bash
   npm start
   ```
   
   Deve mostrar:
   ```
   ✅ Configurações validadas
   ✅ Servidor rodando na porta 3000
   📡 Webhook URL: http://localhost:3000/webhook
   ```

2. **Testar endpoint do webhook:**
   ```bash
   # Em outro terminal
   curl -X POST http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -d '{"phone": "5511999999999", "message": {"text": "teste"}}'
   ```
   
   Deve retornar: `{"status":"received"}`

3. **Verificar conexão Z-API:**
   - No painel Z-API, verifique se a instância está "Conectada"
   - O status deve ser verde/ativo

## 🧪 Passo 5: Testar o Fluxo Completo

### Teste 1: Enviar Mensagem de Teste

1. **Inicie o servidor:**
   ```bash
   npm start
   ```

2. **Envie uma mensagem do WhatsApp do cliente:**
   - Abra o WhatsApp no celular do cliente
   - Envie uma mensagem para o número configurado em `WHATSAPP_NUMBER`
   - Exemplo: "Olá, quero cotar um carro"

3. **Verifique os logs do servidor:**
   Você deve ver:
   ```
   📨 Webhook recebido: {...}
   📱 Nova mensagem de 5511999999999: "Olá, quero cotar um carro"
   🤖 Processando mensagem...
   ```

4. **Verifique a resposta:**
   - O bot deve responder automaticamente
   - A resposta aparecerá no WhatsApp do cliente

### Teste 2: Fluxo Completo de Cotação

1. **Envie uma mensagem solicitando cotação:**
   ```
   Quero cotar um carro de 50 mil reais
   ```

2. **Siga o fluxo:**
   - Bot pedirá dados (valor, prazo, nome, CPF, etc.)
   - Envie os dados conforme solicitado
   - Bot gerará a cotação
   - Bot enviará a cotação com link

3. **Verifique se tudo funcionou:**
   - ✅ Mensagens são recebidas
   - ✅ Bot responde corretamente
   - ✅ Cotação é gerada
   - ✅ Link é enviado

## 🐛 Troubleshooting

### Problema: Mensagens não chegam ao servidor

**Sintomas:**
- Envia mensagem no WhatsApp, mas não aparece nos logs

**Soluções:**
1. **Verificar webhook no Z-API:**
   - Confirme que a URL está correta
   - Teste a URL manualmente: `curl https://sua-url/webhook`
   - Verifique se o servidor está acessível publicamente

2. **Verificar ngrok (se usando):**
   - Certifique-se de que ngrok está rodando
   - Verifique se a URL mudou (ngrok free muda a cada reinício)
   - Atualize a URL no painel Z-API

3. **Verificar firewall:**
   - Certifique-se de que a porta está aberta
   - Se em VPS, configure firewall (ufw/iptables)

4. **Verificar logs do Z-API:**
   - No painel Z-API, veja se há erros de webhook
   - Verifique tentativas de entrega

### Problema: Bot não responde

**Sintomas:**
- Mensagens chegam (aparecem nos logs), mas bot não responde

**Soluções:**
1. **Verificar credenciais Z-API:**
   - Confirme `ZAPI_INSTANCE_ID` e `ZAPI_TOKEN` no `.env`
   - Teste enviar mensagem manualmente via API Z-API

2. **Verificar logs de erro:**
   - Procure por erros nos logs do servidor
   - Verifique se há erros de OpenAI ou Canopus

3. **Verificar número do WhatsApp:**
   - Confirme que `WHATSAPP_NUMBER` está no formato correto
   - Não deve ter espaços, hífens ou parênteses

### Problema: Erro "Configurações obrigatórias faltando"

**Sintomas:**
- Servidor não inicia, mostra erro de configuração

**Soluções:**
1. **Verificar arquivo .env:**
   - Certifique-se de que todas as variáveis obrigatórias estão preenchidas
   - Não deve haver espaços antes ou depois dos valores
   - Não use aspas nos valores (exceto se necessário)

2. **Variáveis obrigatórias:**
   - `ZAPI_INSTANCE_ID`
   - `ZAPI_TOKEN`
   - `CANOPUS_URL`
   - `CANOPUS_USERNAME`
   - `CANOPUS_PASSWORD`
   - `OPENAI_API_KEY`

### Problema: Webhook retorna erro 400 ou 500

**Sintomas:**
- Z-API mostra erro ao tentar enviar webhook

**Soluções:**
1. **Verificar formato do payload:**
   - Z-API pode enviar payload em formato diferente
   - Verifique os logs para ver o formato recebido
   - Ajuste o código em `src/index.js` se necessário

2. **Verificar endpoint:**
   - Certifique-se de que o endpoint `/webhook` está correto
   - Teste manualmente: `curl -X POST https://sua-url/webhook -H "Content-Type: application/json" -d '{"test": "data"}'`

## 📊 Monitoramento

### Verificar Status do Sistema

```bash
# Ver estatísticas
curl http://localhost:3000/stats

# Ver logs em tempo real
npm start
# (ou se usando PM2: pm2 logs cotafacil)
```

### Verificar Sessões Ativas

O endpoint `/stats` mostra:
- Número de sessões ativas
- Estado de cada sessão
- Última atualização

## 🔒 Segurança

### Boas Práticas:

1. **Nunca commitar arquivo .env:**
   - Já está no `.gitignore`
   - Verifique antes de fazer commit

2. **Usar HTTPS em produção:**
   - Z-API requer HTTPS para webhooks em produção
   - Configure SSL/TLS no servidor

3. **Validar webhook (opcional):**
   - Z-API pode enviar token de validação
   - Implemente validação no código se necessário

4. **Limitar acesso:**
   - Use firewall para limitar acesso ao servidor
   - Configure apenas portas necessárias

## ✅ Checklist Final

Antes de considerar pronto para produção:

- [ ] Arquivo `.env` configurado com todas as variáveis
- [ ] `WHATSAPP_NUMBER` configurado com número do cliente (formato correto)
- [ ] Z-API Instance ID e Token configurados
- [ ] Servidor rodando e acessível
- [ ] URL pública configurada (ngrok ou servidor)
- [ ] Webhook configurado no painel Z-API
- [ ] Teste de mensagem recebida funcionando
- [ ] Teste de resposta do bot funcionando
- [ ] Teste de fluxo completo de cotação funcionando
- [ ] Logs sendo monitorados
- [ ] HTTPS configurado (produção)

## 🎯 Próximos Passos

Após configurar e testar:

1. **Monitorar primeiras interações:**
   - Acompanhe os logs
   - Verifique se as respostas estão corretas

2. **Ajustar mensagens (se necessário):**
   - Personalize mensagens em `src/services/whatsapp.service.js`
   - Ajuste fluxo em `src/services/orchestrator.service.js`

3. **Configurar notificações:**
   - Configure `ADMIN_WHATSAPP` para receber notificações
   - Teste encaminhamento para atendimento humano

4. **Documentar casos especiais:**
   - Anote qualquer comportamento inesperado
   - Documente ajustes feitos

---

**Sucesso! 🎉**

Seu bot está pronto para receber mensagens do WhatsApp do cliente!

Para dúvidas ou problemas, consulte:
- `README.md` - Visão geral do projeto
- `SETUP_GUIDE.md` - Guia de setup completo
- `TEST_FLOW.md` - Guia de testes
