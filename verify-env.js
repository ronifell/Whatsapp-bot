import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
const envPath = join(__dirname, '.env');

if (!existsSync(envPath)) {
  console.error('\n❌ ERRO: Arquivo .env não encontrado!');
  console.error('\nCrie um arquivo .env na raiz do projeto com as configurações necessárias.');
  console.error('Use o arquivo env.example como referência.\n');
  process.exit(1);
}

dotenv.config({ path: envPath });

console.log('\n' + '═'.repeat(70));
console.log('🔍 VERIFICAÇÃO DA CONFIGURAÇÃO .ENV');
console.log('═'.repeat(70));
console.log();

const requiredVars = {
  'ZAPI_INSTANCE_ID': 'ID da instância Z-API',
  'ZAPI_TOKEN': 'Token de autenticação Z-API',
  'ZAPI_BASE_URL': 'URL base da API Z-API (opcional, padrão: https://api.z-api.io)',
  'WHATSAPP_NUMBER': 'Número do WhatsApp Business',
  'ADMIN_WHATSAPP': 'Número do administrador (opcional)',
  'CANOPUS_URL': 'URL do portal Canopus',
  'CANOPUS_USERNAME': 'Usuário do Canopus',
  'CANOPUS_PASSWORD': 'Senha do Canopus',
  'OPENAI_API_KEY': 'Chave da API OpenAI',
  'PORT': 'Porta do servidor (opcional, padrão: 3000)',
  'QUOTATION_MODE': 'Modo de cotação (opcional, padrão: pre-scraped)'
};

let missing = [];
let allOk = true;

for (const [key, description] of Object.entries(requiredVars)) {
  const value = process.env[key];
  
  if (!value) {
    // Some are optional
    if (key === 'ZAPI_BASE_URL' || key === 'ADMIN_WHATSAPP' || key === 'PORT' || key === 'QUOTATION_MODE') {
      console.log(`⚠️  ${key}: não configurado (opcional)`);
    } else {
      console.log(`❌ ${key}: não encontrado`);
      console.log(`   Descrição: ${description}`);
      missing.push(key);
      allOk = false;
    }
  } else {
    // Hide sensitive values
    if (key.includes('TOKEN') || key.includes('PASSWORD') || key.includes('API_KEY') || key.includes('USERNAME')) {
      const masked = value.length > 8 
        ? value.substring(0, 4) + '...' + value.substring(value.length - 4)
        : '***';
      console.log(`✅ ${key}: ${masked}`);
    } else {
      console.log(`✅ ${key}: ${value}`);
    }
  }
}

console.log();
console.log('═'.repeat(70));

if (!allOk) {
  console.error('\n❌ Algumas variáveis obrigatórias estão faltando!');
  console.error('\nVariáveis faltando:');
  missing.forEach(key => {
    console.error(`   - ${key}: ${requiredVars[key]}`);
  });
  console.error('\nVerifique o arquivo .env e certifique-se de que todas as variáveis estão configuradas.');
  console.error();
  process.exit(1);
}

console.log('\n✅ Todas as variáveis obrigatórias estão configuradas!');
console.log();

// Verify expected values
const expectedInstanceId = '3ED53E69CF90C19ADB44D66739CEE648';
const expectedWhatsApp = '5511999484829';

if (process.env.ZAPI_INSTANCE_ID === expectedInstanceId) {
  console.log(`✅ ZAPI_INSTANCE_ID está correto: ${expectedInstanceId}`);
} else {
  console.log(`⚠️  ZAPI_INSTANCE_ID esperado: ${expectedInstanceId}`);
  console.log(`   Configurado: ${process.env.ZAPI_INSTANCE_ID || 'não encontrado'}`);
}

if (process.env.WHATSAPP_NUMBER === expectedWhatsApp) {
  console.log(`✅ WHATSAPP_NUMBER está correto: ${expectedWhatsApp}`);
} else {
  console.log(`⚠️  WHATSAPP_NUMBER esperado: ${expectedWhatsApp}`);
  console.log(`   Configurado: ${process.env.WHATSAPP_NUMBER || 'não encontrado'}`);
}

console.log();
console.log('═'.repeat(70));
console.log('\n🎉 Configuração verificada! Você está pronto para testar.');
console.log('\nPróximos passos:');
console.log('   1. Execute: npm start');
console.log('   2. Execute: START_NGROK.bat (em outro terminal)');
console.log('   3. Configure o webhook no painel Z-API');
console.log('   4. Envie uma mensagem para 5511999484829');
console.log();
process.exit(0);
