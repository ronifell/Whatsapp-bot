import whatsappService from './whatsapp.service.js';
import aiService from './ai.service.js';
import canopusRPA from './canopus-rpa.service.js';
import preScrapedDataService from './pre-scraped-data.service.js';
import sessionService from './session.service.js';
import { config } from '../config/config.js';

/**
 * Serviço de orquestração do fluxo completo
 */
class OrchestratorService {
  
  /**
   * Processa mensagem recebida do cliente
   */
  async processMessage(phone, message) {
    try {
      console.log(`\n📱 Nova mensagem de ${phone}: "${message}"`);
      
      // Obter ou criar sessão
      let session = sessionService.getSession(phone);
      
      if (!session) {
        session = sessionService.createSession(phone);
      }

      // Adicionar ao histórico
      sessionService.addToHistory(phone, message, 'user');

      // Verificar comando MENU
      if (message.toUpperCase().includes('MENU')) {
        sessionService.clearSession(phone);
        await whatsappService.sendWelcomeMessage(phone);
        return;
      }

      // Se já foi encaminhado para humano, não processar mensagens do bot
      if (session.state === 'FORWARDED_TO_HUMAN') {
        console.log(`🔇 Mensagem de ${phone} ignorada - cliente já está com atendente humano`);
        return;
      }

      // Fluxo baseado no estado da sessão
      switch (session.state) {
        case 'INITIAL':
          await this.handleInitialState(phone, message, session);
          break;

        case 'CONVERSATIONAL':
          await this.handleConversationalState(phone, message, session);
          break;

        case 'AWAITING_TYPE':
          await this.handleTypeSelection(phone, message, session);
          break;

        case 'AWAITING_DATA':
          await this.handleDataCollection(phone, message, session);
          break;

        case 'PROCESSING':
          // Cliente enviou mensagem durante processamento
          await whatsappService.sendMessage(
            phone,
            '⏳ Sua cotação está sendo processada. Por favor, aguarde...'
          );
          break;

        case 'COMPLETED':
          await this.handlePostQuotation(phone, message, session);
          break;

        case 'FORWARDED_TO_HUMAN':
          // Não deve chegar aqui devido ao check acima, mas por segurança
          console.log(`🔇 Mensagem de ${phone} ignorada - cliente já está com atendente humano`);
          return;

        default:
          await this.handleInitialState(phone, message, session);
      }

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      await whatsappService.sendErrorMessage(phone);
      
      // Notificar admin sobre erro
      await whatsappService.forwardToHuman(phone, 'Erro no processamento', {
        error: error.message,
        message: message
      });
      
      sessionService.updateSession(phone, { 
        state: 'FORWARDED_TO_HUMAN'
      });
    }
  }

  /**
   * Trata estado inicial - detecta intenção e responde apropriadamente
   */
  async handleInitialState(phone, message, session) {
    // 1. Detectar intenção do usuário
    const intent = await aiService.detectUserIntent(message, session.history || []);

    if (intent === 'HUMAN_REQUEST') {
      // Cliente quer falar com humano - encaminhar
      await whatsappService.forwardToHuman(phone, 'Cliente solicitou atendimento humano', {
        message: message
      });
      
      sessionService.updateSession(phone, { 
        state: 'FORWARDED_TO_HUMAN'
      });
      return;
    }

    if (intent === 'QUOTE_REQUEST') {
      // Cliente está explicitamente solicitando uma cotação
      const classification = await aiService.classifyConsortiumType(message);
      
      if (classification === 'OUTROS') {
        // Cotação para outros tipos - encaminhar para humano
        await whatsappService.forwardToHuman(phone, 'Solicitação de cotação para tipo não automatizado', {
          message: message,
          consortiumType: classification
        });
        
        sessionService.updateSession(phone, { 
          state: 'FORWARDED_TO_HUMAN',
          consortiumType: 'OUTROS'
        });
        return;
      }

      // Cotação para CARRO ou IMOVEL - seguir com extração de dados
      if (classification && classification !== 'OUTROS') {
        // Tentar processar mensagem completa (pode conter tipo + dados)
        const extractedData = await aiService.extractCustomerData(message, classification);
        
        if (extractedData) {
          const validation = aiService.validateData(extractedData, classification);
          
          if (validation.valid) {
            // Mensagem completa! Processar diretamente
            console.log('✅ Mensagem completa detectada - processando diretamente');
            
            sessionService.updateSession(phone, {
              consortiumType: classification,
              data: extractedData,
              state: 'PROCESSING'
            });

            await whatsappService.sendProcessingMessage(phone);
            await this.generateQuotation(phone, classification, extractedData);
            return;
          }
        }

        // Tem tipo mas falta dados - solicitar dados
        sessionService.updateSession(phone, {
          consortiumType: classification,
          state: 'AWAITING_DATA'
        });

        if (classification === 'CARRO') {
          await whatsappService.requestCarData(phone);
        } else if (classification === 'IMOVEL') {
          await whatsappService.requestPropertyData(phone);
        }
        return;
      }
    }

    // QUESTION ou OTHER - responder conversacionalmente
    if (intent === 'QUESTION' || intent === 'OTHER') {
      // Verificar se mencionou tipo de consórcio para contexto
      const classification = await aiService.classifyConsortiumType(message);
      const consortiumType = (classification && classification !== 'OUTROS') ? classification : null;
      
      // Gerar resposta conversacional
      const response = await aiService.generateConversationalResponse(
        message, 
        session.history || [], 
        consortiumType
      );
      
      // Enviar resposta
      await whatsappService.sendMessage(phone, response);
      sessionService.addToHistory(phone, response, 'bot');
      
      // Atualizar para estado conversacional
      sessionService.updateSession(phone, { 
        state: 'CONVERSATIONAL',
        consortiumType: consortiumType // Salvar tipo mencionado para contexto
      });
      return;
    }

    // Fallback: enviar boas-vindas
    await whatsappService.sendWelcomeMessage(phone);
    sessionService.updateSession(phone, { state: 'AWAITING_TYPE' });
  }

