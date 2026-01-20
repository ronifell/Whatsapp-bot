import axios from 'axios';
import { config } from '../config/config.js';
import messageBus from './message-bus.service.js';

/**
 * Serviço de integração com Z-API para WhatsApp
 * Também suporta modo frontend (para desenvolvimento/teste)
 */
class WhatsAppService {
  constructor() {
    this.baseUrl = config.zapi.baseUrl;
    this.instanceId = config.zapi.instanceId;
    this.token = config.zapi.token;
    this.apiUrl = `${this.baseUrl}/instances/${this.instanceId}/token/${this.token}`;
  }

  /**
   * Verifica se está em modo de teste
   */
  isTestMode() {
    return process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test';
  }

  /**
   * Verifica se está em modo frontend (para desenvolvimento)
   */
  isFrontendMode() {
    return messageBus.isFrontendMode();
  }

  /**
   * Verifica se o phone é de um usuário frontend
   */
  isFrontendUser(phone) {
    return phone && (phone.startsWith('frontend-') || this.isFrontendMode());
  }

  /**
   * Envia uma mensagem de texto para um número
   */
  async sendMessage(phone, message) {
    try {
      // Modo frontend: enviar para message bus
      if (this.isFrontendUser(phone)) {
        messageBus.addMessage(phone, message, 'bot');
        console.log(`📱 [FRONTEND MODE] Mensagem enviada para ${phone}`);
        return { success: true, frontendMode: true };
      }

      // Modo de teste: apenas logar, não enviar realmente
      if (this.isTestMode()) {
        console.log('\n📱 [MODO TESTE] Mensagem que seria enviada:');
        console.log(`   Para: ${phone}`);
        console.log(`   Mensagem:\n${message}\n`);
        console.log('─'.repeat(60));
        return { success: true, testMode: true };
      }

      const response = await axios.post(`${this.apiUrl}/send-text`, {
        phone: phone,
        message: message
      });
      
      console.log(`✅ Mensagem enviada para ${phone}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Envia uma mensagem com link (cotação)
   */
  async sendMessageWithLink(phone, message) {
    try {
      // Modo frontend: enviar para message bus
      if (this.isFrontendUser(phone)) {
        messageBus.addMessage(phone, message, 'bot');
        console.log(`📱 [FRONTEND MODE] Mensagem com link enviada para ${phone}`);
        return { success: true, frontendMode: true };
      }

      // Modo de teste: apenas logar, não enviar realmente
      if (this.isTestMode()) {
        console.log('\n📱 [MODO TESTE] Mensagem com link que seria enviada:');
        console.log(`   Para: ${phone}`);
        console.log(`   Mensagem:\n${message}\n`);
        console.log('─'.repeat(60));
        return { success: true, testMode: true };
      }

      const response = await axios.post(`${this.apiUrl}/send-text`, {
        phone: phone,
        message: message
      });
      
      console.log(`✅ Mensagem com link enviada para ${phone}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Envia arquivo/documento
   */
  async sendDocument(phone, documentUrl, fileName) {
    try {
      // Modo frontend: enviar mensagem sobre o documento
      if (this.isFrontendUser(phone)) {
        const message = `📄 Documento: ${fileName}\n${documentUrl}`;
        messageBus.addMessage(phone, message, 'bot');
        console.log(`📱 [FRONTEND MODE] Documento enviado para ${phone}`);
        return { success: true, frontendMode: true };
      }

      // Modo de teste: apenas logar, não enviar realmente
      if (this.isTestMode()) {
        console.log('\n📱 [MODO TESTE] Documento que seria enviado:');
        console.log(`   Para: ${phone}`);
        console.log(`   Arquivo: ${fileName}`);
        console.log(`   URL: ${documentUrl}\n`);
        console.log('─'.repeat(60));
        return { success: true, testMode: true };
      }

      const response = await axios.post(`${this.apiUrl}/send-document`, {
        phone: phone,
        document: documentUrl,
        fileName: fileName
      });
      
      console.log(`✅ Documento enviado para ${phone}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar documento:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Envia imagem
   */
  async sendImage(phone, imageUrl, caption = '') {
    try {
      // Modo frontend: enviar mensagem sobre a imagem
      if (this.isFrontendUser(phone)) {
        const message = caption ? `🖼️ ${caption}\n${imageUrl}` : `🖼️ Imagem: ${imageUrl}`;
        messageBus.addMessage(phone, message, 'bot');
        console.log(`📱 [FRONTEND MODE] Imagem enviada para ${phone}`);
        return { success: true, frontendMode: true };
      }

      // Modo de teste: apenas logar, não enviar realmente
      if (this.isTestMode()) {
        console.log('\n📱 [MODO TESTE] Imagem que seria enviada:');
        console.log(`   Para: ${phone}`);
        console.log(`   URL: ${imageUrl}`);
        console.log(`   Legenda: ${caption}\n`);
        console.log('─'.repeat(60));
        return { success: true, testMode: true };
      }

      const response = await axios.post(`${this.apiUrl}/send-image`, {
        phone: phone,
        image: imageUrl,
        caption: caption
      });
      
      console.log(`✅ Imagem enviada para ${phone}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar imagem:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Configura webhook para receber mensagens
   */
  async setWebhook(webhookUrl) {
    try {
      // Modo de teste: apenas logar, não configurar realmente
      if (this.isTestMode()) {
        console.log('\n📱 [MODO TESTE] Webhook que seria configurado:');
        console.log(`   URL: ${webhookUrl}\n`);
        console.log('─'.repeat(60));
        return { success: true, testMode: true };
      }

      const response = await axios.post(`${this.apiUrl}/update-webhook`, {
        webhook: webhookUrl
      });
      
      console.log('✅ Webhook configurado');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao configurar webhook:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Envia mensagem de boas-vindas inicial
   */
  async sendWelcomeMessage(phone) {
    const message = `Olá! 👋

Bem-vindo ao *CotaFácil Alphaville*!

Sou seu assistente virtual e estou aqui para ajudar com tudo sobre consórcio.

Posso responder suas dúvidas sobre consórcio de automóvel, imóvel, ou outros tipos. E quando você estiver pronto, também posso gerar uma cotação personalizada para você.

Como posso te ajudar hoje? 😊`;

    return this.sendMessage(phone, message);
  }

  /**
   * Solicita dados do cliente para automóvel/veículo
   * @param {string} phone - Número do telefone
   * @param {string} originalMessage - Mensagem original do cliente (opcional, para detectar tipo específico)
   */
  async requestCarData(phone, originalMessage = '') {
    // Detectar se é moto ou carro baseado na mensagem original
    const isMotorcycle = originalMessage && /moto|motorcycle|motocicleta/i.test(originalMessage);
    const vehicleType = isMotorcycle ? 'Moto' : 'Veículo';
    const emoji = isMotorcycle ? '🏍️' : '🚗';
    const consortiumType = isMotorcycle ? 'Consórcio de Moto' : 'Consórcio de Automóvel';
    
    const message = `${emoji} *${consortiumType}*

Para gerar sua cotação, preciso das seguintes informações:

1. *Valor do ${vehicleType.toLowerCase()}* (em R$)
2. *Prazo desejado* (em meses)
3. *Nome completo*
4. *CPF*
5. *Data de nascimento*
6. *E-mail*

Por favor, envie as informações neste formato:

Valor: R$ 50000
Prazo: 60 meses
Nome: João Silva
CPF: 123.456.789-00
Data Nascimento: 01/01/1990
Email: joao@email.com`;

    return this.sendMessage(phone, message);
  }

  /**
   * Solicita dados do cliente para imóvel
   */
  async requestPropertyData(phone) {
    const message = `🏠 *Consórcio de Imóvel*

Para gerar sua cotação, preciso das seguintes informações:

1. *Valor do imóvel* (em R$)
2. *Prazo desejado* (em meses: 80, 100, 120, 150, 180, 200)
3. *Nome completo*
4. *CPF*
5. *Data de nascimento*
6. *E-mail*

Por favor, envie as informações neste formato:

Valor: R$ 300000
Prazo: 120 meses
Nome: Maria Silva
CPF: 123.456.789-00
Data Nascimento: 01/01/1990
Email: maria@email.com`;

    return this.sendMessage(phone, message);
  }

  /**
   * Envia mensagem de processamento
   */
  async sendProcessingMessage(phone) {
    const message = `⏳ *Processando sua cotação...*

Estou gerando sua cotação personalizada. 
Isso pode levar alguns instantes.

Por favor, aguarde... 🤖`;

    return this.sendMessage(phone, message);
  }

  /**
   * Envia cotação ao cliente
   */
  async sendQuotation(phone, quotationData) {
    const message = `✅ *Cotação Gerada com Sucesso!*

📋 *Detalhes da Cotação:*

*Tipo:* ${quotationData.type}
*Valor do Bem:* R$ ${quotationData.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
*Prazo:* ${quotationData.months} meses
*Parcela Mensal:* R$ ${quotationData.monthlyPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
*Taxa de Administração:* ${quotationData.adminFee}%

${quotationData.details || ''}

---

*Gostou da cotação?*

Para *prosseguir com o fechamento*, digite: *FECHAR*

Precisa de ajuda? Digite: *AJUDA*`;

    return this.sendMessage(phone, message);
  }

  /**
   * Encaminha para atendimento humano
   */
  /**
   * Envia mensagem de confirmação antes de conectar ao consultor
   */
  async sendHumanConfirmationMessage(phone, preferredLanguage = 'pt') {
    const message = preferredLanguage === 'en'
      ? `👨‍💼 *Connect to a Counselor?*

Would you like to be connected to one of our specialized counselors?

They can help you with:
• Detailed consultations
• Complex questions
• Closing your deal
• Personalized assistance

Please reply with:
• *YES* or *SIM* to connect
• *NO* or *NÃO* to continue with the bot

How would you like to proceed?`
      : `👨‍💼 *Conectar com um Consultor?*

Gostaria de ser conectado a um de nossos consultores especializados?

Eles podem ajudá-lo com:
• Consultorias detalhadas
• Dúvidas complexas
• Fechamento do seu negócio
• Atendimento personalizado

Por favor, responda com:
• *SIM* para conectar
• *NÃO* para continuar com o bot

Como deseja prosseguir?`;

    return this.sendMessage(phone, message);
  }

  async forwardToHuman(phone, reason, customerData) {
    const adminNumber = config.whatsapp.adminNumber;
    
    const messageToAdmin = `🔔 *Novo Atendimento Humano Necessário*

*Motivo:* ${reason}
*Cliente:* ${phone}
*Nome:* ${customerData.name || 'Não informado'}

*Dados do Cliente:*
${JSON.stringify(customerData, null, 2)}

---
Por favor, entre em contato com o cliente.`;

    // Only send to admin if not a frontend user (frontend users are for testing)
    // In frontend mode, just log the notification
    if (this.isFrontendUser(phone)) {
      console.log('📢 [FRONTEND MODE] Notificação de atendimento humano:');
      console.log(messageToAdmin);
    } else {
      await this.sendMessage(adminNumber, messageToAdmin);
    }

    const messageToCustomer = `👨‍💼 *Encaminhando para Atendimento Especializado*

Sua solicitação foi encaminhada para um de nossos consultores.
Em breve você será contatado para dar continuidade ao atendimento.

Obrigado pela preferência! 😊`;

    return this.sendMessage(phone, messageToCustomer);
  }

  /**
   * Envia mensagem de erro
   */
  async sendErrorMessage(phone) {
    const message = `❌ *Ops! Algo deu errado*

Desculpe, ocorreu um erro ao processar sua solicitação.

Um atendente será notificado e entrará em contato em breve.

Ou você pode tentar novamente digitando *MENU* para voltar ao início.`;

    return this.sendMessage(phone, message);
  }
}

export default new WhatsAppService();
