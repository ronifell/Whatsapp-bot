import express from 'express';
import { config, validateConfig } from './config/config.js';
import orchestrator from './services/orchestrator.service.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Health check endpoint
 */
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'CotaFácil Automação',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * Webhook para receber mensagens do Z-API
 */
app.post('/webhook', async (req, res) => {
  try {
    console.log('\n📨 Webhook recebido:', JSON.stringify(req.body, null, 2));

    const { phone, message, instanceId } = req.body;

    // Validar dados básicos
    if (!phone || !message) {
      console.warn('⚠️ Webhook inválido: falta phone ou message');
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    // Ignorar mensagens do próprio bot
    if (phone === config.whatsapp.businessNumber) {
      console.log('ℹ️ Ignorando mensagem do próprio bot');
      return res.status(200).json({ status: 'ignored' });
    }

    // Responder rapidamente ao webhook
    res.status(200).json({ status: 'received' });

    // Processar mensagem de forma assíncrona
    setImmediate(async () => {
      try {
        await orchestrator.processMessage(phone, message.text || message);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
      }
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

/**
 * Endpoint para teste manual
 */
app.post('/test-message', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'phone e message são obrigatórios' });
    }

    await orchestrator.processMessage(phone, message);

    res.json({ 
      status: 'success',
      message: 'Mensagem processada'
    });

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint de estatísticas
 */
app.get('/stats', (req, res) => {
  const sessionService = require('./services/session.service.js').default;
  const sessions = sessionService.getActiveSessions();

  res.json({
    activeSessions: sessions.length,
    sessions: sessions.map(s => ({
      phone: s.phone,
      state: s.state,
      consortiumType: s.consortiumType,
      updatedAt: s.updatedAt
    }))
  });
});

/**
 * Inicialização do servidor
 */
async function startServer() {
  try {
    console.log('\n🚀 Iniciando CotaFácil Automação...\n');

    // Validar configurações
    console.log('🔍 Validando configurações...');
    validateConfig();
    console.log('✅ Configurações validadas\n');

    // Iniciar limpeza automática de sessões
    console.log('🧹 Iniciando limpeza automática de sessões...');
    orchestrator.startSessionCleanup();
    console.log('✅ Limpeza automática ativada\n');

    // Iniciar servidor
    const port = config.server.port;
    app.listen(port, () => {
      console.log(`✅ Servidor rodando na porta ${port}`);
      console.log(`📡 Webhook URL: http://localhost:${port}/webhook`);
      console.log(`🌐 Health check: http://localhost:${port}/`);
      console.log(`📊 Stats: http://localhost:${port}/stats`);
      console.log(`🧪 Test endpoint: POST http://localhost:${port}/test-message`);
      console.log('\n🎯 Sistema pronto para receber mensagens!\n');
      console.log('Pressione Ctrl+C para parar\n');
    });

  } catch (error) {
    console.error('\n❌ Erro ao iniciar servidor:', error.message);
    console.error('\n💡 Verifique se o arquivo .env está configurado corretamente.');
    console.error('   Use o arquivo env.example como referência.\n');
    process.exit(1);
  }
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Tratamento de encerramento gracioso
process.on('SIGINT', () => {
  console.log('\n\n👋 Encerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Encerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
startServer();