  /**
   * Trata estado conversacional - responde perguntas e detecta mudanças de intenção
   */
  async handleConversationalState(phone, message, session) {
    // Detectar intenção atual
    const intent = await aiService.detectUserIntent(message, session.history || []);

    if (intent === 'HUMAN_REQUEST') {
      // Cliente quer falar com humano
      await whatsappService.forwardToHuman(phone, 'Cliente solicitou atendimento humano', {
        message: message,
        conversationHistory: session.history
      });
      
      sessionService.updateSession(phone, { 
        state: 'FORWARDED_TO_HUMAN'
      });
      return;
    }

    if (intent === 'QUOTE_REQUEST') {
      // Cliente agora quer cotar - processar solicitação
      const classification = await aiService.classifyConsortiumType(message);
      
      if (classification === 'OUTROS') {
        // Cotação para outros tipos - encaminhar para humano
        await whatsappService.forwardToHuman(phone, 'Solicitação de cotação para tipo não automatizado', {
          message: message,
          consortiumType: classification
        });
        
        sessionService.updateSession(phone, { 
          state: 'FORWARDED_TO_HUMAN',
          consortiumType: 'OUTROS'
        });
        return;
      }

      // Cotação para CARRO ou IMOVEL
      if (classification && classification !== 'OUTROS') {
        // Tentar extrair dados da mensagem
        const extractedData = await aiService.extractCustomerData(message, classification);
        
        if (extractedData) {
          const validation = aiService.validateData(extractedData, classification);
          
          if (validation.valid) {
            // Dados completos - processar
            sessionService.updateSession(phone, {
              consortiumType: classification,
              data: extractedData,
              state: 'PROCESSING'
            });

            await whatsappService.sendProcessingMessage(phone);
            await this.generateQuotation(phone, classification, extractedData);
            return;
          }
        }

        // Falta dados - solicitar
        sessionService.updateSession(phone, {
          consortiumType: classification,
          state: 'AWAITING_DATA'
        });

        if (classification === 'CARRO') {
          await whatsappService.requestCarData(phone);
        } else if (classification === 'IMOVEL') {
          await whatsappService.requestPropertyData(phone);
        }
        return;
      }
    }

    // QUESTION ou OTHER - continuar conversação
    const response = await aiService.generateConversationalResponse(
      message, 
      session.history || [], 
      session.consortiumType
    );
    
    await whatsappService.sendMessage(phone, response);
    sessionService.addToHistory(phone, response, 'bot');
    
    // Manter estado conversacional
    sessionService.updateSession(phone, { 
      state: 'CONVERSATIONAL'
    });
  }

