# CotaFácil Automação MVP

Sistema de automação completo para cotação de consórcios via WhatsApp + IA + RPA.

## 📋 Visão Geral

Este sistema automatiza o processo de cotação de consórcio, integrando:

- ✅ **WhatsApp Business** (Z-API) - Atendimento automatizado
- 🤖 **Inteligência Artificial** (OpenAI) - Classificação e validação de dados
- 🎯 **RPA** (Playwright) - Automação do portal Canopus
- 📊 **Fluxo Completo** - Da solicitação à cotação final

## 🎯 Funcionalidades do MVP

### Produtos Automatizados:
1. **Consórcio de Automóvel** ✅
2. **Consórcio de Imóvel** ✅
3. **Outros/Consultoria** → Encaminha para atendimento humano

### Fluxo Automatizado:
1. Cliente envia mensagem no WhatsApp
2. IA classifica o tipo de consórcio
3. Sistema coleta dados necessários
4. RPA acessa portal Canopus e gera cotação
5. Cotação é enviada automaticamente ao cliente
6. Cliente pode solicitar fechamento (encaminhado para humano)

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+ instalado
- Conta Z-API configurada
- Credenciais do portal Canopus
- Chave da API OpenAI

### Passo 1: Clonar o projeto

```bash
git clone <url-do-repositorio>
cd cotafacil-automacao
```

### Passo 2: Instalar dependências

```bash
npm install
```

### Passo 3: Instalar navegador Playwright

```bash
npm run install:browsers
```

### Passo 4: Configurar variáveis de ambiente

Copie o arquivo `env.example` para `.env`:

```bash
cp env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Z-API Configuration
ZAPI_INSTANCE_ID=sua_instance_id
ZAPI_TOKEN=seu_token
ZAPI_BASE_URL=https://api.z-api.io

# WhatsApp Business Number
WHATSAPP_NUMBER=5511999484829

# Canopus Credentials
CANOPUS_URL=https://url-do-canopus.com.br
CANOPUS_USERNAME=seu_usuario
CANOPUS_PASSWORD=sua_senha

# OpenAI API
OPENAI_API_KEY=sk-...

# Server Configuration
PORT=3000
NODE_ENV=production

# Admin WhatsApp
ADMIN_WHATSAPP=5511999999999

# Quotation Mode
# 'scraping' = usa scraping em tempo real (modo original, mais lento)
# 'pre-scraped' = usa dados previamente extraídos da pasta data/ (modo rápido, recomendado)
QUOTATION_MODE=pre-scraped
```

## ⚡ Modos de Operação

O sistema suporta dois modos de geração de cotações:

### Modo Pre-Scraped (Recomendado - Rápido) ⚡

**Configuração**: `QUOTATION_MODE=pre-scraped`

Este modo usa dados previamente extraídos armazenados na pasta `data/`. É muito mais rápido pois não precisa acessar o website em tempo real.

**Como funciona:**
1. O sistema lê os arquivos JSON mais recentes da pasta `data/`
2. Busca o plano mais adequado baseado no valor e prazo solicitado pelo cliente
3. Retorna a cotação instantaneamente

**Vantagens:**
- ⚡ Resposta muito mais rápida (segundos vs minutos)
- 💰 Não consome recursos do servidor Canopus
- 🔄 Funciona mesmo se o site estiver temporariamente indisponível

**Requisitos:**
- Arquivos JSON na pasta `data/` com dados previamente extraídos
- Arquivos devem seguir o padrão:
  - `table-data-automoveis-all-pages-*.json` (para cotações de carro)
  - `table-data-imoveis-all-pages-*.json` (para cotações de imóvel)

**Para atualizar os dados:**
Execute o scraping uma vez para gerar os arquivos JSON na pasta `data/`:
```bash
# Execute o scraping normalmente (modo scraping)
QUOTATION_MODE=scraping npm start
# Ou use o script de teste RPA
npm run test:rpa
```

### Modo Scraping (Original - Completo) 🕷️

**Configuração**: `QUOTATION_MODE=scraping`

Este é o modo original que acessa o website Canopus em tempo real para gerar cotações.

**Como funciona:**
1. Abre navegador automatizado
2. Faz login no portal Canopus
3. Navega até a página de planos
4. Extrai dados em tempo real
5. Encontra o melhor plano
6. Retorna a cotação

**Vantagens:**
- 📊 Dados sempre atualizados
- 🔍 Busca em tempo real
- ✅ Garante dados mais recentes

**Desvantagens:**
- ⏱️ Mais lento (pode levar minutos)
- 💻 Consome mais recursos
- 🌐 Depende da disponibilidade do site

**Quando usar:**
- Quando você precisa de dados atualizados
- Para gerar/atualizar os arquivos JSON na pasta `data/`
- Para testes e validação

### Como Alternar Entre Modos

Para alternar entre os modos, simplesmente altere a variável `QUOTATION_MODE` no arquivo `.env`:

```bash
# Modo rápido (pre-scraped)
QUOTATION_MODE=pre-scraped

# Modo completo (scraping)
QUOTATION_MODE=scraping
```

