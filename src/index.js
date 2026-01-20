import express from 'express';
import { config, validateConfig } from './config/config.js';
import orchestrator from './services/orchestrator.service.js';
import messageBus from './services/message-bus.service.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS para frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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
 * API para frontend: Enviar mensagem do cliente
 */
app.post('/api/frontend/message', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'phone e message são obrigatórios' });
    }

    // NOT adding user message to message bus here - frontend adds it directly to UI
    // This prevents duplicate user messages appearing via SSE
    
    // Responder rapidamente ao cliente
    res.json({ 
      status: 'success',
      message: 'Mensagem recebida'
    });

    // Processar mensagem de forma assíncrona (não bloquear resposta)
    setImmediate(async () => {
      try {
        console.log(`🔄 Processing message from ${phone}: "${message}"`);
        await orchestrator.processMessage(phone, message);
        console.log(`✅ Message processed successfully for ${phone}`);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem do frontend:', error);
        // Enviar mensagem de erro via message bus
        try {
          messageBus.addMessage(phone, '❌ Ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.', 'bot');
        } catch (busError) {
          console.error('❌ Erro ao enviar mensagem de erro:', busError);
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro no endpoint de mensagem do frontend:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API para frontend: Obter mensagens
 */
app.get('/api/frontend/messages/:phone', (req, res) => {
  try {
    const { phone } = req.params;
    const { since } = req.query;

    const messages = messageBus.getMessages(phone, since || null);

    res.json({ 
      status: 'success',
      messages: messages
    });

  } catch (error) {
    console.error('❌ Erro ao obter mensagens:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API para frontend: Server-Sent Events (SSE) para mensagens em tempo real
 */
app.get('/api/frontend/messages/:phone/stream', (req, res) => {
  try {
    const { phone } = req.params;

    // Configurar headers para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if present

    // Flush headers immediately
    res.flushHeaders();

    console.log(`🔌 Setting up SSE stream for ${phone}`);

    // Registrar conexão SSE
    messageBus.registerSSE(phone, res);

    // Enviar mensagens pendentes
    const existingMessages = messageBus.getMessages(phone);
    console.log(`📬 Sending ${existingMessages.length} existing messages to ${phone}`);
    existingMessages.forEach(msg => {
      const sseData = { eventType: 'message', ...msg };
      res.write(`data: ${JSON.stringify(sseData)}\n\n`);
    });

    // Keep-alive ping
    const pingInterval = setInterval(() => {
      try {
        if (!res.writableEnded && !res.destroyed) {
          res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
        } else {
          clearInterval(pingInterval);
        }
      } catch (error) {
        console.error('Error sending ping:', error);
        clearInterval(pingInterval);
      }
    }, 30000); // ping a cada 30 segundos

    // Limpar ao desconectar
    req.on('close', () => {
      console.log(`🔌 SSE connection closed for ${phone}`);
      clearInterval(pingInterval);
      messageBus.unregisterSSE(phone, res);
    });

    req.on('error', (error) => {
      console.error(`❌ SSE connection error for ${phone}:`, error);
      clearInterval(pingInterval);
      messageBus.unregisterSSE(phone, res);
    });

  } catch (error) {
    console.error('❌ Erro no SSE:', error);
    res.status(500).end();
  }
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
