# ⚡ Quick Start - CotaFácil Automação

Guia rápido para colocar o sistema rodando em 5 minutos!

## 🚀 Setup Rápido

### 1. Instalar (2 minutos)

```bash
# Instalar dependências Node.js
npm install

# Instalar navegador Chromium para RPA
npm run install:browsers
```

### 2. Configurar (2 minutos)

```bash
# Copiar arquivo de exemplo
cp env.example .env

# Editar com suas credenciais
# Windows:
notepad .env

# Mac/Linux:
nano .env
```

**Mínimo necessário para testar:**

```env
CANOPUS_URL=https://url-do-canopus.com.br
CANOPUS_USERNAME=seu_usuario
CANOPUS_PASSWORD=sua_senha
OPENAI_API_KEY=sk-...
```

### 3. Testar Login (1 minuto) ⭐ RECOMENDADO PRIMEIRO

```bash
# Testar apenas o login automático
npm run test:login
```

**Sucesso? 🎉**
- Navegador abre
- Login automático funciona
- Você vê a página logada
- Screenshots em `./screenshots/`

**Se funcionou, continue para o teste completo abaixo!**

### 4. Testar RPA Completo (1 minuto)

```bash
# Testar cotação de carro
npm run test:rpa car
```

**Sucesso? 🎉**
- Navegador abre
- Faz login automaticamente
- Gera cotação
- Screenshots em `./screenshots/`

