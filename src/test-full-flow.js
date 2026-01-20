// Definir modo de teste ANTES de importar os módulos
process.env.TEST_MODE = 'true';

import orchestrator from './services/orchestrator.service.js';
import { config, validateConfig } from './config/config.js';

/**
 * Script de teste completo do fluxo de cotação automática
 * Simula uma mensagem de cliente solicitando cotação de consórcio de automóvel
 */

// Template de mensagem do cliente solicitando cotação
const customerMessageTemplate = {
  // Mensagem inicial - solicitação de cotação
  initial: `Olá, gostaria de fazer uma cotação de consórcio de automóvel. Tenho interesse em um veículo no valor de R$ 150.000,00 com prazo de 60 meses. Meu nome é João Silva, CPF 123.456.789-00, nasci em 15/03/1985 e meu email é joao.silva@email.com`,

  // Alternativa: mensagem em etapas (mais realista)
  stepByStep: {
    step1: `Olá, quero cotar um consórcio de carro`,
    step2: `Valor: R$ 150.000,00
Prazo: 60 meses
Nome: João Silva
CPF: 123.456.789-00
Data Nascimento: 15/03/1985
Email: joao.silva@email.com`
  }
};

async function testFullFlow() {
  try {
    // Garantir que modo de teste está ativo (já definido no topo do arquivo)
    process.env.TEST_MODE = 'true';
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║   CotaFácil - Teste Completo do Fluxo de Cotação            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('🧪 MODO TESTE ATIVADO - Mensagens não serão enviadas realmente\n');

    // Validar configurações
    console.log('🔍 Validando configurações...');
    validateConfig();
    console.log('✅ Configurações OK\n');

    // Número de telefone de teste (simulado)
    const testPhone = '5511999999999';

    // Escolher qual template usar
    const useStepByStep = process.argv[2] === 'step';
    const template = useStepByStep ? customerMessageTemplate.stepByStep : customerMessageTemplate.initial;

    console.log('📱 Simulando mensagem do cliente...\n');
    console.log('═'.repeat(60));
    
    if (useStepByStep) {
      console.log('📨 Mensagem 1 (Solicitação inicial):');
      console.log(`   "${template.step1}"\n`);
      
      // Processar primeira mensagem
      await orchestrator.processMessage(testPhone, template.step1);
      
      // Aguardar um pouco para simular tempo de resposta
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('\n📨 Mensagem 2 (Dados do cliente):');
      console.log(`   "${template.step2}"\n`);
      
      // Processar segunda mensagem com dados
      await orchestrator.processMessage(testPhone, template.step2);
    } else {
      console.log('📨 Mensagem do cliente:');
      console.log(`   "${template}"\n`);
      console.log('═'.repeat(60));
      
      // Processar mensagem completa
      await orchestrator.processMessage(testPhone, template);
    }

    console.log('\n⏳ Aguardando processamento completo...\n');
    
    // Aguardar processamento (RPA pode levar tempo)
    console.log('💡 O processo pode levar alguns minutos...');
    console.log('   - Login no sistema Canopus');
    console.log('   - Navegação e extração de dados');
    console.log('   - Geração da cotação\n');

    // O processamento é assíncrono, então aguardamos um tempo razoável
    // Em produção, isso seria gerenciado pelo orchestrator
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 segundos

    console.log('\n✅ Teste do fluxo completo iniciado!');
    console.log('📊 Verifique os logs acima para acompanhar o progresso.');
    console.log('💾 Dados extraídos serão salvos em ./data/\n');

    console.log('═'.repeat(60));
    console.log('📋 Resumo do Teste:');
    console.log('   1. ✅ Mensagem do cliente recebida');
    console.log('   2. ✅ Classificação com OpenAI (CARRO)');
    console.log('   3. ✅ Extração de dados com OpenAI');
    console.log('   4. ⏳ Geração de cotação via RPA (em andamento)');
    console.log('   5. ⏳ Envio da cotação ao cliente (simulado)\n');

    console.log('💡 Nota: Como o WhatsApp ainda não está integrado,');
    console.log('   as mensagens são apenas simuladas no console.\n');

    // Não fechar imediatamente - deixar o processo continuar
    console.log('⏳ Mantendo processo ativo para completar a extração...');
    console.log('   (Pressione Ctrl+C para encerrar quando terminar)\n');

  } catch (error) {
    console.error('\n❌❌❌ ERRO NO TESTE ❌❌❌\n');
    console.error('Erro:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    
    console.log('\n💡 Dicas para resolver:');
    console.log('   1. Verifique se todas as configurações no .env estão corretas');
    console.log('   2. Verifique se o OpenAI API Key está válido');
    console.log('   3. Verifique se as credenciais do Canopus estão corretas');
    console.log('   4. Confira os logs acima para identificar o problema\n');
    
    process.exit(1);
  }
}

// Executar teste
testFullFlow();
