import express from 'express';
import { execSync } from 'child_process';
import { config, validateConfig } from './config/config.js';
import orchestrator from './services/orchestrator.service.js';
import messageBus from './services/message-bus.service.js';
import whatsappService from './services/whatsapp.service.js';

const app = express();

/**
 * Verificar e instalar browsers do Playwright se necessário (apenas em produção)
 */
async function ensurePlaywrightBrowsers() {
  if (process.env.NODE_ENV === 'production') {
    try {
      console.log('🔍 Verificando instalação dos browsers do Playwright...');
      // Tentar verificar se o chromium existe
      const { chromium } = await import('playwright');
      try {
        // Tentar lançar o browser para verificar se está instalado
        const browser = await chromium.launch({ headless: true });
        await browser.close();
        console.log('✅ Browsers do Playwright já instalados');
      } catch (error) {
        if (error.message.includes('Executable doesn\'t exist') || error.message.includes('browserType.launch')) {
          console.log('⚠️ Browsers não encontrados, tentando instalar...');
          execSync('npx playwright install chromium', { 
            stdio: 'inherit',
            timeout: 300000 // 5 minutos
          });
          console.log('✅ Browsers do Playwright instalados com sucesso');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.warn('⚠️ Aviso: Não foi possível verificar/instalar browsers automaticamente:', error.message);
      console.warn('💡 Certifique-se de que o build command no Render inclui: npm install && npx playwright install chromium');
    }
  }
}

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
    const { phone, message, text, instanceId, type, status } = req.body;
    const timestamp = new Date().toLocaleString('pt-BR');

    // Ignorar callbacks de status (MessageStatusCallback)
    // Estes são eventos de status (READ, SENT, RECEIVED, etc.) e não mensagens reais
    if (type === 'MessageStatusCallback') {
      // Retornar 200 silenciosamente - estes são eventos válidos, apenas não precisam ser processados
      return res.status(200).json({ status: 'ignored', reason: 'status_callback' });
    }

    // Validar dados básicos - aceitar phone e (message OU text)
    if (!phone || (!message && !text)) {
      console.warn('⚠️ Webhook inválido: falta phone ou message');
      console.warn('📋 Body recebido:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    // Validar instanceId (segurança)
    if (instanceId && config.zapi.instanceId && instanceId !== config.zapi.instanceId) {
      console.warn(`⚠️ Webhook recebido de instância não autorizada: ${instanceId} (esperado: ${config.zapi.instanceId})`);
      return res.status(403).json({ error: 'Instância não autorizada' });
    }

    // Extrair texto da mensagem de forma robusta
    // Z-API pode enviar: { text: { message: "..." } } ou { message: "..." }
    let messageText = '';
    
    // Primeiro tentar extrair de text.message (formato Z-API)
    if (text?.message) {
      messageText = text.message;
    } else if (typeof message === 'string') {
      messageText = message;
    } else if (message?.text) {
      messageText = message.text;
    } else if (message?.body) {
      messageText = message.body;
    } else if (message?.message) {
      messageText = message.message;
    } else if (message?.content) {
      messageText = message.content;
    } else if (text?.body) {
      messageText = text.body;
    } else {
      console.warn('⚠️ Formato de mensagem desconhecido:', JSON.stringify(req.body));
      messageText = JSON.stringify(message || text);
    }

    // Ignorar mensagens vazias
    if (!messageText.trim()) {
      console.log('ℹ️ Ignorando mensagem vazia');
      return res.status(200).json({ status: 'ignored', reason: 'empty_message' });
    }

    // Ignorar mensagens do próprio bot
    if (phone === config.whatsapp.businessNumber) {
      console.log('ℹ️ Ignorando mensagem do próprio bot');
      return res.status(200).json({ status: 'ignored', reason: 'self_message' });
    }

    // Log formatado da mensagem recebida
    console.log('\n' + '═'.repeat(70));
    console.log(`📥 MENSAGEM RECEBIDA [${timestamp}]`);
    console.log('─'.repeat(70));
    console.log(`👤 De: ${phone}`);
    if (instanceId) {
      console.log(`🔑 Instance ID: ${instanceId}`);
    }
    console.log(`💬 Mensagem: "${messageText}"`);
    console.log('═'.repeat(70) + '\n');

    // Responder rapidamente ao webhook
    res.status(200).json({ status: 'received' });

    // Processar mensagem de forma assíncrona
    setImmediate(async () => {
      try {
        await orchestrator.processMessage(phone, messageText);
      } catch (error) {
        console.error(`❌ Erro ao processar mensagem de ${phone}:`, error.message);
        console.error('📋 Stack trace:', error.stack);
        console.error('📋 Mensagem original:', messageText);
        
        // Tentar enviar mensagem de erro ao usuário
        try {
          await whatsappService.sendMessage(
            phone,
            '❌ Ocorreu um erro ao processar sua mensagem. Por favor, tente novamente ou digite *MENU* para começar de novo.'
          );
        } catch (sendError) {
          console.error('❌ Erro ao enviar mensagem de erro:', sendError.message);
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error.message);
    console.error('📋 Stack trace:', error.stack);
    console.error('📋 Request body:', JSON.stringify(req.body, null, 2));
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

    // Verificar/instalar browsers do Playwright antes de iniciar
    await ensurePlaywrightBrowsers();

    // Validar configurações
    console.log('🔍 Validando configurações...');
    validateConfig();
    console.log('✅ Configurações validadas\n');

    // Iniciar limpeza automática de sessões
    console.log('🧹 Iniciando limpeza automática de sessões...');
    orchestrator.startSessionCleanup();
    console.log('✅ Limpeza automática ativada\n');

    // Configurar webhook automaticamente se WEBHOOK_URL estiver definido
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      console.log('🔧 Configurando webhook automaticamente...');
      try {
        await whatsappService.setWebhook(webhookUrl);
        console.log(`✅ Webhook configurado: ${webhookUrl}\n`);
      } catch (error) {
        console.warn('⚠️  Aviso: Não foi possível configurar o webhook automaticamente');
        console.warn('   Você pode configurá-lo manualmente usando: npm run configure:webhook <URL>');
        console.warn(`   Erro: ${error.message}\n`);
      }
    } else {
      console.log('ℹ️  WEBHOOK_URL não configurado no .env');
      console.log('   Configure manualmente usando: npm run configure:webhook <URL>\n');
    }

    // Iniciar servidor
    const port = config.server.port;
    app.listen(port, () => {
      console.log(`✅ Servidor rodando na porta ${port}`);
      console.log(`📡 Webhook URL: http://localhost:${port}/webhook`);
      if (webhookUrl) {
        console.log(`🌐 Webhook público configurado: ${webhookUrl}`);
      } else {
        console.log(`🌐 Para configurar webhook público, use: npm run configure:webhook <URL>`);
      }
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