**Erro?** Veja [Troubleshooting](#troubleshooting)

---

## 📱 Configurar WhatsApp (Opcional para teste inicial)

### Z-API Setup

1. **Criar conta**: [https://www.z-api.io](https://www.z-api.io)
2. **Email**: `cotafacilalphaville@gmail.com`
3. **Criar instância** e conectar WhatsApp
4. **Copiar credenciais** para `.env`:

```env
ZAPI_INSTANCE_ID=sua_instance_id
ZAPI_TOKEN=seu_token
WHATSAPP_NUMBER=5511999484829
ADMIN_WHATSAPP=seu_numero_admin
```

### Iniciar Servidor

```bash
npm start
```

Deve mostrar:
```
✅ Servidor rodando na porta 3000
🎯 Sistema pronto para receber mensagens!
```

### Configurar Webhook

No painel Z-API:
- **URL**: `https://sua-url-publica/webhook`
- **Eventos**: message, message-received

Para testes locais, use [ngrok](https://ngrok.com):

```bash
# Terminal 1
npm start

# Terminal 2
ngrok http 3000
# Copie URL pública para Z-API
```

---

## 🧪 Testes Disponíveis

### 1. Teste de Login Automático ⭐

```bash
npm run test:login
```

Testa apenas o processo de login. Use este primeiro para verificar se as credenciais estão corretas.

### 2. Teste RPA - Cotação de Carro

```bash
npm run test:rpa car
```

### 3. Teste RPA - Cotação de Imóvel

```bash
npm run test:rpa property
```

### 4. Teste RPA - Ambos

```bash
npm run test:rpa both
```

### 4. Teste Servidor

```bash
# Terminal 1: Iniciar servidor
npm start

# Terminal 2: Testar endpoint
curl http://localhost:3000/

# Teste mensagem simulada
curl -X POST http://localhost:3000/test-message \
  -H "Content-Type: application/json" \
  -d '{"phone":"5511999999999","message":"Quero cotar um carro"}'
```

---

## 🔧 Ajustar Seletores do Canopus

⚠️ **IMPORTANTE**: Os seletores são exemplos genéricos!

### Como ajustar:

1. **Execute teste RPA**:
   ```bash
   npm run test:rpa car
   ```

2. **Veja screenshots** em `./screenshots/`

3. **Identifique elementos**:
   - Pressione F12 no navegador
   - Use ferramenta de seleção (🔍)
   - Clique no elemento
   - Copie o seletor

4. **Edite código**:
   ```bash
   # Arquivo a editar:
   src/services/canopus-rpa.service.js
   ```

5. **Locais principais**:
   - Linha ~50: Login (username, password, button)
   - Linha ~100: Formulário carro (valor, prazo, botão)
   - Linha ~150: Formulário imóvel
   - Linha ~200: Extração de cotação

6. **Teste novamente**:
   ```bash
   npm run test:rpa car
   ```

Repita até funcionar! 🎯

---

## 📊 Verificar Status

### Servidor rodando?

```bash
curl http://localhost:3000/
```

### Ver sessões ativas

```bash
curl http://localhost:3000/stats
```

### Ver logs

```bash
# Modo desenvolvimento (vê logs em tempo real)
npm start

# Produção (PM2)
pm2 logs cotafacil
```

---

## 🐛 Troubleshooting

### ❌ "Configurações obrigatórias faltando"

**Problema**: Arquivo `.env` não configurado

**Solução**:
```bash
cp env.example .env
nano .env  # Preencher credenciais
```

### ❌ "Cannot find module"

**Problema**: Dependências não instaladas

**Solução**:
```bash
npm install
npm run install:browsers
```

### ❌ Timeout no RPA

**Problema**: Site demorou ou seletor errado

**Solução**:
1. Veja screenshots em `./screenshots/`
2. Ajuste seletores no código
3. Aumente timeout: `timeout: 60000`

### ❌ Playwright não funciona

**Problema**: Navegador não instalado

**Solução**:
```bash
npm run install:browsers

# Linux/Ubuntu - dependências do sistema
npx playwright install-deps
```

### ❌ Porta 3000 em uso

**Problema**: Outro app usando porta

**Solução**:
```bash
# Mudar porta no .env
PORT=3001

# Ou matar processo
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -i :3000
kill -9 <PID>
```

---

## 📁 Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `src/index.js` | Servidor principal |
| `src/services/canopus-rpa.service.js` | RPA - AJUSTAR SELETORES |
| `src/services/whatsapp.service.js` | WhatsApp (Z-API) |
| `src/services/ai.service.js` | IA (OpenAI) |
| `src/services/orchestrator.service.js` | Orquestração |
| `.env` | Credenciais (CRIAR) |
| `screenshots/` | Screenshots do RPA |

---

## 🎯 Checklist de Validação

### ✅ Milestone 7 Dias

- [ ] Instalação completa
- [ ] Arquivo `.env` configurado
- [ ] Teste RPA executado com sucesso
- [ ] Screenshots gerados
- [ ] Login no Canopus funciona
- [ ] Cotação gerada (carro OU imóvel)
- [ ] Vídeo/print do resultado

### ✅ Milestone 15 Dias

- [ ] Z-API configurado
- [ ] OpenAI funcionando
- [ ] Servidor rodando
- [ ] Webhook configurado
- [ ] Fluxo completo testado:
  - [ ] Cliente envia mensagem
  - [ ] IA classifica tipo
  - [ ] Bot coleta dados
  - [ ] RPA gera cotação
  - [ ] Cliente recebe resultado
- [ ] Teste carro ✅
- [ ] Teste imóvel ✅
- [ ] Teste "outros" (encaminha humano) ✅

---

## 🚀 Deploy Rápido

### VPS (Produção)

```bash
# Conectar
ssh root@seu-ip

# Setup completo em um comando
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
apt-get install -y nodejs git && \
git clone <url-repositorio> && \
cd cotafacil-automacao && \
npm install && \
npm run install:browsers && \
npx playwright install-deps && \
npm install -g pm2 && \
cp env.example .env && \
echo "Configure .env agora!" && \
nano .env

# Depois de configurar .env:
pm2 start src/index.js --name cotafacil && \
pm2 startup && \
pm2 save && \
pm2 logs cotafacil
```

### Docker (Alternativa)

```bash
# Build
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 📚 Mais Informações

- **README.md** - Documentação completa
- **SETUP_GUIDE.md** - Guia passo a passo detalhado
- **CHANGELOG.md** - O que foi implementado

---

## 🎬 Exemplo de Uso Real

### Fluxo Completo:

1. **Cliente**: Envia "Quero cotar um carro de 50 mil" no WhatsApp

2. **Sistema**: 
   - IA classifica: CARRO
   - Bot responde: "Para gerar cotação, preciso de..."

3. **Cliente**: Envia dados
   ```
   Valor: R$ 50000
   Prazo: 60 meses
   Nome: João Silva
   CPF: 123.456.789-00
   Data Nascimento: 01/01/1990
   Email: joao@email.com
   ```

4. **Sistema**:
   - Valida dados
   - "⏳ Processando sua cotação..."
   - RPA acessa Canopus
   - Gera cotação

5. **Cliente**: Recebe cotação
   ```
   ✅ Cotação Gerada com Sucesso!
   
   Tipo: Consórcio de Automóvel
   Valor: R$ 50.000,00
   Prazo: 60 meses
   Parcela: R$ 958,33
   Taxa: 15%
   ```

6. **Cliente**: "Quero fechar"

7. **Sistema**: Encaminha para atendimento humano

---

## 🎉 Sucesso!

Se chegou até aqui e tudo funcionou, você tem:

✅ Sistema completo de automação  
✅ WhatsApp integrado  
✅ IA funcionando  
✅ RPA gerando cotações  
✅ Fluxo ponta a ponta  

**Parabéns! MVP completo! 🚀**

---

**Dúvidas?** Consulte:
- README.md (visão geral)
- SETUP_GUIDE.md (passo a passo)
- Comentários no código

**Email**: cotafacilalphaville@gmail.com
