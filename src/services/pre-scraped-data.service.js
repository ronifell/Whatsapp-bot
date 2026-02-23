import fs from 'fs';
import path from 'path';

/**
 * Serviço para buscar cotações a partir de dados previamente extraídos
 * (armazenados em arquivos JSON na pasta data/)
 */
class PreScrapedDataService {
  
  /**
   * Encontra combinações de planos que somam aproximadamente o valor solicitado
   * Usa algoritmo otimizado para evitar problemas de memória
   * @param {Array} validPlans - Array de planos válidos
   * @param {number} targetValue - Valor alvo
   * @param {number} maxCombinations - Número máximo de combinações a retornar
   * @returns {Array} - Array de combinações (cada combinação é um array de planos)
   */
  findQuoteCombinations(validPlans, targetValue, maxCombinations = 3) {
    console.log(`🔍 Buscando combinações de ${validPlans.length} planos para valor alvo: R$ ${targetValue.toLocaleString('pt-BR')}`);
    
    // STEP 1: Filtrar e ordenar planos de forma inteligente
    // Remover planos muito pequenos ou muito grandes
    const minPlanValue = targetValue * 0.1; // Pelo menos 10% do alvo
    const maxPlanValue = targetValue * 0.6; // No máximo 60% do alvo (para permitir pelo menos 2 planos)
    const maxQuotesPerCombination = 5;
    
    const filteredPlans = validPlans
      .filter(p => p.valor >= minPlanValue && p.valor <= maxPlanValue)
      .sort((a, b) => b.valor - a.valor); // Ordenar do maior para o menor
    
    // Limitar a 50 planos mais relevantes para evitar explosão combinatória
    const topPlans = filteredPlans.slice(0, 50);
    
    console.log(`📊 ${topPlans.length} planos filtrados (de ${validPlans.length} disponíveis)`);
    
    if (topPlans.length < 2) {
      console.log(`⚠️ Não há planos suficientes para formar combinações`);
      return [];
    }
    
    const combinations = [];
    const maxSearchDepth = Math.min(maxQuotesPerCombination, Math.ceil(targetValue / Math.min(...topPlans.map(p => p.valor))));
    
    // STEP 2: Usar abordagem iterativa limitada em vez de recursão completa
    // Tentar combinações de 2, 3, 4, 5 planos
    for (let comboSize = 2; comboSize <= maxSearchDepth && comboSize <= maxQuotesPerCombination; comboSize++) {
      if (combinations.length >= maxCombinations * 2) break;
      
      // Usar abordagem de "sliding window" para combinações pequenas
      if (comboSize === 2) {
        // Para 2 planos, testar todas as combinações possíveis (limitado)
        for (let i = 0; i < Math.min(topPlans.length, 30); i++) {
          for (let j = i + 1; j < Math.min(topPlans.length, 30); j++) {
            const sum = topPlans[i].valor + topPlans[j].valor;
            if (sum <= targetValue * 1.2 && sum >= targetValue * 0.8) {
              const difference = Math.abs(sum - targetValue);
              combinations.push({
                quotes: [topPlans[i], topPlans[j]],
                totalValue: sum,
                difference: difference
              });
              if (combinations.length >= maxCombinations * 3) break;
            }
          }
          if (combinations.length >= maxCombinations * 3) break;
        }
      } else {
        // Para 3+ planos, usar busca limitada e inteligente
        const generateLimited = (current, startIdx, currentSum, remaining) => {
          if (remaining === 0) {
            if (currentSum <= targetValue * 1.2 && currentSum >= targetValue * 0.8) {
              const difference = Math.abs(currentSum - targetValue);
              combinations.push({
                quotes: [...current],
                totalValue: currentSum,
                difference: difference
              });
            }
            return;
          }
          
          // Limitar busca a apenas as primeiras 20 planos para evitar explosão
          const searchLimit = Math.min(startIdx + 20, topPlans.length);
          for (let i = startIdx; i < searchLimit && combinations.length < maxCombinations * 3; i++) {
            const newSum = currentSum + topPlans[i].valor;
            if (newSum <= targetValue * 1.3) {
              current.push(topPlans[i]);
              generateLimited(current, i + 1, newSum, remaining - 1);
              current.pop();
            }
          }
        };
        
        generateLimited([], 0, 0, comboSize);
      }
    }
    
    console.log(`✅ ${combinations.length} combinações candidatas encontradas`);
    
    // STEP 3: Ordenar por menor diferença e retornar as melhores
    combinations.sort((a, b) => a.difference - b.difference);
    
    // Retornar apenas combinações únicas (evitar duplicatas)
    const uniqueCombinations = [];
    const seen = new Set();
    
    for (const combo of combinations) {
      const key = combo.quotes.map(q => q.rawData['NOME DO BEM'] || '').sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCombinations.push(combo);
        if (uniqueCombinations.length >= maxCombinations) {
          break;
        }
      }
    }
    
