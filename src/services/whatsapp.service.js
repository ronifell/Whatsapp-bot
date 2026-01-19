import axios from 'axios';
import { config } from '../config/config.js';

/**
 * Serviço de integração com Z-API para WhatsApp
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
   * Envia uma mensagem de texto para um número
   */
  async sendMessage(phone, message) {
    try {
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

Aqui você pode fazer cotações de consórcio de forma rápida e automática. 

Por favor, me informe qual tipo de consórcio você deseja cotar:

1️⃣ *Consórcio de Automóvel*
2️⃣ *Consórcio de Imóvel*
3️⃣ *Consultoria/Outros*

Digite o número da opção ou descreva sua necessidade.`;

    return this.sendMessage(phone, message);
  }

  /**
   * Solicita dados do cliente para automóvel
   */
  async requestCarData(phone) {
    const message = `🚗 *Consórcio de Automóvel*

Para gerar sua cotação, preciso das seguintes informações:

1. *Valor do veículo* (em R$)
2. *Prazo desejado* (em meses: 24, 36, 48, 60, 72, 80)
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

    await this.sendMessage(adminNumber, messageToAdmin);

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