  /**
   * Trata seleção do tipo de consórcio
   */
  async handleTypeSelection(phone, message, session) {
    // Detectar intenção primeiro
    const intent = await aiService.detectUserIntent(message, session.history || []);

    if (intent === 'HUMAN_REQUEST') {
      await whatsappService.forwardToHuman(phone, 'Cliente solicitou atendimento humano', {
        message: message
      });
      
      sessionService.updateSession(phone, { 
        state: 'FORWARDED_TO_HUMAN'
      });
      return;
    }

    // Classificar tipo com IA
    const classification = await aiService.classifyConsortiumType(message);

    if (classification === 'OUTROS') {
      // Se for pergunta sobre outros tipos, responder conversacionalmente
      if (intent === 'QUESTION' || intent === 'OTHER') {
        const response = await aiService.generateConversationalResponse(
          message, 
          session.history || [], 
          null
        );
        
        await whatsappService.sendMessage(phone, response);
        sessionService.addToHistory(phone, response, 'bot');
        sessionService.updateSession(phone, { 
          state: 'CONVERSATIONAL'
        });
        return;
      }

      // Se for solicitação explícita de cotação de outros tipos, encaminhar para humano
      await whatsappService.forwardToHuman(phone, 'Consultoria/Outros', {
        message: message
      });
      
      sessionService.updateSession(phone, { 
        state: 'FORWARDED_TO_HUMAN',
        consortiumType: 'OUTROS'
      });
      
      return;
    }

    // Se for pergunta sobre CARRO ou IMOVEL, responder conversacionalmente
    if (intent === 'QUESTION' || intent === 'OTHER') {
      const response = await aiService.generateConversationalResponse(
        message, 
        session.history || [], 
        classification
      );
      
      await whatsappService.sendMessage(phone, response);
      sessionService.addToHistory(phone, response, 'bot');
      sessionService.updateSession(phone, { 
        state: 'CONVERSATIONAL',
        consortiumType: classification
      });
      return;
    }

    // Se for solicitação de cotação, seguir com coleta de dados
    if (intent === 'QUOTE_REQUEST' && classification && classification !== 'OUTROS') {
      sessionService.updateSession(phone, {
        consortiumType: classification,
        state: 'AWAITING_DATA'
      });

      if (classification === 'CARRO') {
        await whatsappService.requestCarData(phone);
      } else if (classification === 'IMOVEL') {
        await whatsappService.requestPropertyData(phone);
      }
      return;
    }
  }

  /**
   * Trata coleta de dados do cliente
   */
  async handleDataCollection(phone, message, session) {
    // Extrair dados com IA
    const extractedData = await aiService.extractCustomerData(
      message, 
      session.consortiumType
    );

    if (!extractedData) {
      await whatsappService.sendMessage(
        phone,
        '❌ Não consegui entender os dados. Por favor, envie novamente no formato indicado.'
      );
      return;
    }

    // Validar dados
    const validation = aiService.validateData(extractedData, session.consortiumType);

    if (!validation.valid) {
      if (validation.missingFields) {
        const msg = aiService.generateMissingFieldsMessage(
          validation.missingFields, 
          session.consortiumType
        );
        await whatsappService.sendMessage(phone, msg);
      } else if (validation.error) {
        await whatsappService.sendMessage(
          phone,
          `❌ ${validation.error}\n\nPor favor, corrija e envie novamente.`
        );
      }
      return;
    }

    // Dados válidos, atualizar sessão
    sessionService.updateSession(phone, {
      data: extractedData,
      state: 'PROCESSING'
    });

    // Enviar mensagem de processamento
    await whatsappService.sendProcessingMessage(phone);

    // Gerar cotação via RPA
    await this.generateQuotation(phone, session.consortiumType, extractedData);
  }