Depois de alterar, reinicie o servidor:
```bash
npm start
```

## 💻 Frontend de Teste (WhatsApp Simulado)

Um frontend Next.js está disponível para testar o sistema sem precisar do WhatsApp real.

### Características:
- Interface similar ao WhatsApp
- Mensagens em tempo real via Server-Sent Events
- Respostas automáticas do bot
- Geração de cotações quando solicitado

### Como usar o frontend:

1. **Inicie o backend** (na raiz do projeto):
```bash
npm start
```

2. **Em outro terminal, inicie o frontend**:
```bash
cd frontend
npm install
npm run dev
```

3. **Acesse no navegador**: http://localhost:3001

4. **Teste enviando mensagens**, como:
   - "Quero cotar um carro de 50 mil"
   - "Preciso de uma cotação de imóvel"
   - Informações completas de uma vez

O frontend está conectado ao mesmo backend que o WhatsApp real. Para usar com WhatsApp real, simplesmente remova o frontend ou defina `FRONTEND_MODE=false` no `.env`.

**Veja mais detalhes em**: [frontend/README.md](frontend/README.md)

## 🧪 Testes

### Teste 0: Login Automático (Recomendado primeiro)

**Antes de testar o fluxo completo, verifique se o login automático está funcionando:**

```bash
npm run test:login
```

**O que o teste faz:**
- Abre navegador (modo visível para debug)
- Navega para a URL do Canopus configurada no `.env`
- Preenche automaticamente usuário e senha do `.env`
- Clica no botão de login
- Verifica se o login foi bem-sucedido
- Captura screenshots de cada etapa
- Mantém navegador aberto por 10 segundos para inspeção manual

**Como verificar se está funcionando:**
1. ✅ O navegador abre e acessa a página de login
2. ✅ Os campos de usuário e senha são preenchidos automaticamente
3. ✅ O botão de login é clicado automaticamente
4. ✅ A página navega para uma área logada (dashboard/painel)
5. ✅ Não aparecem mensagens de erro de login
6. ✅ Os screenshots em `./screenshots/` mostram o processo completo

**Se o login falhar:**
- Verifique se `CANOPUS_URL`, `CANOPUS_USERNAME` e `CANOPUS_PASSWORD` estão corretos no `.env`
- Verifique os screenshots em `./screenshots/` para ver o que aconteceu
- Os seletores CSS podem precisar ser ajustados no arquivo `src/services/canopus-rpa.service.js`
- Verifique se há captcha ou autenticação de dois fatores no site

### Teste 1: RPA Canopus (Milestone 7 dias)

Teste o robô acessando o portal Canopus:

```bash
# Testar cotação de automóvel
npm run test:rpa car

# Testar cotação de imóvel
npm run test:rpa property

# Testar ambos
npm run test:rpa both
```

**O que o teste faz:**
- Abre navegador (modo visível para debug)
- Faz login no portal Canopus automaticamente
- Preenche formulário de cotação
- Captura screenshots de cada etapa
- Retorna dados da cotação

**Screenshots serão salvos em:** `./screenshots/`

### Teste 2: Fluxo Completo

Inicie o servidor:

```bash
npm start
```

Teste via curl ou Postman:

```bash
curl -X POST http://localhost:3000/test-message \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "message": "Quero cotar um carro de 50 mil"
  }'
```

## 📱 Configuração do WhatsApp (Z-API)

### 1. Criar conta Z-API

