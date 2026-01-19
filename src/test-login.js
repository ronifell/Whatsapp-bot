import canopusRPA from './services/canopus-rpa.service.js';
import { config, validateConfig } from './config/config.js';

/**
 * Script de teste específico para verificar o login automático
 * Este script testa apenas o processo de login
 */

async function testLogin() {
  try {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║   CotaFácil - Teste de Login Automático          ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    // Validar configurações
    console.log('🔍 Validando configurações...');
    validateConfig();
    console.log('✅ Configurações OK\n');

    // Exibir informações (sem mostrar senha completa)
    console.log('📋 Configuração de Login:');
    console.log(`   URL: ${config.canopus.url}`);
    console.log(`   Usuário: ${config.canopus.username}`);
    console.log(`   Senha: ${'*'.repeat(Math.min(config.canopus.password.length, 10))}...`);
    console.log('');

    // Inicializar navegador em modo visível para debug
    console.log('🚀 Inicializando navegador (modo visível)...');
    await canopusRPA.initBrowser(false); // false = visível
    console.log('✅ Navegador iniciado\n');

    // Testar login
    console.log('🔐 Testando login automático...');
    console.log('   (Acompanhe o processo no navegador que será aberto)\n');
    
    const loginSuccess = await canopusRPA.login();
    
    if (loginSuccess) {
      console.log('\n✅✅✅ LOGIN AUTOMÁTICO FUNCIONANDO CORRETAMENTE! ✅✅✅\n');
      console.log('📸 Screenshots salvos em: ./screenshots/');
      console.log('   - 01-login-page.png: Página de login');
      console.log('   - 02-credentials-filled.png: Credenciais preenchidas');
      console.log('   - 03-after-login.png: Após o login\n');
      
      // Verificar se ainda está logado após alguns segundos
      console.log('⏳ Aguardando 5 segundos para verificar estabilidade da sessão...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const stillLoggedIn = await canopusRPA.verifyLoginSuccess();
      if (stillLoggedIn) {
        console.log('✅ Sessão estável e ativa!\n');
      } else {
        console.log('⚠️  Aviso: Sessão pode ter expirado ou houve redirecionamento\n');
      }
    } else {
      console.log('\n❌❌❌ LOGIN FALHOU ❌❌❌\n');
      console.log('💡 Verifique:');
      console.log('   1. Se as credenciais no .env estão corretas');
      console.log('   2. Se a URL do Canopus está correta');
      console.log('   3. Os screenshots em ./screenshots/ para ver o que aconteceu');
      console.log('   4. Se os seletores no código correspondem ao site real\n');
    }

    // Manter navegador aberto por alguns segundos para inspeção
    console.log('⏳ Mantendo navegador aberto por 10 segundos para inspeção...');
    console.log('   (Você pode verificar manualmente se está logado)\n');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Fechar navegador
    console.log('🔒 Fechando navegador...');
    await canopusRPA.close();
    console.log('✅ Navegador fechado\n');

    console.log('✅ Teste de login concluído!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌❌❌ ERRO NO TESTE DE LOGIN ❌❌❌\n');
    console.error('Erro:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    
    console.log('\n💡 Dicas para resolver:');
    console.log('   1. Verifique se CANOPUS_URL, CANOPUS_USERNAME e CANOPUS_PASSWORD estão no .env');
    console.log('   2. Verifique se a URL do Canopus está correta e acessível');
    console.log('   3. Verifique se as credenciais estão corretas');
    console.log('   4. Confira os screenshots em ./screenshots/ para ver o que aconteceu');
    console.log('   5. Os seletores no código podem precisar ser ajustados para o site real');
    console.log('   6. Verifique se há captcha ou autenticação de dois fatores\n');
    
    // Tentar fechar navegador mesmo em caso de erro
    try {
      await canopusRPA.close();
    } catch (closeError) {
      // Ignorar erro ao fechar
    }
    
    process.exit(1);
  }
}

// Executar teste
testLogin();
