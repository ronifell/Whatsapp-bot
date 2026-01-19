import canopusRPA from './services/canopus-rpa.service.js';
import { config, validateConfig } from './config/config.js';

/**
 * Script de teste do RPA para o portal Canopus
 * Este script testa o login e geração de cotação
 */

async function testRPA() {
  try {
    console.log('\n🧪 Iniciando teste do RPA Canopus...\n');

    // Validar configurações
    console.log('🔍 Validando configurações...');
    validateConfig();
    console.log('✅ Configurações OK\n');

    console.log('📋 Dados de teste:');
    console.log(`   URL: ${config.canopus.url}`);
    console.log(`   Usuário: ${config.canopus.username}`);
    console.log(`   Senha: ${'*'.repeat(config.canopus.password.length)}\n`);

    // Dados de teste para cotação de automóvel
    const testCarData = {
      valor: 50000,
      prazo: 60,
      nome: 'João Silva Teste',
      cpf: '12345678900',
      dataNascimento: '01/01/1990',
      email: 'teste@email.com'
    };

    // Dados de teste para cotação de imóvel
    const testPropertyData = {
      valor: 300000,
      prazo: 120,
      nome: 'Maria Silva Teste',
      cpf: '98765432100',
      dataNascimento: '15/05/1985',
      email: 'maria@email.com'
    };

    console.log('🚀 Inicializando navegador...');
    await canopusRPA.initBrowser(false); // false = visível (para debug)
    console.log('✅ Navegador iniciado\n');

    console.log('🔐 Fazendo login no Canopus...');
    await canopusRPA.login();
    console.log('✅ Login realizado com sucesso!\n');

    // Escolha qual tipo testar
    const choice = process.argv[2] || 'car';

    if (choice === 'car' || choice === 'both') {
      console.log('🚗 Testando cotação de AUTOMÓVEL...');
      console.log('📋 Dados:', JSON.stringify(testCarData, null, 2));
      
      const carQuotation = await canopusRPA.generateCarQuotation(testCarData);
      
      console.log('\n✅ Cotação de AUTOMÓVEL gerada:');
      console.log(JSON.stringify(carQuotation, null, 2));
      console.log('\n');
    }

    if (choice === 'property' || choice === 'both') {
      console.log('🏠 Testando cotação de IMÓVEL...');
      console.log('📋 Dados:', JSON.stringify(testPropertyData, null, 2));
      
      const propertyQuotation = await canopusRPA.generatePropertyQuotation(testPropertyData);
      
      console.log('\n✅ Cotação de IMÓVEL gerada:');
      console.log(JSON.stringify(propertyQuotation, null, 2));
      console.log('\n');
    }

    console.log('🔒 Fechando navegador...');
    await canopusRPA.close();
    console.log('✅ Navegador fechado\n');

    console.log('✅ Teste concluído com sucesso!');
    console.log('\n📸 Screenshots salvos em: ./screenshots/\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message);
    console.error(error.stack);
    
    console.log('\n🔒 Fechando navegador...');
    await canopusRPA.close();
    
    console.log('\n💡 Dicas para resolver:');
    console.log('   1. Verifique se as credenciais do Canopus estão corretas no .env');
    console.log('   2. Verifique se a URL do Canopus está correta');
    console.log('   3. Os seletores no código precisam ser ajustados para o site real');
    console.log('   4. Confira os screenshots salvos em ./screenshots/\n');
    
    process.exit(1);
  }
}

console.log('╔══════════════════════════════════════════════════╗');
console.log('║   CotaFácil - Teste RPA Canopus                 ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('\nUso:');
console.log('  npm run test:rpa           # Testa cotação de carro');
console.log('  npm run test:rpa car       # Testa cotação de carro');
console.log('  npm run test:rpa property  # Testa cotação de imóvel');
console.log('  npm run test:rpa both      # Testa ambos\n');

testRPA();
