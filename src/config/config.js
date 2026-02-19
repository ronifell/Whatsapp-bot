import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Z-API Configuration
  zapi: {
    instanceId: process.env.ZAPI_INSTANCE_ID,
    token: process.env.ZAPI_TOKEN,
    clientToken: process.env.ZAPI_CLIENT_TOKEN, // Client-Token configurado no dashboard (opcional)
    baseUrl: process.env.ZAPI_BASE_URL || 'https://api.z-api.io'
  },

  // WhatsApp
  whatsapp: {
    businessNumber: process.env.WHATSAPP_NUMBER,
    adminNumber: process.env.ADMIN_WHATSAPP
  },

  // Canopus
  canopus: {
    url: process.env.CANOPUS_URL,
    username: process.env.CANOPUS_USERNAME,
    password: process.env.CANOPUS_PASSWORD
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },

  // Server
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  // Quotation Mode
  // 'scraping' = usa scraping em tempo real (modo original)
  // 'pre-scraped' = usa dados previamente extraídos da pasta data/ (modo rápido)
  quotationMode: process.env.QUOTATION_MODE || 'pre-scraped'
};

// Validate required configuration
export function validateConfig() {
  const isFrontendMode = process.env.FRONTEND_MODE === 'true' || process.env.NODE_ENV === 'development';
  
  // Always required
  const alwaysRequired = [
    'CANOPUS_URL',
    'CANOPUS_USERNAME',
    'CANOPUS_PASSWORD',
    'OPENAI_API_KEY'
  ];

  // Required only when not in frontend mode
  const whatsappRequired = isFrontendMode ? [] : [
    'ZAPI_INSTANCE_ID',
    'ZAPI_TOKEN'
  ];

  const required = [...alwaysRequired, ...whatsappRequired];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    if (isFrontendMode) {
      console.warn(`⚠️  Configurações faltando (mas OK para modo frontend): ${missing.join(', ')}`);
    } else {
      throw new Error(`Configurações obrigatórias faltando: ${missing.join(', ')}`);
    }
  }
  
  // Warn if ADMIN_WHATSAPP is not configured (not required, but recommended)
  if (!process.env.ADMIN_WHATSAPP) {
    console.warn('\n⚠️  AVISO: ADMIN_WHATSAPP não configurado no arquivo .env');
    console.warn('   As notificações de atendimento humano não serão enviadas aos consultores.');
    console.warn('   Configure ADMIN_WHATSAPP no arquivo .env com o número do WhatsApp do consultor.');
    console.warn('   Formato: 5511999999999 (código do país + DDD + número, sem espaços)\n');
  } else {
    console.log(`✅ ADMIN_WHATSAPP configurado: ${process.env.ADMIN_WHATSAPP.substring(0, 4)}****${process.env.ADMIN_WHATSAPP.substring(process.env.ADMIN_WHATSAPP.length - 3)}`);
  }
}