    console.log(`✅ ${uniqueCombinations.length} combinações únicas selecionadas`);
    
    return uniqueCombinations.map(combo => ({
      quotes: combo.quotes.map(q => q.rawData),
      totalValue: combo.totalValue,
      difference: combo.difference
    }));
  }

  /**
   * Encontra os melhores planos baseado nos dados do cliente
   * Retorna múltiplos planos se houver matches exatos, ou 1 principal + 2-3 similares
   * Se o valor solicitado > 1.5x o maior valor disponível, retorna combinações
   */
  findBestMatchingPlan(scrapedData, customerValue, customerTerm) {
    try {
      if (!scrapedData || !scrapedData.rows || scrapedData.rows.length === 0) {
        return null;
      }

      // Converter valor do cliente para número (remover formatação)
      const cleanCustomerValue = parseFloat(
        customerValue.toString().replace(/[^\d,]/g, '').replace(',', '.')
      );

      // STEP 1: Find all plans and calculate budget differences
      const validPlans = [];

      for (const row of scrapedData.rows) {
        try {
          // Extrair valor do plano (tentar diferentes formatos de chave)
          const planValueText = row['VALOR'] || row['Valor'] || row['valor'] || '';
          const planValue = parseFloat(
            planValueText.toString().replace(/[^\d,]/g, '').replace(',', '.')
          );

          if (isNaN(planValue) || planValue === 0) continue;

          // Extrair prazo do plano
          const planTermText = row['PRAZO'] || row['Prazo'] || row['prazo'] || '';
          const planTerm = parseInt(planTermText.toString().replace(/\D/g, ''));

          if (isNaN(planTerm) || planTerm === 0) continue;

          // Extrair primeira parcela
          const firstPaymentText = row['1ª PARCELA'] || row['1ª parcela'] || row['primeira_parcela'] || '';
          const firstPayment = parseFloat(
            firstPaymentText.toString().replace(/[^\d,]/g, '').replace(',', '.')
          );

          // Calcular diferença de valor (budget)
          const valueDifference = Math.abs(planValue - cleanCustomerValue);
          const termDifference = Math.abs(planTerm - customerTerm);

          validPlans.push({
            nomeBem: row['NOME DO BEM'] || row['Nome do bem'] || row['nome_bem'] || '',
            valor: planValue,
            prazo: planTerm,
            primeiraParcela: firstPayment || 0,
            plano: row['PLANO'] || row['Plano'] || row['plano'] || '',
            tipoVenda: row['TIPO DE VENDA'] || row['Tipo de Venda'] || row['tipo_venda'] || '',
            rawData: row,
            valueDifference: valueDifference,
            termDifference: termDifference,
            totalDifference: valueDifference + termDifference * 1000, // Weight term difference less
            isExactMatch: valueDifference === 0 && termDifference === 0
          });
        } catch (e) {
          // Continuar se houver erro ao processar uma linha
          continue;
        }
      }

      if (validPlans.length === 0) {
        return null;
      }

      // STEP 1.5: Verificar se o valor solicitado é > 1.5x o maior valor disponível
      const maxAvailableValue = Math.max(...validPlans.map(p => p.valor));
      const threshold = maxAvailableValue * 1.5;
      
      if (cleanCustomerValue > threshold) {
        console.log(`📊 Valor solicitado (R$ ${cleanCustomerValue.toLocaleString('pt-BR')}) é ${(cleanCustomerValue / maxAvailableValue).toFixed(2)}x o maior valor disponível (R$ ${maxAvailableValue.toLocaleString('pt-BR')})`);
        console.log(`🔍 Buscando combinações de planos para atingir o valor solicitado...`);
        
        // Filtrar planos com prazo similar (diferença de até 12 meses)
        const plansWithSimilarTerm = validPlans.filter(p => p.termDifference <= 12);
        
        if (plansWithSimilarTerm.length === 0) {
          console.log(`⚠️ Nenhum plano com prazo similar encontrado, usando todos os planos`);
          // Se não houver planos com prazo similar, usar todos
          const combinations = this.findQuoteCombinations(validPlans, cleanCustomerValue, 3);
          
          if (combinations.length > 0) {
            console.log(`✅ ${combinations.length} combinação(ões) encontrada(s)`);
            // Retornar estrutura especial para combinações
            return {
              isCombination: true,
              combinations: combinations
            };
          }
        } else {
          const combinations = this.findQuoteCombinations(plansWithSimilarTerm, cleanCustomerValue, 3);
          
          if (combinations.length > 0) {
            console.log(`✅ ${combinations.length} combinação(ões) encontrada(s) com prazo similar`);
            // Retornar estrutura especial para combinações
            return {
              isCombination: true,
              combinations: combinations
            };
          }
        }
        
        // Se não encontrou combinações, continuar com lógica normal
        console.log(`⚠️ Não foi possível encontrar combinações adequadas, usando lógica padrão`);
      }

      // STEP 2: Find the smallest budget difference
      const smallestBudgetDifference = Math.min(...validPlans.map(p => p.valueDifference));

      // STEP 3: Filter plans with the smallest budget difference
      const plansWithBestBudget = validPlans.filter(p => p.valueDifference === smallestBudgetDifference);

      // STEP 4: Among plans with best budget, find those with best term
      const smallestTermDifference = Math.min(...plansWithBestBudget.map(p => p.termDifference));
      const plansWithBestBudgetAndTerm = plansWithBestBudget.filter(p => p.termDifference === smallestTermDifference);

      // STEP 5: If multiple plans with same value and term, return all
      if (plansWithBestBudgetAndTerm.length > 1) {
        const matchingPlans = plansWithBestBudgetAndTerm.map(p => p.rawData);
        console.log(`✅ ${matchingPlans.length} planos com mesmo VALOR e PRAZO encontrados - retornando todos`);
        return matchingPlans;
      }

      // STEP 6: If only one plan with best value and term, find 2-3 similar ones
      const bestPlan = plansWithBestBudgetAndTerm[0];
      const bestPlanValue = bestPlan.valor;
      const bestPlanTerm = bestPlan.prazo;

      // Buscar planos similares (mesmo valor ou mesmo prazo ou valor muito próximo)
      const similarPlans = validPlans
        .filter(p => {
          // Excluir o melhor plano já encontrado
          if (p.valor === bestPlanValue && p.prazo === bestPlanTerm) return false;
          
          // Incluir se: mesmo valor (independente do prazo) OU mesmo prazo (independente do valor) OU valor muito próximo
          return (p.valueDifference === 0) || 
                 (p.termDifference === 0) || 
                 (p.valueDifference <= bestPlanValue * 0.1); // Até 10% de diferença no valor
        })
        .sort((a, b) => {
          // Ordenar por: primeiro valor igual, depois prazo igual, depois menor diferença total
          if (a.valueDifference === 0 && b.valueDifference !== 0) return -1;
          if (a.valueDifference !== 0 && b.valueDifference === 0) return 1;
          if (a.termDifference === 0 && b.termDifference !== 0) return -1;
          if (a.termDifference !== 0 && b.termDifference === 0) return 1;
          return a.totalDifference - b.totalDifference;
        })
        .slice(0, 3) // Pegar até 3 planos similares
        .map(p => p.rawData);

      const allPlans = [bestPlan.rawData, ...similarPlans];
      console.log(`✅ 1 plano principal + ${similarPlans.length} similares encontrados - retornando ${allPlans.length} planos`);
      
      return allPlans;
    } catch (error) {
      console.error('❌ Erro ao encontrar melhor plano:', error.message);
      return null;
    }
  }

  /**
   * Calcula parcela mensal estimada (fallback)
   */
  calculateEstimatedPayment(value, months) {
    // Estimativa simples: valor / prazo + taxa de administração
    const adminFee = 0.15; // 15% para carros, 18% para imóveis (será ajustado)
    return (value / months) * (1 + adminFee);
  }

  /**
   * Carrega o arquivo JSON mais recente para automóveis
   */
  loadLatestCarData() {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      
      if (!fs.existsSync(dataDir)) {
        console.warn('⚠️  Pasta data/ não encontrada');
        return null;
      }

      const files = fs.readdirSync(dataDir)
        .filter(f => f.startsWith('table-data-automoveis-all-pages-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length === 0) {
        console.warn('⚠️  Nenhum arquivo de dados de automóveis encontrado');
        return null;
      }

      const latestFile = path.join(dataDir, files[0]);
      const fileContent = fs.readFileSync(latestFile, 'utf-8');
      const scrapedData = JSON.parse(fileContent);
      
      console.log(`✅ Dados de automóveis carregados: ${files[0]} (${scrapedData.totalRows || 0} registros)`);
      return scrapedData;
    } catch (error) {
      console.error('❌ Erro ao carregar dados de automóveis:', error.message);
      return null;
    }
  }

  /**
   * Carrega o arquivo JSON mais recente para imóveis
   */
  loadLatestPropertyData() {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      
      if (!fs.existsSync(dataDir)) {
        console.warn('⚠️  Pasta data/ não encontrada');
        return null;
      }

      const files = fs.readdirSync(dataDir)
        .filter(f => f.startsWith('table-data-imoveis-all-pages-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length === 0) {
        console.warn('⚠️  Nenhum arquivo de dados de imóveis encontrado');
        return null;
      }

      const latestFile = path.join(dataDir, files[0]);
      const fileContent = fs.readFileSync(latestFile, 'utf-8');
      const scrapedData = JSON.parse(fileContent);
      
      console.log(`✅ Dados de imóveis carregados: ${files[0]} (${scrapedData.totalRows || 0} registros)`);
      return scrapedData;
    } catch (error) {
      console.error('❌ Erro ao carregar dados de imóveis:', error.message);
      return null;
    }
  }

  /**
   * Gera cotação de consórcio de automóvel usando dados previamente extraídos
   */
  async generateCarQuotation(data) {
    try {
      console.log('🚗 Gerando cotação de automóvel (modo pre-scraped)...');
      console.log(`   Cliente: ${data.nome}`);
      console.log(`   Valor desejado: R$ ${data.valor.toLocaleString('pt-BR')}`);
      console.log(`   Prazo desejado: ${data.prazo} meses`);

      // Carregar dados previamente extraídos
      const scrapedData = this.loadLatestCarData();
      
      if (!scrapedData) {
        throw new Error('Dados de automóveis não encontrados. Execute o scraping primeiro ou verifique a pasta data/.');
      }

      // Buscar os melhores planos disponíveis
      let matchingPlans = this.findBestMatchingPlan(scrapedData, data.valor, data.prazo);
      let isCombination = false;
      
      if (!matchingPlans || (Array.isArray(matchingPlans) && matchingPlans.length === 0)) {
        throw new Error('Não foi possível encontrar nenhum plano disponível nos dados.');
      }

      // Verificar se é uma combinação
      if (matchingPlans.isCombination && matchingPlans.combinations) {
        isCombination = true;
        console.log(`✅ ${matchingPlans.combinations.length} combinação(ões) encontrada(s):`);
        matchingPlans.combinations.forEach((combo, comboIndex) => {
          console.log(`   Combinação ${comboIndex + 1} (Total: R$ ${combo.totalValue.toLocaleString('pt-BR')}):`);
          combo.quotes.forEach((quote, quoteIndex) => {
            console.log(`     Plano ${quoteIndex + 1}:`);
            console.log(`       NOME DO BEM: ${quote['NOME DO BEM'] || 'N/A'}`);
            console.log(`       VALOR: ${quote['VALOR'] || 'N/A'}`);
            console.log(`       PRAZO: ${quote['PRAZO'] || 'N/A'}`);
            console.log(`       1ª PARCELA: ${quote['1ª PARCELA'] || 'N/A'}`);
          });
        });
      } else {
        // Garantir que seja um array
        if (!Array.isArray(matchingPlans)) {
          matchingPlans = [matchingPlans];
        }

        // Verificar se é match exato (primeira cotação)
        const firstPlan = matchingPlans[0];
        const planValue = parseFloat((firstPlan['VALOR'] || '').replace(/[^\d,]/g, '').replace(',', '.'));
        const planTerm = parseInt((firstPlan['PRAZO'] || '').replace(/\D/g, ''));
        const isExactMatch = planValue && planTerm && 
          (Math.abs(planValue - data.valor) < 0.01) && 
          (planTerm === data.prazo);

        console.log(`✅ ${matchingPlans.length} plano(s) encontrado(s):`);
        matchingPlans.forEach((plan, index) => {
          console.log(`   Plano ${index + 1}:`);
          console.log(`     NOME DO BEM: ${plan['NOME DO BEM'] || 'N/A'}`);
          console.log(`     VALOR: ${plan['VALOR'] || 'N/A'}`);
          console.log(`     PRAZO: ${plan['PRAZO'] || 'N/A'}`);
          console.log(`     1ª PARCELA: ${plan['1ª PARCELA'] || 'N/A'}`);
          console.log(`     PLANO: ${plan['PLANO'] || 'N/A'}`);
          console.log(`     TIPO DE VENDA: ${plan['TIPO DE VENDA'] || 'N/A'}`);
        });
      }

      // Preparar dados da cotação usando array de objetos row completos ou combinações
      const quotationData = {
        type: 'Consórcio de Automóvel',
        rawData: isCombination ? matchingPlans : matchingPlans, // Pode ser array ou objeto com combinações
        isCombination: isCombination,
        isExactMatch: isCombination ? false : (() => {
          const firstPlan = Array.isArray(matchingPlans) ? matchingPlans[0] : matchingPlans;
          const planValue = parseFloat((firstPlan['VALOR'] || '').replace(/[^\d,]/g, '').replace(',', '.'));
          const planTerm = parseInt((firstPlan['PRAZO'] || '').replace(/\D/g, ''));
          return planValue && planTerm && 
            (Math.abs(planValue - data.valor) < 0.01) && 
            (planTerm === data.prazo);
        })(),
        requestedValue: data.valor,
        requestedTerm: data.prazo,
        timestamp: new Date().toISOString(),
        source: 'pre-scraped',
        customerData: {
          nome: data.nome,
          cpf: data.cpf,
          email: data.email,
          dataNascimento: data.dataNascimento
        }
      };
      
      console.log('✅ Cotação de automóvel gerada com sucesso (pre-scraped)!');
      return quotationData;

    } catch (error) {
      console.error('❌ Erro ao gerar cotação de automóvel (pre-scraped):', error.message);
      throw error;
    }
  }

  /**
   * Gera cotação de consórcio de imóvel usando dados previamente extraídos
   */
  async generatePropertyQuotation(data) {
    try {
      console.log('🏠 Gerando cotação de imóvel (modo pre-scraped)...');
      console.log(`   Cliente: ${data.nome}`);
      console.log(`   Valor desejado: R$ ${data.valor.toLocaleString('pt-BR')}`);
      console.log(`   Prazo desejado: ${data.prazo} meses`);

      // Carregar dados previamente extraídos
      const scrapedData = this.loadLatestPropertyData();
      
      if (!scrapedData) {
        throw new Error('Dados de imóveis não encontrados. Execute o scraping primeiro ou verifique a pasta data/.');
      }

      // Buscar os melhores planos disponíveis
      let matchingPlans = this.findBestMatchingPlan(scrapedData, data.valor, data.prazo);
      let isCombination = false;
      
      if (!matchingPlans || (Array.isArray(matchingPlans) && matchingPlans.length === 0)) {
        throw new Error('Não foi possível encontrar nenhum plano disponível nos dados.');
      }

      // Verificar se é uma combinação
      if (matchingPlans.isCombination && matchingPlans.combinations) {
        isCombination = true;
        console.log(`✅ ${matchingPlans.combinations.length} combinação(ões) encontrada(s):`);
        matchingPlans.combinations.forEach((combo, comboIndex) => {
          console.log(`   Combinação ${comboIndex + 1} (Total: R$ ${combo.totalValue.toLocaleString('pt-BR')}):`);
          combo.quotes.forEach((quote, quoteIndex) => {
            console.log(`     Plano ${quoteIndex + 1}:`);
            console.log(`       NOME DO BEM: ${quote['NOME DO BEM'] || 'N/A'}`);
            console.log(`       VALOR: ${quote['VALOR'] || 'N/A'}`);
            console.log(`       PRAZO: ${quote['PRAZO'] || 'N/A'}`);
            console.log(`       1ª PARCELA: ${quote['1ª PARCELA'] || 'N/A'}`);
          });
        });
      } else {
        // Garantir que seja um array
        if (!Array.isArray(matchingPlans)) {
          matchingPlans = [matchingPlans];
        }

        // Verificar se é match exato (primeira cotação)
        const firstPlan = matchingPlans[0];
        const planValue = parseFloat((firstPlan['VALOR'] || '').replace(/[^\d,]/g, '').replace(',', '.'));
        const planTerm = parseInt((firstPlan['PRAZO'] || '').replace(/\D/g, ''));
        const isExactMatch = planValue && planTerm && 
          (Math.abs(planValue - data.valor) < 0.01) && 
          (planTerm === data.prazo);

        console.log(`✅ ${matchingPlans.length} plano(s) encontrado(s):`);
        matchingPlans.forEach((plan, index) => {
          console.log(`   Plano ${index + 1}:`);
          console.log(`     NOME DO BEM: ${plan['NOME DO BEM'] || 'N/A'}`);
          console.log(`     VALOR: ${plan['VALOR'] || 'N/A'}`);
          console.log(`     PRAZO: ${plan['PRAZO'] || 'N/A'}`);
          console.log(`     1ª PARCELA: ${plan['1ª PARCELA'] || 'N/A'}`);
          console.log(`     PLANO: ${plan['PLANO'] || 'N/A'}`);
          console.log(`     TIPO DE VENDA: ${plan['TIPO DE VENDA'] || 'N/A'}`);
        });
      }

      // Preparar dados da cotação usando array de objetos row completos ou combinações
      const quotationData = {
        type: 'Consórcio de Imóvel',
        rawData: isCombination ? matchingPlans : matchingPlans, // Pode ser array ou objeto com combinações
        isCombination: isCombination,
        isExactMatch: isCombination ? false : (() => {
          const firstPlan = Array.isArray(matchingPlans) ? matchingPlans[0] : matchingPlans;
          const planValue = parseFloat((firstPlan['VALOR'] || '').replace(/[^\d,]/g, '').replace(',', '.'));
          const planTerm = parseInt((firstPlan['PRAZO'] || '').replace(/\D/g, ''));
          return planValue && planTerm && 
            (Math.abs(planValue - data.valor) < 0.01) && 
            (planTerm === data.prazo);
        })(),
        requestedValue: data.valor,
        requestedTerm: data.prazo,
        timestamp: new Date().toISOString(),
        source: 'pre-scraped',
        customerData: {
          nome: data.nome,
          cpf: data.cpf,
          email: data.email,
          dataNascimento: data.dataNascimento
        }
      };
      
      console.log('✅ Cotação de imóvel gerada com sucesso (pre-scraped)!');
      return quotationData;

    } catch (error) {
      console.error('❌ Erro ao gerar cotação de imóvel (pre-scraped):', error.message);
      throw error;
    }
  }
}

export default new PreScrapedDataService();
