import fs from 'fs';
import path from 'path';

/**
 * Serviço para buscar cotações a partir de dados previamente extraídos
 * (armazenados em arquivos JSON na pasta data/)
 */
class PreScrapedDataService {
  
  /**
   * Encontra o melhor plano baseado nos dados do cliente
   * Sempre retorna o plano mais próximo disponível, mesmo que não seja exato
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

      // STEP 1: Find all plans and calculate budget differences (ignoring period)
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

          // Calcular diferença de valor (budget) - IGNORANDO o período
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

      // STEP 2: Find the smallest budget difference
      const smallestBudgetDifference = Math.min(...validPlans.map(p => p.valueDifference));

      // STEP 3: Filter plans with the smallest budget difference
      const plansWithBestBudget = validPlans.filter(p => p.valueDifference === smallestBudgetDifference);

      // STEP 4: If multiple plans have the same budget difference, find the one with most similar period
      let bestMatch;
      if (plansWithBestBudget.length === 1) {
        bestMatch = plansWithBestBudget[0];
      } else {
        // Among plans with same budget, find the one with smallest period difference
        const smallestPeriodDifference = Math.min(...plansWithBestBudget.map(p => p.termDifference));
        bestMatch = plansWithBestBudget.find(p => p.termDifference === smallestPeriodDifference);
      }

      // Adicionar informações sobre a qualidade do match
      if (bestMatch) {
        bestMatch.matchQuality = {
          valueDifference: bestMatch.valueDifference,
          termDifference: bestMatch.termDifference,
          isExactMatch: bestMatch.isExactMatch,
          requestedValue: cleanCustomerValue,
          requestedTerm: customerTerm
        };
        // Remove helper properties before returning
        delete bestMatch.valueDifference;
        delete bestMatch.termDifference;
        delete bestMatch.isExactMatch;
      }

      return bestMatch;
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

      // Sempre buscar o plano mais próximo disponível
      let bestPlan = this.findBestMatchingPlan(scrapedData, data.valor, data.prazo);
      
      if (!bestPlan) {
        throw new Error('Não foi possível encontrar nenhum plano disponível nos dados.');
      }

      console.log('✅ Plano encontrado:');
      console.log(`   Nome: ${bestPlan.nomeBem}`);
      console.log(`   Valor: R$ ${bestPlan.valor.toLocaleString('pt-BR')}`);
      console.log(`   Prazo: ${bestPlan.prazo} meses`);
      console.log(`   1ª Parcela: R$ ${bestPlan.primeiraParcela.toLocaleString('pt-BR')}`);

      // Verificar se é match exato
      const isExactMatch = bestPlan.matchQuality?.isExactMatch || false;
      const valueDiff = bestPlan.matchQuality?.valueDifference || 0;
      const termDiff = bestPlan.matchQuality?.termDifference || 0;
      const requestedValue = bestPlan.matchQuality?.requestedValue || data.valor;
      const requestedTerm = bestPlan.matchQuality?.requestedTerm || data.prazo;

      // Calcular parcela mensal estimada (se não disponível)
      const monthlyPayment = bestPlan.primeiraParcela || 
        this.calculateEstimatedPayment(bestPlan.valor, bestPlan.prazo);

      // Preparar mensagem de explicação se não for match exato
      let explanationMessage = '';
      if (!isExactMatch) {
        explanationMessage = '\n\n📌 *Observação:*\n';
        explanationMessage += 'Não encontramos um plano exatamente igual ao solicitado, mas selecionamos o plano mais próximo disponível:\n\n';
        
        if (valueDiff > 0) {
          const diffPercent = ((bestPlan.valor - requestedValue) / requestedValue * 100).toFixed(1);
          if (bestPlan.valor > requestedValue) {
            explanationMessage += `• Valor: R$ ${bestPlan.valor.toLocaleString('pt-BR')} (${diffPercent}% acima do solicitado de R$ ${requestedValue.toLocaleString('pt-BR')})\n`;
          } else {
            explanationMessage += `• Valor: R$ ${bestPlan.valor.toLocaleString('pt-BR')} (${Math.abs(diffPercent)}% abaixo do solicitado de R$ ${requestedValue.toLocaleString('pt-BR')})\n`;
          }
        }
        
        if (termDiff > 0) {
          if (bestPlan.prazo > requestedTerm) {
            explanationMessage += `• Prazo: ${bestPlan.prazo} meses (${termDiff} meses a mais que os ${requestedTerm} meses solicitados)\n`;
          } else {
            explanationMessage += `• Prazo: ${bestPlan.prazo} meses (${termDiff} meses a menos que os ${requestedTerm} meses solicitados)\n`;
          }
        }
        
        explanationMessage += '\nEste é o plano mais próximo disponível em nosso sistema.';
      }

      // Preparar dados da cotação
      const quotationData = {
        type: 'Consórcio de Automóvel',
        value: bestPlan.valor,
        months: bestPlan.prazo,
        monthlyPayment: monthlyPayment,
        adminFee: 15, // Taxa padrão
        details: `Plano: ${bestPlan.plano}\nTipo de Venda: ${bestPlan.tipoVenda}\nNome do Bem: ${bestPlan.nomeBem}${explanationMessage}`,
        timestamp: new Date().toISOString(),
        source: 'pre-scraped',
        isExactMatch: isExactMatch,
        customerData: {
          nome: data.nome,
          cpf: data.cpf,
          email: data.email,
          dataNascimento: data.dataNascimento
        },
        planDetails: {
          nomeBem: bestPlan.nomeBem,
          plano: bestPlan.plano,
          tipoVenda: bestPlan.tipoVenda
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

      // Sempre buscar o plano mais próximo disponível
      let bestPlan = this.findBestMatchingPlan(scrapedData, data.valor, data.prazo);
      
      if (!bestPlan) {
        throw new Error('Não foi possível encontrar nenhum plano disponível nos dados.');
      }

      console.log('✅ Plano encontrado:');
      console.log(`   Nome: ${bestPlan.nomeBem}`);
      console.log(`   Valor: R$ ${bestPlan.valor.toLocaleString('pt-BR')}`);
      console.log(`   Prazo: ${bestPlan.prazo} meses`);
      console.log(`   1ª Parcela: R$ ${bestPlan.primeiraParcela.toLocaleString('pt-BR')}`);

      // Verificar se é match exato
      const isExactMatch = bestPlan.matchQuality?.isExactMatch || false;
      const valueDiff = bestPlan.matchQuality?.valueDifference || 0;
      const termDiff = bestPlan.matchQuality?.termDifference || 0;
      const requestedValue = bestPlan.matchQuality?.requestedValue || data.valor;
      const requestedTerm = bestPlan.matchQuality?.requestedTerm || data.prazo;

      // Calcular parcela mensal estimada (se não disponível)
      const monthlyPayment = bestPlan.primeiraParcela || 
        this.calculateEstimatedPayment(bestPlan.valor, bestPlan.prazo);

      // Preparar mensagem de explicação se não for match exato
      let explanationMessage = '';
      if (!isExactMatch) {
        explanationMessage = '\n\n📌 *Observação:*\n';
        explanationMessage += 'Não encontramos um plano exatamente igual ao solicitado, mas selecionamos o plano mais próximo disponível:\n\n';
        
        if (valueDiff > 0) {
          const diffPercent = ((bestPlan.valor - requestedValue) / requestedValue * 100).toFixed(1);
          if (bestPlan.valor > requestedValue) {
            explanationMessage += `• Valor: R$ ${bestPlan.valor.toLocaleString('pt-BR')} (${diffPercent}% acima do solicitado de R$ ${requestedValue.toLocaleString('pt-BR')})\n`;
          } else {
            explanationMessage += `• Valor: R$ ${bestPlan.valor.toLocaleString('pt-BR')} (${Math.abs(diffPercent)}% abaixo do solicitado de R$ ${requestedValue.toLocaleString('pt-BR')})\n`;
          }
        }
        
        if (termDiff > 0) {
          if (bestPlan.prazo > requestedTerm) {
            explanationMessage += `• Prazo: ${bestPlan.prazo} meses (${termDiff} meses a mais que os ${requestedTerm} meses solicitados)\n`;
          } else {
            explanationMessage += `• Prazo: ${bestPlan.prazo} meses (${termDiff} meses a menos que os ${requestedTerm} meses solicitados)\n`;
          }
        }
        
        explanationMessage += '\nEste é o plano mais próximo disponível em nosso sistema.';
      }

      // Preparar dados da cotação
      const quotationData = {
        type: 'Consórcio de Imóvel',
        value: bestPlan.valor,
        months: bestPlan.prazo,
        monthlyPayment: monthlyPayment,
        adminFee: 18, // Taxa padrão para imóveis
        details: `Plano: ${bestPlan.plano}\nTipo de Venda: ${bestPlan.tipoVenda}\nNome do Bem: ${bestPlan.nomeBem}${explanationMessage}`,
        timestamp: new Date().toISOString(),
        source: 'pre-scraped',
        isExactMatch: isExactMatch,
        customerData: {
          nome: data.nome,
          cpf: data.cpf,
          email: data.email,
          dataNascimento: data.dataNascimento
        },
        planDetails: {
          nomeBem: bestPlan.nomeBem,
          plano: bestPlan.plano,
          tipoVenda: bestPlan.tipoVenda
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