1. Acesse [https://www.z-api.io](https://www.z-api.io)
2. Cadastre-se usando o email: `cotafacilalphaville@gmail.com`
3. Crie uma instância de WhatsApp
4. Vincule o número: +55 11 99948-4829

### 2. Configurar Webhook

No painel da Z-API:

1. Acesse sua instância
2. Configure o webhook: `https://seu-servidor.com/webhook`
3. Ative eventos de mensagens recebidas

### 3. Obter credenciais

Copie:
- **Instance ID**: Encontrado no painel
- **Token**: Gerado no painel
- **Base URL**: `https://api.z-api.io`

## 🖥️ Implantação

### Opção 1: VPS (Recomendado)

**Provedores sugeridos:**
- DigitalOcean
- AWS EC2
- Google Cloud
- Vultr

**Requisitos mínimos:**
- 2 GB RAM
- 20 GB disco
- Ubuntu 22.04

**Passo a passo:**

```bash
# Conectar via SSH
ssh usuario@seu-servidor

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar projeto
git clone <url-do-repositorio>
cd cotafacil-automacao

# Instalar dependências
npm install
npm run install:browsers

# Configurar .env
nano .env
# (Cole suas credenciais)

# Instalar PM2 para manter o processo rodando
sudo npm install -g pm2

# Iniciar aplicação
pm2 start src/index.js --name cotafacil
pm2 save
pm2 startup

# Ver logs
pm2 logs cotafacil
```

### Opção 2: Heroku

```bash
# Instalar Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Criar app
heroku create cotafacil-automacao

# Adicionar buildpack do Playwright
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add https://github.com/mxschmitt/heroku-playwright-buildpack

# Configurar variáveis de ambiente
heroku config:set ZAPI_INSTANCE_ID=xxx
heroku config:set ZAPI_TOKEN=xxx
# ... (todas as variáveis)

# Deploy
git push heroku main

# Ver logs
heroku logs --tail
```

### Opção 3: Docker

```bash
# Build
docker build -t cotafacil-automacao .

# Run
docker run -d \
  --name cotafacil \
  --env-file .env \
  -p 3000:3000 \
  cotafacil-automacao

# Logs
docker logs -f cotafacil
```

## 🔧 Ajustar Seletores do Canopus

⚠️ **IMPORTANTE**: Os seletores no arquivo `src/services/canopus-rpa.service.js` são EXEMPLOS.

Você precisa ajustá-los conforme o site real da Canopus:

1. Execute o teste RPA: `npm run test:rpa`
2. Observe os screenshots salvos
3. Abra o código: `src/services/canopus-rpa.service.js`
4. Ajuste os seletores conforme os elementos reais:

```javascript
// Exemplo de ajustes:
const usernameSelector = 'input[name="usuario"]'; // Ajustar
const passwordSelector = 'input[type="password"]'; // Ajustar
const loginButtonSelector = 'button.btn-entrar'; // Ajustar
```

**Dica**: Use as ferramentas de desenvolvedor do navegador (F12) para inspecionar elementos.

## 📊 Monitoramento

### Ver estatísticas

```bash
curl http://localhost:3000/stats
```

Retorna:
- Sessões ativas
- Estado de cada sessão
- Última atualização

### Logs

```bash
# Desenvolvimento
npm start

# Produção (PM2)
pm2 logs cotafacil

# Docker
docker logs -f cotafacil
```

## 🛠️ Estrutura do Projeto

```
cotafacil-automacao/
├── src/
│   ├── config/
│   │   └── config.js              # Configurações centralizadas
│   ├── services/
│   │   ├── ai.service.js          # Serviço de IA (OpenAI)
│   │   ├── canopus-rpa.service.js # RPA do portal Canopus (modo scraping)
│   │   ├── pre-scraped-data.service.js # Serviço de dados pre-scraped (modo rápido)
│   │   ├── message-bus.service.js # Message bus (frontend-backend)
│   │   ├── orchestrator.service.js # Orquestração do fluxo
│   │   ├── session.service.js     # Gerenciamento de sessões
│   │   └── whatsapp.service.js    # Integração Z-API
│   ├── index.js                   # Servidor principal
│   └── test-rpa.js                # Script de teste RPA
├── data/                           # Dados previamente extraídos (JSON)
│   ├── table-data-automoveis-all-pages-*.json
│   └── table-data-imoveis-all-pages-*.json
├── frontend/                       # Frontend Next.js (teste)
│   ├── app/                        # Next.js App Router
│   ├── components/                 # Componentes React
│   └── package.json
├── screenshots/                    # Screenshots do RPA
├── .gitignore
├── env.example                    # Exemplo de configuração
├── package.json
└── README.md
```

## 🔒 Segurança

### Credenciais

- ✅ Nunca commitar arquivo `.env`
- ✅ Usar variáveis de ambiente
- ✅ Trocar senha do Canopus após MVP
- ✅ Limitar acesso ao servidor
- ✅ Usar HTTPS no webhook

### Dados dos Clientes

- ✅ Não armazenar dados sensíveis em produção
- ✅ Implementar logs sem informações pessoais
- ✅ Seguir LGPD

## 📞 Comandos do WhatsApp

Comandos que o cliente pode usar:

- **MENU** - Volta ao início
- **AJUDA** - Encaminha para atendente
- **FECHAR** - Indica desejo de contratar (encaminha para humano)

## 🐛 Troubleshooting

### Erro: "Configurações obrigatórias faltando"

**Solução**: Verifique se todas as variáveis do `.env` estão preenchidas.

### Erro: "Timeout" no RPA

**Solução**: 
- Aumentar timeout no código
- Verificar se site está acessível
- Ajustar seletores

### Erro: Z-API não recebe mensagens

**Solução**:
- Verificar webhook configurado
- Verificar se servidor está público (não localhost)
- Usar ngrok para testes locais: `ngrok http 3000`

### Screenshots vazios

**Solução**:
- Executar com `headless: false` para debug
- Verificar permissões da pasta `screenshots/`

## 📈 Próximos Passos (Pós-MVP)

- [ ] Adicionar mais tipos de consórcio (motos)
- [ ] Implementar banco de dados para histórico
- [ ] Dashboard de métricas
- [ ] Respostas mais ricas (imagens, PDFs)
- [ ] Testes automatizados
- [ ] CI/CD
- [ ] Suporte a múltiplas administradoras

## 📄 Licença

Este projeto é propriedade de CotaFácil Alphaville.

## 👥 Suporte

Em caso de dúvidas:
- Email: cotafacilalphaville@gmail.com
- WhatsApp: +55 11 99948-4829

---

**Desenvolvido para CotaFácil Alphaville**  
Versão MVP 1.0.0
Automação - whatssap - Canopus consórcio cotação 
