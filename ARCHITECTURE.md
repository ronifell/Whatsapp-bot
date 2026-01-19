# Arquitetura do Sistema - CotaFácil Automação

## 📐 Visão Geral da Arquitetura

```
┌─────────────────┐
│   WhatsApp      │
│   Cliente       │
└────────┬────────┘
         │
         │ Envia mensagem
         ↓
┌────────────────────────────────────────┐
│         Z-API (WhatsApp API)           │
└────────────────┬───────────────────────┘
                 │ Webhook
                 ↓
┌────────────────────────────────────────┐
│      Servidor Node.js (Express)        │
│         src/index.js                   │
└────────────────────────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────┐
│     Orchestrator Service               │
│  (Gerencia fluxo completo)             │
└────────────────────────────────────────┘
         │
         ├─→ [Session Service]
         │   (Gerencia estado do usuário)
         │
         ├─→ [AI Service - OpenAI]
         │   ├─ Classifica tipo (CARRO/IMOVEL/OUTROS)
         │   ├─ Extrai dados estruturados
         │   └─ Valida informações
         │
         ├─→ [WhatsApp Service - Z-API]
         │   ├─ Envia boas-vindas
         │   ├─ Solicita dados
         │   ├─ Envia cotação
         │   └─ Encaminha para humano
         │
         └─→ [Canopus RPA]
             ├─ Login automático
             ├─ Preenchimento de formulários
             ├── Captura de screenshots
             └── Extração de cotação

---

## 🎯 Fluxo MVP Completo Implementado

✅ **1. Cliente envia mensagem no WhatsApp**
   - Mensagem recebida via webhook Z-API

✅ **2. IA classifica o pedido**
   - OpenAI GPT-4o-mini analisa mensagem
   - Determina tipo: CARRO, IMOVEL ou OUTROS

✅ **3. Sistema coleta dados**
   - Bot solicita informações necessárias
   - IA extrai e valida dados automaticamente

✅ **4. RPA gera cotação**
   - Playwright acessa portal Canopus
   - Faz login automaticamente
   - Preenche formulário
   - Captura resultado

✅ **5. Cliente recebe cotação**
   - Via WhatsApp automaticamente
   - Com todas as informações necessárias

✅ **6. Opção de fechamento**
   - Cliente pode solicitar seguir com contratação
   - Sistema encaminha para atendimento humano

---

## 📦 Estrutura Entregue

```
cotafacil-automacao/
├── src/
│   ├── config/
│   │   └── config.js                 # Configurações centralizadas
│   ├── services/
│   │   ├── ai.service.js             # IA para classificação (OpenAI)
│   │   ├── canopus-rpa.service.js    # RPA Playwright
│   │   ├── orchestrator.service.js   # Orquestração do fluxo
│   │   ├── session.service.js        # Gerenciamento de sessões
│   │   └── whatsapp.service.js       # Integração Z-API
│   ├── index.js                       # Servidor principal
│   └── test-rpa.js                    # Script de teste
├── screenshots/                        # Screenshots do RPA
├── .dockerignore
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── env.example                         # Exemplo de configuração
├── package.json
├── README.md                           # Documentação principal
└── SETUP_GUIDE.md                      # Guia detalhado de configuração
