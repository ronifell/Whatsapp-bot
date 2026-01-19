import whatsappService from './whatsapp.service.js';
import aiService from './ai.service.js';
import canopusRPA from './canopus-rpa.service.js';
import sessionService from './session.service.js';

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

      // Fluxo baseado no estado da sessão
      switch (session.state) {
        case 'INITIAL':
          await this.handleInitialState(phone, message, session);
          break;

        case 'AWAITING_TYPE':
          await this.handleTypeSelection(phone, message, session);
          break;

        case 'AWAITING_DATA':
          await this.handleDataCollection(phone, message, session);
          break;

        case 'COMPLETED':
          await this.handlePostQuotation(phone, message, session);
          break;

        default:
          await whatsappService.sendWelcomeMessage(phone);
          sessionService.updateSession(phone, { state: 'AWAITING_TYPE' });
      }

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      await whatsappService.sendErrorMessage(phone);
      
      // Notificar admin sobre erro
      await whatsappService.forwardToHuman(phone, 'Erro no processamento', {
        error: error.message,
        message: message
      });
    }
  }

  /**
   * Trata estado inicial - envia boas-vindas
   */
  async handleInitialState(phone, message, session) {
    await whatsappService.sendWelcomeMessage(phone);
    sessionService.updateSession(phone, { state: 'AWAITING_TYPE' });
  }

  /**
   * Trata seleção do tipo de consórcio
   */
  async handleTypeSelection(phone, message, session) {
    // Classificar tipo com IA
    const classification = await aiService.classifyConsortiumType(message);

    if (classification === 'OUTROS') {
      // Encaminhar para humano
      await whatsappService.forwardToHuman(phone, 'Consultoria/Outros', {
        message: message
      });
      
      sessionService.updateSession(phone, { 
        state: 'COMPLETED',
        consortiumType: 'OUTROS'
      });
      
      return;
    }

    // Atualizar sessão com tipo
    sessionService.updateSession(phone, {
      consortiumType: classification,
      state: 'AWAITING_DATA'
    });

    // Solicitar dados conforme o tipo
    if (classification === 'CARRO') {
      await whatsappService.requestCarData(phone);
    } else if (classification === 'IMOVEL') {
      await whatsappService.requestPropertyData(phone);
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
   * Gera cotação usando RPA
   */
  async generateQuotation(phone, consortiumType, data) {
    try {
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

      console.log('✅ Cotação enviada com sucesso!');

    } catch (error) {
      console.error('❌ Erro ao gerar cotação:', error);
      
      await canopusRPA.close();
      
      await whatsappService.sendErrorMessage(phone);
      
      // Encaminhar para humano
      await whatsappService.forwardToHuman(phone, 'Erro na geração de cotação', {
        error: error.message,
        data: data
      });

      sessionService.updateSession(phone, { state: 'COMPLETED' });
    }
  }

  /**
   * Trata mensagens após cotação enviada
   */
  async handlePostQuotation(phone, message, session) {
    // Detectar intenção de fechar negócio
    const wantsToClose = await aiService.detectClosingIntent(message);

    if (wantsToClose) {
      // Encaminhar para atendimento humano
      await whatsappService.forwardToHuman(
        phone, 
        'Cliente quer prosseguir com fechamento',
        {
          quotation: session.quotation,
          customerData: session.data
        }
      );
    } else {
      // Qualquer outra dúvida, encaminhar para humano
      await whatsappService.forwardToHuman(
        phone,
        'Cliente com dúvidas pós-cotação',
        {
          message: message,
          quotation: session.quotation
        }
      );
    }

    // Limpar sessão
    sessionService.clearSession(phone);
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