  /**
   * Gera cotação usando RPA ou dados pre-scraped conforme configuração
   */
  async generateQuotation(phone, consortiumType, data) {
    try {
      const usePreScraped = config.quotationMode === 'pre-scraped';
      
      if (usePreScraped) {
        // Modo rápido: usar dados previamente extraídos
        console.log('⚡ Modo pre-scraped: usando dados da pasta data/');
        let quotationData;

        // Gerar cotação conforme tipo usando dados pre-scraped
        if (consortiumType === 'CARRO') {
          quotationData = await preScrapedDataService.generateCarQuotation(data);
        } else if (consortiumType === 'IMOVEL') {
          quotationData = await preScrapedDataService.generatePropertyQuotation(data);
        }

        // Enviar cotação ao cliente
        await whatsappService.sendQuotation(phone, quotationData);

        // Atualizar sessão
        sessionService.updateSession(phone, {
          state: 'COMPLETED',
          quotation: quotationData
        });

        console.log('✅ Cotação enviada com sucesso (pre-scraped)!');
      } else {
        // Modo original: usar scraping em tempo real
        console.log('🕷️  Modo scraping: acessando website em tempo real');
        
        // Inicializar navegador
        await canopusRPA.initBrowser(false); // headless=false para debug, true em produção

        // Fazer login
        await canopusRPA.login();

        let quotationData;

        // Gerar cotação conforme tipo
        if (consortiumType === 'CARRO') {
          quotationData = await canopusRPA.generateCarQuotation(data);
        } else if (consortiumType === 'IMOVEL') {
          quotationData = await canopusRPA.generatePropertyQuotation(data);
        }

        // Fechar navegador
        await canopusRPA.close();

        // Enviar cotação ao cliente
        await whatsappService.sendQuotation(phone, quotationData);

        // Atualizar sessão
        sessionService.updateSession(phone, {
          state: 'COMPLETED',
          quotation: quotationData
        });

        console.log('✅ Cotação enviada com sucesso (scraping)!');
      }

    } catch (error) {
      console.error('❌ Erro ao gerar cotação:', error);
      
      // Tentar fechar navegador se estiver aberto (pode não estar no modo pre-scraped)
      try {
        await canopusRPA.close();
      } catch (e) {
        // Ignorar erro se navegador não estiver aberto
      }
      
      await whatsappService.sendErrorMessage(phone);
      
      // Encaminhar para humano
      await whatsappService.forwardToHuman(phone, 'Erro na geração de cotação', {
        error: error.message,
        data: data
      });

      sessionService.updateSession(phone, { state: 'FORWARDED_TO_HUMAN' });
    }
  }

  /**
   * Trata mensagens após cotação enviada
   */
  async handlePostQuotation(phone, message, session) {
    // Detectar intenção
    const intent = await aiService.detectUserIntent(message, session.history || []);

    if (intent === 'HUMAN_REQUEST') {
      // Cliente explicitamente quer falar com humano
      await whatsappService.forwardToHuman(
        phone, 
        'Cliente solicitou atendimento humano pós-cotação',
        {
          quotation: session.quotation,
          customerData: session.data,
          message: message
        }
      );
      sessionService.updateSession(phone, { 
        state: 'FORWARDED_TO_HUMAN'
      });
      return;
    }

    if (intent === 'QUOTE_REQUEST') {
      // Cliente quer outra cotação - resetar para estado inicial
      sessionService.clearSession(phone);
      const newSession = sessionService.createSession(phone);
      await this.handleInitialState(phone, message, newSession);
      return;
    }

    // Perguntas - responder conversacionalmente
    if (intent === 'QUESTION' || intent === 'OTHER') {
      const response = await aiService.generateConversationalResponse(
        message, 
        session.history || [], 
        session.consortiumType
      );
      
      await whatsappService.sendMessage(phone, response);
      sessionService.addToHistory(phone, response, 'bot');
      
      // Manter estado COMPLETED mas permitir conversação
      sessionService.updateSession(phone, { 
        state: 'COMPLETED'
      });
      
      // Se mencionar fechar negócio, encaminhar
      const wantsToClose = await aiService.detectClosingIntent(message);
      if (wantsToClose) {
        await whatsappService.forwardToHuman(
          phone, 
          'Cliente quer prosseguir com fechamento',
          {
            quotation: session.quotation,
            customerData: session.data
          }
        );
        sessionService.updateSession(phone, { 
          state: 'FORWARDED_TO_HUMAN'
        });
      }
      return;
    }

    // Fallback - encaminhar para humano
    await whatsappService.forwardToHuman(
      phone,
      'Mensagem pós-cotação não classificada',
      {
        message: message,
        quotation: session.quotation
      }
    );
    sessionService.updateSession(phone, { 
      state: 'FORWARDED_TO_HUMAN'
    });
  }

  /**
   * Inicia limpeza automática de sessões antigas
   */
  startSessionCleanup() {
    // Limpar sessões a cada 1 hora
    setInterval(() => {
      console.log('🧹 Limpando sessões antigas...');
      sessionService.cleanOldSessions();
    }, 60 * 60 * 1000);
  }
}

export default new OrchestratorService();
