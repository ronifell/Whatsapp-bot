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

      // Detectar e atualizar preferência de idioma
      const languagePreference = await aiService.detectLanguagePreference(message, session.history || []);
      if (languagePreference) {
        sessionService.updateSession(phone, { preferredLanguage: languagePreference });
        session = sessionService.getSession(phone); // Atualizar referência da sessão
        console.log(`🌐 Preferência de idioma atualizada para: ${languagePreference}`);
      }

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

        case 'AWAITING_HUMAN_CONFIRMATION':
          await this.handleHumanConfirmation(phone, message, session);
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
      
      // Tentar responder conversacionalmente ao invés de encaminhar imediatamente
      try {
        const currentSession = sessionService.getSession(phone);
        const preferredLanguage = currentSession?.preferredLanguage || 'pt';
        const errorMessage = preferredLanguage === 'en'
          ? 'An error occurred. How can I help?'
          : 'Ocorreu um erro. Como posso ajudar?';
        const response = await aiService.generateConversationalResponse(
          errorMessage,
          currentSession?.history || [],
          currentSession?.consortiumType,
          preferredLanguage
        );
        await whatsappService.sendMessage(phone, response);
        if (currentSession) {
          sessionService.addToHistory(phone, response, 'bot');
        }
      } catch (e) {
        // Se falhar, enviar mensagem de erro genérica
        await whatsappService.sendErrorMessage(phone);
      }
      
      // Apenas notificar admin sobre erro crítico, mas não encaminhar cliente automaticamente
      // O cliente pode tentar novamente ou pedir ajuda explicitamente
      console.error('⚠️  Erro no processamento - cliente pode tentar novamente ou pedir ajuda');
    }
  }

  /**
   * Solicita confirmação antes de conectar ao consultor
   */
  async requestHumanConfirmation(phone, reason, customerData, session) {
    const preferredLanguage = session.preferredLanguage || 'pt';
    
    // Armazenar dados da solicitação para usar após confirmação
    sessionService.updateSession(phone, {
      state: 'AWAITING_HUMAN_CONFIRMATION',
      pendingHumanForward: {
        reason: reason,
        customerData: customerData
      }
    });
    
    // Enviar mensagem de confirmação
    await whatsappService.sendHumanConfirmationMessage(phone, preferredLanguage);
    sessionService.addToHistory(phone, 
      preferredLanguage === 'en' 
        ? 'Would you like to be connected to one of our specialized counselors?'
        : 'Gostaria de ser conectado a um de nossos consultores especializados?',
      'bot'
    );
  }

  /**
   * Trata resposta de confirmação para conectar ao consultor
   */
  async handleHumanConfirmation(phone, message, session) {
    const confirmation = aiService.detectConfirmation(message);
    const preferredLanguage = session.preferredLanguage || 'pt';
    
    if (confirmation === 'yes') {
      // Cliente confirmou - conectar ao consultor
      const pendingForward = session.pendingHumanForward;
      
      if (pendingForward) {
        await whatsappService.forwardToHuman(phone, pendingForward.reason, pendingForward.customerData);
        sessionService.updateSession(phone, {
          state: 'FORWARDED_TO_HUMAN',
          pendingHumanForward: null
        });
        
        const confirmMsg = preferredLanguage === 'en'
          ? '✅ Connecting you to a counselor now...'
          : '✅ Conectando você a um consultor agora...';
        sessionService.addToHistory(phone, confirmMsg, 'bot');
      } else {
        // Dados não encontrados - tratar como erro
        console.error('⚠️  Dados de encaminhamento não encontrados na sessão');
        const errorMsg = preferredLanguage === 'en'
          ? 'Sorry, there was an error. How can I help you?'
          : 'Desculpe, ocorreu um erro. Como posso ajudá-lo?';
        await whatsappService.sendMessage(phone, errorMsg);
        sessionService.addToHistory(phone, errorMsg, 'bot');
        sessionService.updateSession(phone, {
          state: 'COMPLETED',
          pendingHumanForward: null
        });
      }
    } else if (confirmation === 'no') {
      // Cliente negou - continuar com o bot
      const continueMsg = preferredLanguage === 'en'
        ? 'No problem! I\'m here to help. How can I assist you?'
        : 'Sem problema! Estou aqui para ajudar. Como posso ajudá-lo?';
      await whatsappService.sendMessage(phone, continueMsg);
      sessionService.addToHistory(phone, continueMsg, 'bot');
      
      // Voltar ao estado anterior ou estado conversacional
      const previousState = session.consortiumType ? 'COMPLETED' : 'CONVERSATIONAL';
      sessionService.updateSession(phone, {
        state: previousState,
        pendingHumanForward: null
      });
    } else {
      // Resposta não clara - pedir esclarecimento
      const clarificationMsg = preferredLanguage === 'en'
        ? '🤔 I didn\'t understand your response.\n\nPlease reply with:\n• *YES* or *SIM* to connect to a counselor\n• *NO* or *NÃO* to continue with the bot'
        : '🤔 Não entendi sua resposta.\n\nPor favor, responda com:\n• *SIM* para conectar com um consultor\n• *NÃO* para continuar com o bot';
      await whatsappService.sendMessage(phone, clarificationMsg);
      sessionService.addToHistory(phone, clarificationMsg, 'bot');
      // Manter estado AWAITING_HUMAN_CONFIRMATION
    }
  }

  /**
   * Trata estado inicial - detecta intenção e responde apropriadamente
   */
  async handleInitialState(phone, message, session) {
    // 1. Detectar intenção do usuário
    const intent = await aiService.detectUserIntent(message, session.history || []);

    if (intent === 'HUMAN_REQUEST') {
      // Cliente quer falar com humano - solicitar confirmação
      await this.requestHumanConfirmation(phone, 'Cliente solicitou atendimento humano', {
        message: message
      }, session);
      return;
    }

    if (intent === 'QUOTE_REQUEST') {
      // Cliente está explicitamente solicitando uma cotação
      const classification = await aiService.classifyConsortiumType(message);
      
      if (classification === 'OUTROS') {
        // Cotação para outros tipos - solicitar confirmação para conectar ao humano
        await this.requestHumanConfirmation(phone, 'Solicitação de cotação para tipo não automatizado', {
          message: message,
          consortiumType: classification
        }, session);
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
          state: 'AWAITING_DATA',
          originalMessage: message // Salvar mensagem original para contexto
        });

        if (classification === 'CARRO') {
          await whatsappService.requestCarData(phone, message);
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
      
      // Obter preferência de idioma da sessão
      const preferredLanguage = session.preferredLanguage || 'pt';
      
      // Gerar resposta conversacional
      const response = await aiService.generateConversationalResponse(
        message, 
        session.history || [], 
        consortiumType,
        preferredLanguage
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
      // Cliente quer falar com humano - solicitar confirmação
      await this.requestHumanConfirmation(phone, 'Cliente solicitou atendimento humano', {
        message: message,
        conversationHistory: session.history
      }, session);
      return;
    }

    if (intent === 'QUOTE_REQUEST') {
      // Cliente agora quer cotar - processar solicitação
      const classification = await aiService.classifyConsortiumType(message);
      
      if (classification === 'OUTROS') {
        // Cotação para outros tipos - solicitar confirmação para conectar ao humano
        await this.requestHumanConfirmation(phone, 'Solicitação de cotação para tipo não automatizado', {
          message: message,
          consortiumType: classification
        }, session);
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
          state: 'AWAITING_DATA',
          originalMessage: message // Salvar mensagem original para contexto
        });

        if (classification === 'CARRO') {
          await whatsappService.requestCarData(phone, message);
        } else if (classification === 'IMOVEL') {
          await whatsappService.requestPropertyData(phone);
        }
        return;
      }
    }

    // QUESTION ou OTHER - continuar conversação
    const preferredLanguage = session.preferredLanguage || 'pt';
    const response = await aiService.generateConversationalResponse(
      message, 
      session.history || [], 
      session.consortiumType,
      preferredLanguage
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
      // Cliente quer falar com humano - solicitar confirmação
      await this.requestHumanConfirmation(phone, 'Cliente solicitou atendimento humano', {
        message: message
      }, session);
      return;
    }

    // Classificar tipo com IA
    const classification = await aiService.classifyConsortiumType(message);

    if (classification === 'OUTROS') {
      // Se for pergunta sobre outros tipos, responder conversacionalmente
      if (intent === 'QUESTION' || intent === 'OTHER') {
        const preferredLanguage = session.preferredLanguage || 'pt';
        const response = await aiService.generateConversationalResponse(
          message, 
          session.history || [], 
          null,
          preferredLanguage
        );
        
        await whatsappService.sendMessage(phone, response);
        sessionService.addToHistory(phone, response, 'bot');
        sessionService.updateSession(phone, { 
          state: 'CONVERSATIONAL'
        });
        return;
      }

      // Se for solicitação explícita de cotação de outros tipos, solicitar confirmação
      await this.requestHumanConfirmation(phone, 'Consultoria/Outros', {
        message: message
      }, session);
      
      return;
    }

    // Se for pergunta sobre CARRO ou IMOVEL, responder conversacionalmente
    if (intent === 'QUESTION' || intent === 'OTHER') {
      const preferredLanguage = session.preferredLanguage || 'pt';
      const response = await aiService.generateConversationalResponse(
        message, 
        session.history || [], 
        classification,
        preferredLanguage
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
        state: 'AWAITING_DATA',
        originalMessage: message // Salvar mensagem original para contexto
      });

      if (classification === 'CARRO') {
        await whatsappService.requestCarData(phone, message);
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
    // Verificar se cliente quer falar com humano ou fechar negócio
    const intent = await aiService.detectUserIntent(message, session.history || []);
    
    if (intent === 'HUMAN_REQUEST') {
      // Cliente quer falar com humano - solicitar confirmação
      await this.requestHumanConfirmation(phone, 'Cliente solicitou atendimento humano durante coleta de dados', {
        message: message,
        consortiumType: session.consortiumType
      }, session);
      return;
    }

    // Verificar se quer fechar negócio
    const wantsToClose = await aiService.detectClosingIntent(message);
    if (wantsToClose) {
      // Cliente quer fechar negócio - solicitar confirmação para conectar ao consultor
      await this.requestHumanConfirmation(phone, 'Cliente quer prosseguir com fechamento', {
        message: message,
        consortiumType: session.consortiumType
      }, session);
      return;
    }

    // Extrair dados com IA
    const extractedData = await aiService.extractCustomerData(
      message, 
      session.consortiumType
    );

    if (!extractedData) {
      // Mensagem vaga ou não entendida - pedir esclarecimento
      await whatsappService.sendMessage(
        phone,
        '🤔 Não consegui entender completamente sua mensagem.\n\nPor favor, envie os dados no formato indicado:\n\n' +
        (session.consortiumType === 'CARRO' 
          ? 'Valor: R$ 50000\nPrazo: 60 meses\nNome: João Silva\nCPF: 123.456.789-00\nData Nascimento: 01/01/1990\nEmail: joao@email.com'
          : 'Valor: R$ 300000\nPrazo: 120 meses\nNome: Maria Silva\nCPF: 123.456.789-00\nData Nascimento: 01/01/1990\nEmail: maria@email.com')
      );
      return;
    }

    // Validar dados
    const validation = aiService.validateData(extractedData, session.consortiumType);

    if (!validation.valid) {
      if (validation.missingFields) {
        // Dados incompletos - pedir esclarecimento específico
        const msg = aiService.generateMissingFieldsMessage(
          validation.missingFields, 
          session.consortiumType
        );
        await whatsappService.sendMessage(phone, msg);
      } else if (validation.error) {
        // Erro de validação - pedir correção
        await whatsappService.sendMessage(
          phone,
          `❌ ${validation.error}\n\nPor favor, corrija e envie novamente no formato indicado.`
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
      
      // Enviar mensagem de erro e permitir que cliente tente novamente
      await whatsappService.sendMessage(
        phone,
        '❌ Ops! Ocorreu um erro ao gerar sua cotação.\n\n' +
        'Você pode:\n' +
        '• Tentar novamente enviando os dados\n' +
        '• Digitar *MENU* para começar de novo\n' +
        '• Digitar *AJUDA* se precisar de assistência'
      );
      
      // Resetar para estado inicial para permitir nova tentativa
      sessionService.updateSession(phone, { 
        state: 'INITIAL'
      });
      
      // Apenas notificar admin sobre erro, mas não encaminhar cliente automaticamente
      console.error('⚠️  Erro na geração de cotação - cliente pode tentar novamente');
    }
  }

  /**
   * Trata mensagens após cotação enviada
   */
  async handlePostQuotation(phone, message, session) {
    // PRIMEIRO: Verificar se a mensagem contém dados completos de cotação
    // Isso é crítico para capturar mensagens que seguem o formato esperado
    // mesmo que não sejam explicitamente detectadas como QUOTE_REQUEST
    const hasCompleteDataFormat = this.looksLikeCompleteQuoteData(message);
    
    if (hasCompleteDataFormat) {
      console.log('📋 Mensagem parece conter dados completos de cotação, processando...');
      
      // Tentar classificar e extrair dados
      const classification = await aiService.classifyConsortiumType(message);
      
      // Se for OUTROS (moto, etc.), solicitar confirmação para conectar ao humano
      if (classification === 'OUTROS') {
        await this.requestHumanConfirmation(
          phone, 
          'Solicitação de cotação para tipo não automatizado',
          {
            message: message,
            consortiumType: classification,
            previousQuotation: session.quotation
          },
          session
        );
        return;
      }
      
      // Se for CARRO ou IMOVEL, tentar extrair e processar
      if (classification === 'CARRO' || classification === 'IMOVEL') {
        const extractedData = await aiService.extractCustomerData(message, classification);
        if (extractedData) {
          const validation = aiService.validateData(extractedData, classification);
          if (validation.valid) {
            // Dados completos e válidos - processar como nova cotação
            console.log('✅ Dados completos detectados - processando nova cotação');
            sessionService.clearSession(phone);
            const newSession = sessionService.createSession(phone);
            newSession.consortiumType = classification;
            newSession.data = extractedData;
            newSession.state = 'PROCESSING';
            sessionService.updateSession(phone, newSession);
            
            await whatsappService.sendProcessingMessage(phone);
            await this.generateQuotation(phone, classification, extractedData);
            return;
          } else {
            // Dados extraídos mas inválidos - pedir esclarecimento
            console.log('⚠️  Dados extraídos mas inválidos:', validation);
            const preferredLanguage = session.preferredLanguage || 'pt';
            
            if (validation.missingFields) {
              // Dados incompletos - pedir campos faltantes
              const msg = aiService.generateMissingFieldsMessage(
                validation.missingFields, 
                classification
              );
              await whatsappService.sendMessage(phone, msg);
              sessionService.addToHistory(phone, msg, 'bot');
              sessionService.updateSession(phone, { 
                state: 'AWAITING_DATA',
                consortiumType: classification
              });
            } else if (validation.error) {
              // Erro de validação - pedir correção
              const errorMsg = preferredLanguage === 'en'
                ? `❌ ${validation.error}\n\nPlease correct and send again in the indicated format.`
                : `❌ ${validation.error}\n\nPor favor, corrija e envie novamente no formato indicado.`;
              await whatsappService.sendMessage(phone, errorMsg);
              sessionService.addToHistory(phone, errorMsg, 'bot');
              sessionService.updateSession(phone, { 
                state: 'AWAITING_DATA',
                consortiumType: classification
              });
            }
            return; // Não continuar para outras verificações
          }
        } else {
          // Falha na extração - pedir esclarecimento
          console.log('⚠️  Falha na extração de dados da mensagem');
          const preferredLanguage = session.preferredLanguage || 'pt';
          const clarificationMsg = preferredLanguage === 'en'
            ? '🤔 I couldn\'t fully understand your message.\n\nPlease send the data in the indicated format:\n\n' +
              (classification === 'CARRO' 
                ? 'Value: R$ 50000\nTerm: 60 months\nName: João Silva\nCPF: 123.456.789-00\nDate of Birth: 01/01/1990\nEmail: joao@email.com'
                : 'Value: R$ 300000\nTerm: 120 months\nName: Maria Silva\nCPF: 123.456.789-00\nDate of Birth: 01/01/1990\nEmail: maria@email.com')
            : '🤔 Não consegui entender completamente sua mensagem.\n\nPor favor, envie os dados no formato indicado:\n\n' +
              (classification === 'CARRO' 
                ? 'Valor: R$ 50000\nPrazo: 60 meses\nNome: João Silva\nCPF: 123.456.789-00\nData Nascimento: 01/01/1990\nEmail: joao@email.com'
                : 'Valor: R$ 300000\nPrazo: 120 meses\nNome: Maria Silva\nCPF: 123.456.789-00\nData Nascimento: 01/01/1990\nEmail: maria@email.com');
          
          await whatsappService.sendMessage(phone, clarificationMsg);
          sessionService.addToHistory(phone, clarificationMsg, 'bot');
          sessionService.updateSession(phone, { 
            state: 'AWAITING_DATA',
            consortiumType: classification
          });
          return; // Não continuar para outras verificações
        }
      }
    }

    // SEGUNDO: Detectar intenção explícita
    const intent = await aiService.detectUserIntent(message, session.history || []);

    if (intent === 'HUMAN_REQUEST') {
      // Cliente explicitamente quer falar com humano - solicitar confirmação
      await this.requestHumanConfirmation(
        phone, 
        'Cliente solicitou atendimento humano pós-cotação',
        {
          quotation: session.quotation,
          customerData: session.data,
          message: message
        },
        session
      );
      return;
    }

    if (intent === 'QUOTE_REQUEST') {
      // Cliente quer outra cotação - verificar tipo e processar
      const classification = await aiService.classifyConsortiumType(message);
      
      // Se for OUTROS (moto, etc.), solicitar confirmação para conectar ao humano
      if (classification === 'OUTROS') {
        await this.requestHumanConfirmation(
          phone, 
          'Solicitação de cotação para tipo não automatizado',
          {
            message: message,
            consortiumType: classification,
            previousQuotation: session.quotation
          },
          session
        );
        return;
      }
      
      // Se for CARRO ou IMOVEL, processar normalmente
      // Resetar sessão e processar como nova cotação
      sessionService.clearSession(phone);
      const newSession = sessionService.createSession(phone);
      await this.handleInitialState(phone, message, newSession);
      return;
    }

    // TERCEIRO: Verificar se a mensagem contém dados parciais de cotação
    // Isso ajuda a capturar mensagens como "E se fosse 50 mil?" ou "Quero outra cotação"
    const classification = await aiService.classifyConsortiumType(message);
    if (classification === 'CARRO' || classification === 'IMOVEL') {
      // Tentar extrair dados - pode ser uma solicitação de cotação não detectada
      const extractedData = await aiService.extractCustomerData(message, classification);
      if (extractedData) {
        const validation = aiService.validateData(extractedData, classification);
        if (validation.valid) {
          // É uma solicitação de cotação válida - processar
          console.log('✅ Solicitação de cotação detectada em mensagem pós-cotação');
          sessionService.clearSession(phone);
          const newSession = sessionService.createSession(phone);
          newSession.consortiumType = classification;
          newSession.data = extractedData;
          newSession.state = 'PROCESSING';
          sessionService.updateSession(phone, newSession);
          
          await whatsappService.sendProcessingMessage(phone);
          await this.generateQuotation(phone, classification, extractedData);
          return;
        } else {
          // Dados parciais mas inválidos - pedir esclarecimento ao invés de encaminhar
          console.log('⚠️  Dados parciais detectados mas inválidos:', validation);
          const preferredLanguage = session.preferredLanguage || 'pt';
          
          if (validation.missingFields) {
            const msg = aiService.generateMissingFieldsMessage(
              validation.missingFields, 
              classification
            );
            await whatsappService.sendMessage(phone, msg);
            sessionService.addToHistory(phone, msg, 'bot');
            sessionService.updateSession(phone, { 
              state: 'AWAITING_DATA',
              consortiumType: classification
            });
          } else if (validation.error) {
            const errorMsg = preferredLanguage === 'en'
              ? `❌ ${validation.error}\n\nPlease correct and send again in the indicated format.`
              : `❌ ${validation.error}\n\nPor favor, corrija e envie novamente no formato indicado.`;
            await whatsappService.sendMessage(phone, errorMsg);
            sessionService.addToHistory(phone, errorMsg, 'bot');
            sessionService.updateSession(phone, { 
              state: 'AWAITING_DATA',
              consortiumType: classification
            });
          }
          return; // Não continuar para outras verificações
        }
      }
    }

    // Perguntas - responder conversacionalmente
    if (intent === 'QUESTION' || intent === 'OTHER') {
      const preferredLanguage = session.preferredLanguage || 'pt';
      const response = await aiService.generateConversationalResponse(
        message, 
        session.history || [], 
        session.consortiumType,
        preferredLanguage
      );
      
      await whatsappService.sendMessage(phone, response);
      sessionService.addToHistory(phone, response, 'bot');
      
      // Manter estado COMPLETED mas permitir conversação
      sessionService.updateSession(phone, { 
        state: 'COMPLETED'
      });
      
      // Se mencionar fechar negócio, solicitar confirmação para conectar ao consultor
      const wantsToClose = await aiService.detectClosingIntent(message);
      if (wantsToClose) {
        await this.requestHumanConfirmation(
          phone, 
          'Cliente quer prosseguir com fechamento',
          {
            quotation: session.quotation,
            customerData: session.data
          },
          session
        );
      }
      return;
    }

    // Fallback - apenas para mensagens verdadeiramente não classificadas
    // NUNCA encaminhar para humano automaticamente - sempre tentar responder conversacionalmente
    // ou pedir esclarecimento se a mensagem for ambígua
    console.log('⚠️  Mensagem pós-cotação não classificada claramente, tentando resposta conversacional');
    const preferredLanguage = session.preferredLanguage || 'pt';
    
    // Se a mensagem parece ser uma solicitação mas não foi classificada corretamente,
    // pedir esclarecimento ao invés de apenas responder conversacionalmente
    const messageLower = message.toLowerCase();
    const mightBeQuoteRequest = 
      messageLower.includes('cotação') || 
      messageLower.includes('cotar') || 
      messageLower.includes('valor') || 
      messageLower.includes('preço') ||
      messageLower.includes('quote') ||
      /r\$\s*\d+/i.test(message) ||
      /\d+\s*(mil|milh)/i.test(message);
    
    // Verificar se intent foi definido (pode não estar se pulamos algumas verificações)
    const currentIntent = typeof intent !== 'undefined' ? intent : null;
    
    if (mightBeQuoteRequest && currentIntent !== 'QUESTION') {
      // Parece ser uma solicitação de cotação mas não foi detectada claramente
      // Pedir esclarecimento ao invés de encaminhar para humano
      const clarificationMsg = preferredLanguage === 'en'
        ? '🤔 I understand you might be requesting a quote, but I need a bit more clarity.\n\n' +
          'Could you please:\n' +
          '• Specify if you want a quote for a car or property consortium\n' +
          '• Or send the complete data in the format:\n\n' +
          'Value: R$ 50000\nTerm: 60 months\nName: João Silva\nCPF: 123.456.789-00\nDate of Birth: 01/01/1990\nEmail: joao@email.com'
        : '🤔 Entendo que você pode estar solicitando uma cotação, mas preciso de um pouco mais de clareza.\n\n' +
          'Você poderia, por favor:\n' +
          '• Especificar se deseja cotação de consórcio de carro ou imóvel\n' +
          '• Ou enviar os dados completos no formato:\n\n' +
          'Valor: R$ 50000\nPrazo: 60 meses\nNome: João Silva\nCPF: 123.456.789-00\nData Nascimento: 01/01/1990\nEmail: joao@email.com';
      
      await whatsappService.sendMessage(phone, clarificationMsg);
      sessionService.addToHistory(phone, clarificationMsg, 'bot');
      sessionService.updateSession(phone, { 
        state: 'COMPLETED' // Manter estado COMPLETED mas permitir nova cotação
      });
      return;
    }
    
    // Caso contrário, responder conversacionalmente
    const response = await aiService.generateConversationalResponse(
      message, 
      session.history || [], 
      session.consortiumType,
      preferredLanguage
    );
    
    await whatsappService.sendMessage(phone, response);
    sessionService.addToHistory(phone, response, 'bot');
    sessionService.updateSession(phone, { 
      state: 'COMPLETED'
    });
  }

  /**
   * Verifica se a mensagem parece conter dados completos de cotação
   * Baseado no formato esperado: Valor, Prazo, Nome, CPF, Data Nascimento, Email
   */
  looksLikeCompleteQuoteData(message) {
    const messageUpper = message.toUpperCase();
    
    // Verificar se contém os campos principais no formato esperado
    const hasValor = /VALOR\s*:?\s*R?\$?\s*\d+/i.test(message);
    const hasPrazo = /PRAZO\s*:?\s*\d+\s*(MES|MESES|M)/i.test(message);
    const hasNome = /NOME\s*:?/i.test(message);
    const hasCPF = /CPF\s*:?/i.test(message);
    const hasDataNascimento = /(DATA\s*NASCIMENTO|DATA\s*DE\s*NASCIMENTO)\s*:?/i.test(message);
    const hasEmail = /EMAIL\s*:?/i.test(message) || /@/.test(message);
    
    // Se tiver pelo menos 4 dos 6 campos principais, provavelmente é dados de cotação
    const fieldCount = [hasValor, hasPrazo, hasNome, hasCPF, hasDataNascimento, hasEmail].filter(Boolean).length;
    
    // Requer pelo menos valor, prazo e mais 2 campos
    return hasValor && hasPrazo && fieldCount >= 4;
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
