import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Z-API Configuration
  zapi: {
    instanceId: process.env.ZAPI_INSTANCE_ID,
    token: process.env.ZAPI_TOKEN,
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
  }
};

// Validate required configuration
export function validateConfig() {
  const required = [
    'ZAPI_INSTANCE_ID',
    'ZAPI_TOKEN',
    'CANOPUS_URL',
    'CANOPUS_USERNAME',
    'CANOPUS_PASSWORD',
    'OPENAI_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Configurações obrigatórias faltando: ${missing.join(', ')}`);
  }
}
