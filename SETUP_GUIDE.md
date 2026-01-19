# Guia de Configuração - CotaFácil Automação

## 📋 Checklist de Setup Completo

- [ ] Node.js 18+ instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Playwright instalado (`npm run install:browsers`)
- [ ] Arquivo `.env` configurado
- [ ] Conta Z-API criada e configurada
- [ ] Credenciais do Canopus obtidas
- [ ] OpenAI API Key obtida
- [ ] Teste RPA executado com sucesso
- [ ] Servidor rodando
- [ ] Webhook configurado no Z-API

## 🔐 1. Obter Credenciais

### 1.1 OpenAI API Key

1. Acesse: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Faça login ou crie uma conta usando: `cotafacilalphaville@gmail.com`
3. Clique em "Create new secret key"
4. Copie a chave (começa com `sk-...`)
5. Cole no `.env` em `OPENAI_API_KEY`

**Custo estimado:** ~$0.10 por 100 cotações (usando GPT-4o-mini)

### 1.2 Z-API (WhatsApp)

1. Acesse: [https://www.z-api.io](https://www.z-api.io)
2. Cadastre-se com: `cotafacilalphaville@gmail.com`
3. No painel:
   - Clique em "Criar Instância"
   - Escolha um nome (ex: "cotafacil-prod")
   - Aguarde criação
4. Vincular WhatsApp:
   - Abra WhatsApp no celular do número: **+55 11 99948-4829**
   - No painel Z-API, clique em "Conectar"
   - Escaneie o QR Code com o WhatsApp
5. Copiar credenciais:
   - **Instance ID**: Visível no painel
   - **Token**: Em "Configurações" > "Token de Acesso"
6. Cole no `.env`:
   ```
   ZAPI_INSTANCE_ID=seu_instance_id
   ZAPI_TOKEN=seu_token
   ```

**Planos Z-API:**
- Gratuito: 100 mensagens/mês
- Básico: R$ 49/mês - 5.000 mensagens
- Pro: R$ 99/mês - 15.000 mensagens

### 1.3 Canopus

As credenciais do Canopus serão fornecidas pelo cliente:

```
CANOPUS_URL=https://...
CANOPUS_USERNAME=...
CANOPUS_PASSWORD=...
```

⚠️ **Segurança:** Trocar senha após MVP entregue.

## 🛠️ 2. Configuração Passo a Passo

### 2.1 Instalar Node.js

**Windows:**
1. Baixe: [https://nodejs.org](https://nodejs.org) (versão LTS)
2. Execute o instalador
3. Verifique: `node --version` (deve ser 18+)

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
```

**macOS:**
```bash
brew install node@18
node --version
```

### 2.2 Clonar Projeto

```bash
# Via HTTPS
git clone https://github.com/usuario/cotafacil-automacao.git

# Ou via SSH (se configurado)
git clone git@github.com:usuario/cotafacil-automacao.git

cd cotafacil-automacao
```

### 2.3 Instalar Dependências

```bash
# Instalar pacotes Node.js
npm install

# Instalar navegador Chromium do Playwright
npm run install:browsers

# Verificar instalação
npx playwright --version
```

### 2.4 Configurar Arquivo .env

```bash
# Copiar exemplo
cp env.example .env

# Editar (use seu editor preferido)
nano .env
# ou
code .env
# ou
notepad .env
```

**Preencher TODAS as variáveis:**

```env
# Z-API Configuration
ZAPI_INSTANCE_ID=sua_instance_id_aqui
ZAPI_TOKEN=seu_token_aqui
ZAPI_BASE_URL=https://api.z-api.io

# WhatsApp Business Number
WHATSAPP_NUMBER=5511999484829

# Canopus Credentials
CANOPUS_URL=https://url-do-canopus.com.br
CANOPUS_USERNAME=seu_usuario
CANOPUS_PASSWORD=sua_senha

# OpenAI API (for AI classification)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Server Configuration
PORT=3000
NODE_ENV=production

# Admin WhatsApp for forwarding
ADMIN_WHATSAPP=5511999999999
```

**Salvar e fechar.**

## ✅ 3. Testes

### 3.1 Teste RPA (Milestone 7 dias) ⭐

Este é o **teste mais importante** - demonstra que o robô consegue:
1. Acessar o portal Canopus
2. Fazer login
3. Gerar uma cotação

```bash
# Teste cotação de carro
npm run test:rpa car

# Teste cotação de imóvel
npm run test:rpa property
```

**O que esperar:**
- Navegador abre (modo visível)
- Acessa portal Canopus
- Faz login
- Preenche formulário
- Gera cotação
- Mostra resultado no terminal
- Screenshots salvos em `./screenshots/`

**Se der erro:**
1. Verifique credenciais do Canopus
2. Confira URL do Canopus
3. Veja screenshots para identificar problema
4. Ajuste seletores no código (veja próxima seção)

### 3.2 Teste Servidor Local

```bash
# Iniciar servidor
npm start
```

**Deve mostrar:**
```
🚀 Iniciando CotaFácil Automação...
✅ Configurações validadas
✅ Limpeza automática ativada
✅ Servidor rodando na porta 3000
🎯 Sistema pronto para receber mensagens!
```

**Testar endpoint:**
```bash
# Abrir outro terminal
curl http://localhost:3000/
```

**Resposta esperada:**
```json
{
  "status": "online",
  "service": "CotaFácil Automação",
  "version": "1.0.0",
  "timestamp": "..."
}
```

### 3.3 Teste Fluxo Completo

Com servidor rodando:

```bash
curl -X POST http://localhost:3000/test-message \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "message": "Quero cotar um carro"
  }'
```

**O que acontece:**
1. IA classifica como "CARRO"
2. Bot responde pedindo dados
3. (Você pode continuar enviando mensagens simuladas)

## 🔧 4. Ajustar Seletores do Canopus

Os seletores CSS são os "endereços" dos elementos da página.  
O código tem **exemplos genéricos** que precisam ser ajustados.

### 4.1 Identificar Elementos

1. Execute `npm run test:rpa car`
2. Quando navegador abrir, **NÃO FECHE**
3. Pressione **F12** (abre DevTools)
4. Clique no ícone de seleção (🔍)
5. Clique nos elementos da página

**Elementos importantes:**
- Campo de usuário
- Campo de senha
- Botão de login
- Campo de valor
- Select de prazo
- Botão de gerar cotação
- Resultado da cotação

### 4.2 Copiar Seletores

No DevTools:
1. Clique com botão direito no elemento HTML
2. Copy → Copy selector
3. Cole no código

### 4.3 Atualizar Código

Edite: `src/services/canopus-rpa.service.js`

**Exemplo - Login:**

```javascript
// ANTES (exemplo genérico)
const usernameSelector = 'input[name="username"]';

// DEPOIS (seletor real do site)
const usernameSelector = 'input#usuario-field';
```

**Locais para ajustar:**

1. **Método `login()`** (linhas ~45-75):
   - `usernameSelector`
   - `passwordSelector`
   - `loginButtonSelector`

2. **Método `generateCarQuotation()`** (linhas ~80-130):
   - `valueSelector`
   - `prazoSelector`
   - Campos de dados pessoais
   - `generateButtonSelector`

3. **Método `generatePropertyQuotation()`** (linhas ~135-185):
   - Mesmos ajustes do anterior

4. **Método `extractQuotationData()`** (linhas ~190-220):
   - `monthlyPaymentSelector`
   - `adminFeeSelector`

### 4.4 Testar Novamente

Após cada ajuste:
```bash
npm run test:rpa car
```

Repita até funcionar perfeitamente.

## 🌐 5. Configurar Webhook Z-API

Para receber mensagens do WhatsApp, você precisa:

### 5.1 Servidor Público

**Opção A: ngrok (desenvolvimento)**

```bash
# Instalar ngrok
# Windows: baixar de https://ngrok.com/download
# Linux/Mac: 
brew install ngrok
# ou
snap install ngrok

# Expor porta 3000
ngrok http 3000
```

Copie a URL pública (ex: `https://abc123.ngrok.io`)

**Opção B: VPS (produção)**

Deploy em servidor (Digital Ocean, AWS, etc.)  
URL será algo como: `https://cotafacil.seudominio.com`

### 5.2 Configurar no Z-API

1. Acesse painel Z-API
2. Selecione sua instância
3. Vá em "Webhooks"
4. Configure:
   - **URL**: `https://sua-url-publica/webhook`
   - **Eventos**: Marque "message" e "message-received"
   - **Método**: POST
5. Salve

### 5.3 Testar Webhook

1. Envie mensagem para: **+55 11 99948-4829**
2. Veja logs do servidor:
   ```bash
   npm start
   ```
3. Deve aparecer:
   ```
   📨 Webhook recebido: {...}
   📱 Nova mensagem de 5511999999999: "Olá"
   ```

## 🚀 6. Deploy em Produção

### 6.1 VPS Recomendada

**Provedores:**
- **DigitalOcean**: Droplet $6/mês
- **Vultr**: Cloud Compute $6/mês
- **AWS**: EC2 t2.micro (grátis 1 ano)

**Specs mínimas:**
- 2 GB RAM
- 1 vCPU
- 20 GB SSD
- Ubuntu 22.04

### 6.2 Setup no Servidor

```bash
# Conectar via SSH
ssh root@seu-ip

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs git

# Clonar projeto
git clone <url-do-repositorio>
cd cotafacil-automacao

# Instalar dependências
npm install
npm run install:browsers

# Instalar dependências do Playwright no Ubuntu
npx playwright install-deps

# Criar arquivo .env
nano .env
# (Colar suas credenciais)

# Instalar PM2 (gerenciador de processos)
npm install -g pm2

# Iniciar aplicação
pm2 start src/index.js --name cotafacil

# Configurar para iniciar no boot
pm2 startup
pm2 save

# Ver logs
pm2 logs cotafacil

# Status
pm2 status
```

### 6.3 Nginx (Opcional - HTTPS)

```bash
# Instalar Nginx
apt install nginx

# Configurar
nano /etc/nginx/sites-available/cotafacil

# Colar:
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Ativar
ln -s /etc/nginx/sites-available/cotafacil /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# SSL com Let's Encrypt
apt install certbot python3-certbot-nginx
certbot --nginx -d seu-dominio.com
```

## 📊 7. Monitoramento

### Ver Logs

```bash
# PM2
pm2 logs cotafacil

# Últimas 100 linhas
pm2 logs cotafacil --lines 100

# Erro apenas
pm2 logs cotafacil --err
```

### Estatísticas

```bash
# Via curl
curl http://localhost:3000/stats

# Ou no navegador
http://seu-dominio.com/stats
```

### Reiniciar

```bash
# Restart
pm2 restart cotafacil

# Reload (zero downtime)
pm2 reload cotafacil

# Stop
pm2 stop cotafacil

# Start
pm2 start cotafacil
```

## 🐛 8. Problemas Comuns

### "EADDRINUSE: address already in use"

**Causa:** Porta 3000 já está em uso.

**Solução:**
```bash
# Encontrar processo
lsof -i :3000

# Matar processo
kill -9 <PID>

# Ou mudar porta no .env
PORT=3001
```

### "Cannot find module"

**Causa:** Dependências não instaladas.

**Solução:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### "Timeout" no Playwright

**Causa:** Site demorou muito ou seletor errado.

**Solução:**
- Aumentar timeout no código: `timeout: 60000`
- Verificar seletores
- Testar manualmente no navegador

### Mensagens não chegam

**Causa:** Webhook não configurado ou servidor não acessível.

**Solução:**
- Verificar webhook no Z-API
- Testar URL: `curl https://sua-url/webhook`
- Verificar logs: `pm2 logs`

### Bot responde muito devagar

**Causa:** OpenAI ou RPA demora.

**Solução:**
- Normal: 5-15 segundos por cotação
- Se > 30 segundos, verificar rede
- Considerar usar GPT-4o-mini (mais rápido)

## ✅ Checklist Final

Antes de considerar pronto:

- [ ] Teste RPA funciona (carro E imóvel)
- [ ] Servidor sobe sem erros
- [ ] Webhook recebe mensagens
- [ ] Fluxo completo testado manualmente
- [ ] Screenshots sendo gerados
- [ ] Logs sem erros críticos
- [ ] Backup do código no Git
- [ ] Documentação lida e entendida
- [ ] Credenciais seguras (não commitadas)

## 📞 Próximos Passos

1. ✅ Completar setup
2. ✅ Testar RPA (Milestone 7 dias)
3. ✅ Ajustar seletores conforme necessário
4. ✅ Testar fluxo ponta a ponta
5. ✅ Deploy em VPS
6. ✅ Configurar webhook
7. ✅ Testar com cliente real
8. ✅ Entregar MVP (15 dias)

---

**Sucesso! 🎉**

Se tiver dúvidas, consulte o README.md ou entre em contato.
