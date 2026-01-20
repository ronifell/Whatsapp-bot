# Como Gerar Dados de Consórcio de Moto

Este guia explica como gerar dados de consórcio de moto para usar no modo pre-scraped, similar aos dados de automóveis e imóveis.

## 📋 Visão Geral

Atualmente, o sistema suporta:
- ✅ **Automóveis** - Dados em `data/table-data-automoveis-all-pages-*.json`
- ✅ **Imóveis** - Dados em `data/table-data-imoveis-all-pages-*.json`
- ⚠️ **Motos** - Atualmente encaminhado para atendimento humano (sem dados)

## 🔄 Como Funciona Atualmente

### Automóveis e Imóveis
1. Sistema classifica como `CARRO` ou `IMOVEL`
2. Usa dados pre-scraped da pasta `data/`
3. Retorna cotação rapidamente

### Motos e Outros Tipos
1. Sistema classifica como `OUTROS`
2. Encaminha automaticamente para atendimento humano
3. Não usa dados pre-scraped

## 🛠️ Como Adicionar Suporte para Motos

Para adicionar suporte automatizado para motos, você precisa:

### Passo 1: Criar Método de Scraping para Motos

No arquivo `src/services/canopus-rpa.service.js`, adicione um método similar aos existentes:

```javascript
/**
 * Navega para página de planos de motos e extrai dados
 */
async navigateToPlansListForMotos() {
  try {
    // Navegar para página de planos
    await this.navigateTo(`${config.canopus.url}/planos`);
    
    // Selecionar tipo: MOTOS (ajustar seletor conforme site real)
    await this.page.selectOption('select[name="tipo"]', 'MOTOS');
    
    // Selecionar índice (se necessário, ajustar conforme site)
    // await this.page.selectOption('select[name="indice"]', 'IPCA'); // ou outro índice
    
    // Aguardar carregamento
    await this.page.waitForTimeout(2000);
    
    // Extrair dados de todas as páginas
    await this.scrapeAndSaveGridData(null, null, false, 'motos');
    
    console.log('✅ Dados de motos extraídos e salvos');
  } catch (error) {
    console.error('❌ Erro ao extrair dados de motos:', error.message);
    throw error;
  }
}

/**
 * Gera cotação de consórcio de moto usando dados extraídos da tabela
 */
async generateMotorcycleQuotation(data) {
  try {
    console.log('🏍️ Gerando cotação de moto...');
    console.log(`   Cliente: ${data.nome}`);
    console.log(`   Valor desejado: R$ ${data.valor.toLocaleString('pt-BR')}`);
    console.log(`   Prazo desejado: ${data.prazo} meses`);
    
    if (!this.isLoggedIn) {
      await this.login();
    }

    // Navegar para página de planos de motos
    console.log('📋 Acessando lista de planos (MOTOS)...');
    await this.navigateToPlansListForMotos();

    // Extrair dados
    console.log('🔍 Buscando plano correspondente durante extração...');
    let extractionResult = null;
    let bestPlan = null;
    
    try {
      extractionResult = await this.scrapeAndSaveGridData(data.valor, data.prazo, true, 'motos');
    } catch (error) {
      console.warn('⚠️  Erro durante extração otimizada, tentando método tradicional...', error.message);
      extractionResult = null;
    }
    
    // ... (resto similar ao generateCarQuotation)
    
  } catch (error) {
    console.error('❌ Erro ao gerar cotação de moto:', error.message);
    throw error;
  }
}
```

### Passo 2: Adicionar Suporte no Pre-Scraped Data Service

No arquivo `src/services/pre-scraped-data.service.js`, adicione:

```javascript
/**
 * Carrega o arquivo JSON mais recente para motos
 */
loadLatestMotorcycleData() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    
    if (!fs.existsSync(dataDir)) {
      console.warn('⚠️  Pasta data/ não encontrada');
      return null;
    }

    const files = fs.readdirSync(dataDir)
      .filter(f => f.startsWith('table-data-motos-all-pages-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.warn('⚠️  Nenhum arquivo de dados de motos encontrado');
      return null;
    }

    const latestFile = path.join(dataDir, files[0]);
    const fileContent = fs.readFileSync(latestFile, 'utf-8');
    const scrapedData = JSON.parse(fileContent);
    
    console.log(`✅ Dados de motos carregados: ${files[0]} (${scrapedData.totalRows || 0} registros)`);
    return scrapedData;
  } catch (error) {
    console.error('❌ Erro ao carregar dados de motos:', error.message);
    return null;
  }
}

/**
 * Gera cotação de consórcio de moto usando dados previamente extraídos
 */
async generateMotorcycleQuotation(data) {
  // Similar ao generateCarQuotation, mas usando loadLatestMotorcycleData()
}
```

