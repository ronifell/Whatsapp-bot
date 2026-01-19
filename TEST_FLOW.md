# 🧪 Teste do Fluxo Completo de Cotação Automática

Este documento explica como testar o fluxo completo de geração automática de cotações de consórcio de automóvel.

## 📋 Visão Geral

O sistema testa o fluxo completo:
1. **Recebimento de mensagem** (simulado)
2. **Classificação com OpenAI** - Identifica que é pedido de consórcio de automóvel
3. **Extração de dados com OpenAI** - Extrai dados do cliente da mensagem
4. **Geração de cotação via RPA** - Faz login, extrai dados da tabela e encontra melhor plano
5. **Envio da cotação** (simulado em modo teste)

## 🚀 Como Executar o Teste

### Opção 1: Mensagem Completa (Recomendado)

Testa com uma mensagem completa contendo todos os dados:

```bash
npm run test:flow
```

### Opção 2: Mensagem em Etapas

Testa com mensagens separadas (mais realista):

```bash
npm run test:flow:step
```

## 📝 Template de Mensagem

### Mensagem Completa

```
Olá, gostaria de fazer uma cotação de consórcio de automóvel. 
Tenho interesse em um veículo no valor de R$ 150.000,00 com prazo de 60 meses. 
Meu nome é João Silva, CPF 123.456.789-00, nasci em 15/03/1985 e meu email é joao.silva@email.com
```

### Mensagem em Etapas

**Etapa 1:**
```
Olá, quero cotar um consórcio de carro
```

**Etapa 2:**
```
Valor: R$ 150.000,00
Prazo: 60 meses
Nome: João Silva
CPF: 123.456.789-00
Data Nascimento: 15/03/1985
Email: joao.silva@email.com
```

## 🔄 Fluxo do Processo

### 1. Recebimento da Mensagem
- O sistema recebe a mensagem do cliente
- Cria uma sessão para o cliente

### 2. Classificação com IA
- OpenAI analisa a mensagem
- Identifica o tipo: **CARRO**, **IMOVEL** ou **OUTROS**
- Neste caso, deve identificar como **CARRO**

### 3. Solicitação de Dados (se necessário)
- Se a mensagem não contiver todos os dados, o sistema solicita
- Com a mensagem template completa, todos os dados são extraídos

### 4. Extração de Dados com IA
- OpenAI extrai os dados estruturados:
  - Valor do veículo
  - Prazo em meses
  - Nome completo
  - CPF
  - Data de nascimento
  - Email

### 5. Validação dos Dados
- Verifica se todos os campos estão presentes
- Valida formato de CPF e email
- Valida se o prazo é válido para automóvel (24, 36, 48, 60, 72, 80 meses)

### 6. Geração da Cotação via RPA
- **Login no sistema Canopus** (duas etapas)
- **Navegação para página de planos**
- **Seleção de AUTOMOVEIS** no dropdown
- **Seleção de IPCA** no radio button
- **Extração de dados** de todas as 19 páginas
- **Busca do melhor plano** correspondente ao valor e prazo do cliente
- **Geração da cotação** com os dados encontrados

### 7. Envio da Cotação
- Em modo teste: apenas exibe no console
- Em produção: enviaria via WhatsApp

## 📊 O que o Teste Mostra

Durante a execução, você verá:

1. ✅ **Validação de configurações**
2. 📱 **Mensagem do cliente recebida**
3. 🤖 **Classificação pela IA** (CARRO)
4. 🤖 **Extração de dados pela IA**
5. ✅ **Validação dos dados**
6. 🚗 **Início da geração de cotação**
7. 🔐 **Login no sistema Canopus**
8. 📋 **Navegação e extração de dados**
9. 🔍 **Busca do melhor plano**
10. ✅ **Cotação gerada e exibida**

## 📁 Arquivos Gerados

Após a execução, você terá:

- **Screenshots**: `./screenshots/listagem-planos-*.png`
- **Dados extraídos**: `./data/table-data-automoveis-all-pages-*.json`
- **Dados em CSV**: `./data/table-data-automoveis-all-pages-*.csv`
- **Dados em TXT**: `./data/table-data-automoveis-all-pages-*.txt`

## ⚙️ Configuração Necessária

Certifique-se de que o arquivo `.env` contém:

```env
# OpenAI
OPENAI_API_KEY=sk-proj-...

# Canopus
CANOPUS_URL=https://parceiros.consorciocanopus.com.br/pages/auth/login
CANOPUS_USERNAME=seu_usuario
CANOPUS_PASSWORD=sua_senha

# Z-API (não usado em modo teste, mas necessário para validação)
ZAPI_INSTANCE_ID=...
ZAPI_TOKEN=...
ZAPI_BASE_URL=https://api.z-api.io
```

## 🧪 Modo de Teste

O script ativa automaticamente o **modo de teste**, que:
- ✅ Não envia mensagens reais via WhatsApp
- ✅ Apenas exibe as mensagens no console
- ✅ Executa todo o fluxo RPA normalmente
- ✅ Gera todos os arquivos normalmente

## 🔍 Verificando os Resultados

### 1. Verificar Logs do Console
Todos os passos são exibidos no console com emojis para fácil identificação.

### 2. Verificar Arquivos Gerados
- Dados extraídos em `./data/`
- Screenshots em `./screenshots/`

### 3. Verificar Cotação Gerada
A cotação final será exibida no console e incluirá:
- Tipo de consórcio
- Valor do bem
- Prazo
- Parcela mensal
- Detalhes do plano encontrado

## 🐛 Troubleshooting

### Erro: "Configurações obrigatórias faltando"
- Verifique se o arquivo `.env` está completo
- Certifique-se de que todas as variáveis estão preenchidas

### Erro: "Erro na classificação IA"
- Verifique se a `OPENAI_API_KEY` está correta
- Verifique sua conexão com a internet

### Erro: "Erro ao fazer login"
- Verifique as credenciais do Canopus no `.env`
- Execute `npm run test:login` para testar apenas o login

### Erro: "Nenhum arquivo de dados extraídos encontrado"
- A extração pode ter falhado
- Verifique os logs para ver onde parou
- Execute `npm run test:login` para verificar se o fluxo de extração funciona

## 📝 Personalizando a Mensagem Template

Você pode modificar a mensagem template em `src/test-full-flow.js`:

```javascript
const customerMessageTemplate = {
  initial: `Sua mensagem personalizada aqui...`,
  // ...
};
```

## 🚀 Próximos Passos

Após validar que o teste funciona:

1. **Integrar com WhatsApp real** - Configurar webhook Z-API
2. **Ajustar seletores** - Se necessário, ajustar seletores do RPA
3. **Otimizar busca de planos** - Melhorar algoritmo de matching
4. **Adicionar mais tipos** - Expandir para outros tipos de consórcio

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs do console
2. Verifique os screenshots em `./screenshots/`
3. Verifique os arquivos de dados em `./data/`
4. Execute testes individuais (`test:login`, `test:rpa`)
