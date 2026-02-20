import axios from 'axios';
import { config } from '../config/config.js';
import messageBus from './message-bus.service.js';
import businessHoursService from './business-hours.service.js';

/**
 * Serviço de integração com Z-API para WhatsApp
 * Também suporta modo frontend (para desenvolvimento/teste)
 */
class WhatsAppService {
  constructor() {
    this.baseUrl = config.zapi.baseUrl;
    this.instanceId = config.zapi.instanceId;
    this.token = config.zapi.token;
    this.clientToken = config.zapi.clientToken; // Client-Token (se configurado)
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
   * Apenas números que começam com 'frontend-' são tratados como frontend
   */
  isFrontendUser(phone) {
    return phone && phone.startsWith('frontend-');
  }

  /**
   * Valida se o Client-Token é válido (deve ser diferente do token regular)
   */
  isValidClientToken() {
    return this.clientToken && 
           this.clientToken !== this.token && 
           this.clientToken.trim().length > 0;
  }

  /**
   * Faz uma requisição POST para a API Z-API com tratamento de Client-Token
   * A instância Z-API pode exigir Client-Token configurado no painel
   */
  async makeApiRequest(endpoint, data, options = {}) {
    const isValidClientToken = this.isValidClientToken();
    
    // Preparar headers (adicionar Client-Token apenas se válido)
    const requestConfig = { ...options };
    if (isValidClientToken) {
      if (!requestConfig.headers) {
        requestConfig.headers = {};
      }
      requestConfig.headers['Client-Token'] = this.clientToken;
    }
    
    try {
      const response = await axios.post(`${this.apiUrl}/${endpoint}`, data, requestConfig);
      return response;
    } catch (error) {
      // Verificar se o erro é relacionado a Client-Token
      const isClientTokenError = error.response?.data?.error?.includes('client-token is not configured') || 
                                 error.response?.data?.error?.includes('client-token');
      
      if (isClientTokenError) {
        // Se estávamos usando Client-Token mas ainda deu erro, pode ser que:
        // 1. O Client-Token no .env não corresponde ao configurado no painel
        // 2. O Client-Token não está configurado no painel Z-API
        if (isValidClientToken) {
          console.error('\n❌ ERRO: Client-Token configurado no .env mas não reconhecido pela API Z-API');
          console.error('📋 POSSÍVEIS CAUSAS:');
          console.error('   1. O Client-Token no .env não corresponde ao configurado no painel Z-API');
          console.error('   2. O Client-Token não foi configurado no painel Z-API');
          console.error('   3. O Client-Token foi configurado incorretamente no painel\n');
        } else {
          // Client-Token não está configurado no .env
          console.error('\n❌ ERRO: Esta instância Z-API exige Client-Token configurado');
        }
        
        this.logClientTokenInstructions();
        
        // Não tentar retry - se a API exige Client-Token, não vai funcionar sem ele
        throw error;
      }
      
      // Outro tipo de erro, apenas lançar
      throw error;
    }
  }

  /**
   * Exibe instruções para configurar o Client-Token
   */
  logClientTokenInstructions() {
    console.error('\n⚠️  ERRO: Client-Token não configurado corretamente no Z-API');
    console.error('📋 SOLUÇÃO PASSO A PASSO:');
    console.error('');
    console.error('   PASSO 1: Configure no Painel Z-API');
    console.error('   1. Acesse: https://www.z-api.io');
    console.error('   2. Faça login na sua conta');
    console.error('   3. Vá até a sua instância (ID: ' + (this.instanceId || 'N/A') + ')');
    console.error('   4. Procure por "Client-Token" ou "Token de Cliente" nas configurações');
    console.error('   5. Configure um Client-Token (pode gerar um novo ou usar um existente)');
    console.error('   6. ANOTE o valor do Client-Token configurado');
    console.error('');
    console.error('   PASSO 2: Configure no arquivo .env');
    console.error('   7. Abra o arquivo .env na raiz do projeto');
    console.error('   8. Adicione ou atualize a linha:');
    console.error('      ZAPI_CLIENT_TOKEN=valor_do_client_token_do_painel');
    console.error('   9. Certifique-se de que o Client-Token é DIFERENTE do ZAPI_TOKEN');
    console.error('   10. Salve o arquivo .env');
    console.error('');
    console.error('   PASSO 3: Reinicie o servidor');
    console.error('   11. Pare o servidor (Ctrl+C)');
    console.error('   12. Execute: npm start');
    console.error('');
    console.error('💡 DICA: O Client-Token é um token de segurança adicional');
    console.error('   Ele deve ser configurado PRIMEIRO no painel Z-API,');
    console.error('   e depois adicionado no .env com o MESMO valor.\n');
  }

  /**
   * Envia uma mensagem de texto para um número
   */
  async sendMessage(phone, message) {
    try {
      const timestamp = new Date().toLocaleString('pt-BR');
      
      // Modo frontend: enviar para message bus
      if (this.isFrontendUser(phone)) {
        messageBus.addMessage(phone, message, 'bot');
        console.log(`📱 [FRONTEND MODE] Mensagem enviada para ${phone}`);
        return { success: true, frontendMode: true };
      }

      // Modo de teste: apenas logar, não enviar realmente
      if (this.isTestMode()) {
        console.log('\n' + '═'.repeat(70));
        console.log(`📤 [MODO TESTE] Mensagem que seria enviada [${timestamp}]`);
        console.log('─'.repeat(70));
        console.log(`👤 Para: ${phone}`);
        console.log(`💬 Mensagem:\n${message}\n`);
        console.log('═'.repeat(70) + '\n');
        return { success: true, testMode: true };
      }

      // Log formatado antes de enviar
      console.log('\n' + '═'.repeat(70));
      console.log(`📤 MENSAGEM ENVIADA [${timestamp}]`);
      console.log('─'.repeat(70));
      console.log(`👤 Para: ${phone}`);
      console.log(`💬 Mensagem:\n${message}`);
      console.log('═'.repeat(70) + '\n');

      // Log da URL e token para debug (sem expor o token completo)
      console.log(`🔍 Debug: API URL: ${this.apiUrl}/send-text`);
      console.log(`🔍 Debug: Token configurado: ${this.token ? this.token.substring(0, 8) + '...' : 'NÃO CONFIGURADO'}`);
      const hasValidClientToken = this.isValidClientToken();
      console.log(`🔍 Debug: Client-Token configurado: ${hasValidClientToken ? 'SIM' : 'NÃO'}`);
      if (this.clientToken && !hasValidClientToken) {
        console.warn('⚠️  AVISO: Client-Token no .env é inválido (igual ao token regular ou vazio)');
        console.warn('   A instância Z-API pode exigir Client-Token configurado no painel');
      } else if (!this.clientToken) {
        console.warn('⚠️  AVISO: Client-Token não configurado no .env');
        console.warn('   Se a instância Z-API exigir Client-Token, configure-o no painel e no .env');
      }
      
      const response = await this.makeApiRequest('send-text', {
        phone: phone,
        message: message
      });
      
      console.log(`✅ Mensagem enviada com sucesso para ${phone}\n`);
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
      const timestamp = new Date().toLocaleString('pt-BR');
      
      // Modo frontend: enviar para message bus
      if (this.isFrontendUser(phone)) {
        messageBus.addMessage(phone, message, 'bot');
        console.log(`📱 [FRONTEND MODE] Mensagem com link enviada para ${phone}`);
        return { success: true, frontendMode: true };
      }

      // Modo de teste: apenas logar, não enviar realmente
      if (this.isTestMode()) {
        console.log('\n' + '═'.repeat(70));
        console.log(`📤 [MODO TESTE] Mensagem com link que seria enviada [${timestamp}]`);
        console.log('─'.repeat(70));
        console.log(`👤 Para: ${phone}`);
        console.log(`💬 Mensagem:\n${message}\n`);
        console.log('═'.repeat(70) + '\n');
        return { success: true, testMode: true };
      }

      // Log formatado antes de enviar
      console.log('\n' + '═'.repeat(70));
      console.log(`📤 MENSAGEM COM LINK ENVIADA [${timestamp}]`);
      console.log('─'.repeat(70));
      console.log(`👤 Para: ${phone}`);
      console.log(`💬 Mensagem:\n${message}`);
      console.log('═'.repeat(70) + '\n');

      const response = await this.makeApiRequest('send-text', {
        phone: phone,
        message: message
      });
      
      console.log(`✅ Mensagem com link enviada com sucesso para ${phone}\n`);
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

      const response = await this.makeApiRequest('send-document', {
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

      const response = await this.makeApiRequest('send-image', {
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

      const response = await axios.post(`${this.apiUrl}/set-webhook`, {
        value: webhookUrl
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
   * Envia mensagem inicial com opções de consórcio (primeira mensagem do cliente)
   */
  async sendFirstMessageWithOptions(phone) {
    const message = `Oi! 👋 Sou o Bot da CotaFácil Alphaville. Eu faço sua simulação completa e já te devolvo cotação.

Você quer consórcio de:

1. 🚗 Carro

2. 🏠 Imóvel

3. 🔧 Serviços (reforma, placas solares etc.)

4. ❓ Não sei ainda

Vai para OBJETIVO`;

    return this.sendMessage(phone, message);
  }

  /**
   * Envia apenas as opções de tipos de consórcio (sem introdução completa)
   * Usado quando cliente pergunta sobre orçamento/cotação durante a conversa
   * @param {string} phone - Número do telefone
   * @param {string} preferredLanguage - Idioma preferido ('pt' ou 'en')
   */
  async sendConsortiumTypeOptions(phone, preferredLanguage = 'pt') {
    const message = preferredLanguage === 'en'
      ? `You want consortium for:

1. 🚗 Car

2. 🏠 Property

3. 🔧 Services (renovation, solar panels, etc.)

4. ❓ I don't know yet

See you for the OBJETIVO`
      : `Você quer consórcio de:

1. 🚗 Carro

2. 🏠 Imóvel

3. 🔧 Serviços (reforma, placas solares etc.)

4. ❓ Não sei ainda`;

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
   * Envia mensagem amigável informando que o scraping levará 5-10 minutos
   */
  async sendScrapingWaitMessage(phone) {
    const message = `⏳ *Gerando sua cotação personalizada...* 😊

Estou coletando os dados mais atualizados para você!
Este processo leva de 5 a 10 minutos para garantir que você receba informações precisas e atualizadas.

Por favor, aguarde um momento enquanto preparo sua cotação... ⏱️✨`;

    return this.sendMessage(phone, message);
  }

  /**
   * Formata valor em "mil" quando apropriado
   */
  formatValueInMil(value) {
    if (value >= 1000000) {
      const milhoes = (value / 1000000).toFixed(1);
      return milhoes.endsWith('.0') ? `${milhoes.replace('.0', '')} milhões` : `${milhoes} milhões`;
    } else if (value >= 1000) {
      const mil = (value / 1000).toFixed(0);
      return `${mil} mil`;
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /**
   * Calcula taxa aproximada baseada na primeira parcela e prazo
   */
  calculateTaxRate(primeiraParcela, valor, prazo) {
    if (!primeiraParcela || !valor || !prazo) {
      return null;
    }
    const totalPago = primeiraParcela * prazo;
    const taxa = ((totalPago - valor) / valor) * 100;
    return taxa.toFixed(2);
  }

  /**
   * Envia cotação ao cliente
   */
  async sendQuotation(phone, quotationData) {
    const timestamp = new Date().toLocaleString('pt-BR');
    
    // Verificar se é match exato ou similar
    const isExactMatch = quotationData.isExactMatch !== false; // Default true se não especificado
    
    // Formatar mensagem com todos os campos exatamente como aparecem nos dados
    // rawData é o objeto row completo do JSON
    const row = quotationData.rawData || {};
    const requestedValue = quotationData.requestedValue || 0;
    const requestedTerm = quotationData.requestedTerm || 0;
    
    // Extrair valores numéricos
    const planValue = parseFloat((row['VALOR'] || '').replace(/[^\d,]/g, '').replace(',', '.'));
    const planTerm = parseInt((row['PRAZO'] || '').replace(/\D/g, ''));
    const primeiraParcela = parseFloat((row['1ª PARCELA'] || '').replace(/[^\d,]/g, '').replace(',', '.'));
    
    // Calcular taxa
    const taxa = this.calculateTaxRate(primeiraParcela, planValue, planTerm);
    const taxaText = taxa ? `${taxa}%` : 'N/A';
    
    // Formatar valor para mensagem
    const valorFormatado = row['VALOR'] || 'N/A';
    const valorEmMil = planValue ? this.formatValueInMil(planValue) : 'N/A';
    
    let message = '';
    
    if (isExactMatch) {
      // Match exato - mensagem simples
      message = `✅ *Cotação Gerada com Sucesso!*

📋 *Detalhes da Cotação:*

*Valor da carta:* ${valorFormatado}
*Prazo:* ${planTerm || row['PRAZO'] || 'N/A'} meses
*Parcela:* ${row['1ª PARCELA'] || 'N/A'}
*Taxa:* ${taxaText}

---

*Gostou da cotação?*

Para *prosseguir com o fechamento*, digite: *FECHAR*

Precisa de ajuda? Digite: *AJUDA*`;
    } else {
      // Não é match exato - usar formato solicitado
      message = `A proposta mais próxima disponível é de ${valorEmMil}.

Segue a simulação para você ter uma referência:

*Valor da carta:* ${valorFormatado}
*Prazo:* ${planTerm || row['PRAZO'] || 'N/A'} meses
*Parcela:* ${row['1ª PARCELA'] || 'N/A'}
*Taxa:* ${taxaText}

Peço desculpas pela diferença.

Você prefere:
1️⃣ Ajustar o valor da carta
2️⃣ Falar com um consultor`;
    }

    // Log especial para cotações
    if (!this.isFrontendUser(phone) && !this.isTestMode()) {
      console.log('\n' + '═'.repeat(70));
      console.log(`💰 COTAÇÃO ENVIADA [${timestamp}]`);
      console.log('─'.repeat(70));
      const row = quotationData.rawData || {};
      console.log(`👤 Para: ${phone}`);
      console.log(`📊 NOME DO BEM: ${row['NOME DO BEM'] || 'N/A'}`);
      console.log(`💵 VALOR: ${row['VALOR'] || 'N/A'}`);
      console.log(`📅 PRAZO: ${row['PRAZO'] || 'N/A'} meses`);
      console.log(`💳 1ª PARCELA: ${row['1ª PARCELA'] || 'N/A'}`);
      console.log(`📋 PLANO: ${row['PLANO'] || 'N/A'}`);
      console.log(`🏷️  TIPO DE VENDA: ${row['TIPO DE VENDA'] || 'N/A'}`);
      console.log(`✅ Match Exato: ${isExactMatch ? 'SIM' : 'NÃO'}`);
      if (!isExactMatch) {
        console.log(`📈 Plano Maior Disponível: ${hasHigherValue ? 'SIM' : 'NÃO'}`);
        console.log(`📉 Plano Menor Disponível: ${hasLowerValue ? 'SIM' : 'NÃO'}`);
      }
      console.log('═'.repeat(70) + '\n');
    }

    return this.sendMessage(phone, message);
  }
  
  /**
   * Envia cotação alternativa (maior ou menor)
   */
  async sendAlternativeQuotation(phone, alternativePlan, type, requestedValue, requestedTerm) {
    const row = alternativePlan || {};
    const planValue = parseFloat((row['VALOR'] || '').replace(/[^\d,]/g, '').replace(',', '.'));
    
    const typeText = type === 'higher' ? 'maior' : 'menor';
    const diffPercent = ((planValue - requestedValue) / requestedValue * 100).toFixed(1);
    const diffText = type === 'higher' 
      ? `(${diffPercent}% acima do solicitado)`
      : `(${Math.abs(diffPercent)}% abaixo do solicitado)`;
    
    const message = `📋 *Cotação com Valor ${typeText.charAt(0).toUpperCase() + typeText.slice(1)}:*

*NOME DO BEM:* ${row['NOME DO BEM'] || 'N/A'}
*VALOR:* ${row['VALOR'] || 'N/A'} ${diffText}
*PRAZO:* ${row['PRAZO'] || 'N/A'} meses
*1ª PARCELA:* ${row['1ª PARCELA'] || 'N/A'}
*PLANO:* ${row['PLANO'] || 'N/A'}
*TIPO DE VENDA:* ${row['TIPO DE VENDA'] || 'N/A'}

---

*O que deseja fazer?*

• Digite *FECHAR* para prosseguir com esta cotação
• Digite *CONSULTOR* para falar com um consultor
• Digite *AJUDA* se precisar de ajuda`;

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

  async forwardToHuman(phone, reason, customerData, preferredLanguage = 'pt') {
    const adminNumber = config.whatsapp.adminNumber;
    
    // Log para debug - mostrar qual número será usado
    console.log(`\n🔍 [DEBUG] Encaminhando cliente ${phone} para consultor`);
    console.log(`   Número do consultor configurado: ${adminNumber || 'NÃO CONFIGURADO'}`);
    
    // Formatar dados do cliente de forma mais legível
    let customerInfo = '';
    if (customerData.name && customerData.name !== 'Não informado') {
      customerInfo += `*Nome:* ${customerData.name}\n`;
    }
    if (customerData.email) {
      customerInfo += `*E-mail:* ${customerData.email}\n`;
    }
    if (customerData.cpf) {
      customerInfo += `*CPF:* ${customerData.cpf}\n`;
    }
    if (customerData.consortiumType) {
      customerInfo += `*Tipo de Consórcio:* ${customerData.consortiumType}\n`;
    }
    if (customerData.message) {
      customerInfo += `\n*Mensagem do Cliente:*\n${customerData.message}\n`;
    }
    
    // Se houver outros dados, adicionar como JSON
    const otherData = { ...customerData };
    delete otherData.name;
    delete otherData.email;
    delete otherData.cpf;
    delete otherData.consortiumType;
    delete otherData.message;
    
    if (Object.keys(otherData).length > 0) {
      customerInfo += `\n*Outros Dados:*\n\`\`\`\n${JSON.stringify(otherData, null, 2)}\n\`\`\``;
    }

    const messageToAdmin = `🔔 *Novo Atendimento Humano Necessário*

*Motivo:* ${reason}
*Telefone do Cliente:* ${phone}
${customerInfo ? '\n' + customerInfo : ''}
---
📞 *Ação Necessária:* Entre em contato com o cliente através do WhatsApp: ${phone}`;

    // Only send to admin if not a frontend user (frontend users are for testing)
    // In frontend mode, just log the notification
    if (this.isFrontendUser(phone)) {
      console.log('📢 [FRONTEND MODE] Notificação de atendimento humano:');
      console.log(messageToAdmin);
    } else {
      // Validate admin number before sending
      if (!adminNumber) {
        console.error('❌ ERRO: ADMIN_WHATSAPP não configurado no arquivo .env');
        console.error('   A mensagem para o consultor não pode ser enviada.');
        console.error('   Configure ADMIN_WHATSAPP no arquivo .env com o número do WhatsApp do consultor.');
        // Still send confirmation to customer, but log the error
        // The counselor won't be notified, but at least the customer knows their request was received
      } else {
        try {
          console.log(`📤 Enviando mensagem para consultor no número: ${adminNumber}`);
          await this.sendMessage(adminNumber, messageToAdmin);
          console.log(`✅ Notificação enviada com sucesso ao consultor (${adminNumber})`);
          console.log(`   Cliente: ${phone}`);
          console.log(`   Motivo: ${reason}`);
        } catch (error) {
          console.error('❌ Erro ao enviar notificação ao consultor:', error.message);
          console.error(`   Tentativa de envio para: ${adminNumber}`);
          console.error('   O cliente ainda receberá confirmação, mas o consultor não foi notificado.');
          // Continue execution - customer should still get confirmation
        }
      }
    }

    const messageToCustomer = preferredLanguage === 'en'
      ? `👨‍💼 *Forwarding to Specialized Support*

Your request has been forwarded to one of our consultants.
You will be contacted shortly to continue the service.

Thank you for your preference! 😊

🤖 If you need my help in the future, please tell me you want to talk to the bot again.`
      : `👨‍💼 *Encaminhando para Atendimento Especializado*

Sua solicitação foi encaminhada para um de nossos consultores.
Em breve você será contatado para dar continuidade ao atendimento.

Obrigado pela preferência! 😊

🤖 Se precisar da minha ajuda no futuro, por favor, me diga que quer falar com o bot novamente.`;

    await this.sendMessage(phone, messageToCustomer);

    // Check if outside business hours - if so, send additional message asking if they want to chat with bot
    const isBusinessHours = businessHoursService.isBusinessHours();
    
    if (!isBusinessHours) {
      // Outside business hours - send message asking if they want to chat with bot
      const botChatMessage = preferredLanguage === 'en'
        ? `⏰ *Outside Business Hours*

Our counselors are currently offline. They will respond to you shortly during business hours (Monday to Friday, 8:30 AM - 12:00 PM).

Would you like to chat with me (the bot) while you wait? I'm here to help answer your questions! 😊

Please reply with:
• *YES* or *SIM* to chat with me
• *NO* or *NÃO* to wait for a human counselor`
        : `⏰ *Fora do Horário de Funcionamento*

Nossos consultores estão fora do horário de atendimento no momento. Eles responderão em breve durante o horário de funcionamento (Segunda a Sexta, 8:30 - 12:00).

Gostaria de conversar comigo (o bot) enquanto espera? Estou aqui para ajudar a responder suas dúvidas! 😊

Por favor, responda com:
• *SIM* para conversar comigo
• *NÃO* para aguardar um consultor humano`;

      await this.sendMessage(phone, botChatMessage);
      
      // Return flag to indicate we're waiting for bot chat confirmation
      return { waitingForBotChatConfirmation: true };
    }

    return { waitingForBotChatConfirmation: false };
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