### Passo 3: Atualizar Classificação

No arquivo `src/services/ai.service.js`, a classificação já está configurada para tratar motos como `OUTROS`. Se quiser automatizar, mude para:

```javascript
- CARRO: Consórcio de automóvel, veículo, carro
- MOTO: Consórcio de moto, motocicleta
- IMOVEL: Consórcio de imóvel, casa, apartamento, terreno
- OUTROS: Consultoria, outras dúvidas
```

### Passo 4: Atualizar Orchestrator

No arquivo `src/services/orchestrator.service.js`, adicione suporte para `MOTO`:

```javascript
if (consortiumType === 'CARRO') {
  quotationData = await preScrapedDataService.generateCarQuotation(data);
} else if (consortiumType === 'MOTO') {
  quotationData = await preScrapedDataService.generateMotorcycleQuotation(data);
} else if (consortiumType === 'IMOVEL') {
  quotationData = await preScrapedDataService.generatePropertyQuotation(data);
}
```

## 📝 Processo de Geração de Dados

### Opção 1: Usando Scraping Automático (Recomendado)

1. **Configure o modo scraping:**
   ```bash
   # No arquivo .env
   QUOTATION_MODE=scraping
   ```

2. **Execute o scraping para motos:**
   ```bash
   # Você precisará criar um script de teste similar ao test-rpa.js
   # Ou adicionar um comando no package.json:
   npm run scrape:motos
   ```

3. **O arquivo será salvo em:**
   ```
   data/table-data-motos-all-pages-YYYY-MM-DDTHH-MM-SS-sssZ.json
   ```

4. **Volte para modo pre-scraped:**
   ```bash
   # No arquivo .env
   QUOTATION_MODE=pre-scraped
   ```

### Opção 2: Scraping Manual via RPA

1. Execute o sistema em modo scraping
2. Faça uma solicitação de cotação de moto
3. O sistema irá:
   - Acessar o portal Canopus
   - Navegar para planos de motos
   - Extrair todos os dados
   - Salvar em `data/`

### Opção 3: Importar Dados Manualmente

Se você já tem os dados em outro formato:

1. Converta para o formato JSON esperado:
   ```json
   {
     "extractedAt": "2026-01-20T12:00:00.000Z",
     "totalPages": 10,
     "headers": ["NOME DO BEM", "VALOR", "PRAZO", "1ª PARCELA", "PLANO", "TIPO DE VENDA", ""],
     "totalRows": 100,
     "earlyTermination": false,
     "bestMatch": null,
     "rows": [
       {
         "NOME DO BEM": "MT0123 - MOTO R$ 15.000,00",
         "VALOR": "R$ 15.000,00",
         "PRAZO": "60",
         "1ª PARCELA": "R$ 300,00",
         "PLANO": "21 - PLANO EXCLUSIVO 70%",
         "TIPO DE VENDA": "62 - PARCELA GRADUAL",
         "coluna_7": ""
       }
       // ... mais linhas
     ]
   }
   ```

2. Salve o arquivo como:
   ```
   data/table-data-motos-all-pages-YYYY-MM-DDTHH-MM-SS-sssZ.json
   ```

## ⚠️ Importante

- **Seletores CSS**: Os seletores no código são exemplos. Você precisa ajustá-los conforme o site real do Canopus.
- **Estrutura do Site**: Verifique se a estrutura da página de motos é similar à de automóveis.
- **Teste Primeiro**: Sempre teste o scraping em modo não-headless (`headless: false`) para ver o que está acontecendo.
- **Screenshots**: O sistema salva screenshots em `screenshots/` para debug.

## 🔍 Verificando se Funcionou

Após gerar os dados:

1. Verifique se o arquivo foi criado:
   ```bash
   ls -la data/table-data-motos-all-pages-*.json
   ```

2. Verifique o conteúdo:
   ```bash
   cat data/table-data-motos-all-pages-*.json | head -20
   ```

3. Teste uma cotação:
   - Configure `QUOTATION_MODE=pre-scraped`
   - Solicite uma cotação de moto
   - O sistema deve usar os dados pre-scraped

## 📞 Suporte

Se precisar de ajuda:
- Verifique os logs do sistema
- Revise os screenshots em `screenshots/`
- Ajuste os seletores CSS conforme necessário
- Teste com `headless: false` para debug visual
