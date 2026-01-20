import OpenAI from 'openai';
import { config } from '../config/config.js';

/**
 * Serviço de IA para classificação e validação de dados
 */
class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
  }

  /**
   * Classifica o tipo de consórcio com base na mensagem do cliente
   */
  async classifyConsortiumType(message) {
    try {
      const prompt = `Você é um assistente que classifica pedidos de cotação de consórcio.

Analise a mensagem do cliente e determine qual tipo de consórcio ele deseja:
- CARRO: Consórcio de automóvel, veículo, carro (NÃO inclui moto/motocicleta)
- IMOVEL: Consórcio de imóvel, casa, apartamento, terreno
- OUTROS: Moto/motocicleta, consultoria, outras dúvidas, ou qualquer outro tipo não automatizado

IMPORTANTE: Motos e motocicletas devem ser classificadas como OUTROS, não como CARRO.

Mensagem do cliente: "${message}"

Responda APENAS com uma das palavras: CARRO, IMOVEL ou OUTROS`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um assistente especializado em classificação de pedidos de consórcio.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 10
      });

      const classification = response.choices[0].message.content.trim().toUpperCase();
      console.log(`🤖 Classificação IA: ${classification}`);
      
      return classification;
    } catch (error) {
      console.error('❌ Erro na classificação IA:', error.message);
      return 'OUTROS'; // Fallback para outros em caso de erro
    }
  }

  /**
   * Extrai dados estruturados da mensagem do cliente
   */
  async extractCustomerData(message, consortiumType) {
    try {
      const prompt = `Você é um assistente que extrai dados de clientes de mensagens de texto.

Tipo de consórcio: ${consortiumType}

Extraia as seguintes informações da mensagem do cliente:
- valor: Valor do bem em reais (apenas números)
- prazo: Prazo em meses (apenas números)
- nome: Nome completo
- cpf: CPF (apenas números)
- dataNascimento: Data de nascimento no formato DD/MM/YYYY
- email: Endereço de email

Mensagem do cliente:
"${message}"

Responda APENAS com um JSON válido no formato:
{
  "valor": 50000,
  "prazo": 60,
  "nome": "João Silva",
  "cpf": "12345678900",
  "dataNascimento": "01/01/1990",
  "email": "joao@email.com"
}

Se alguma informação não estiver presente, use null.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um assistente especializado em extração de dados estruturados.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200
      });

      const jsonString = response.choices[0].message.content.trim();
      const data = JSON.parse(jsonString);
      
      console.log('🤖 Dados extraídos pela IA:', data);
      return data;
    } catch (error) {
      console.error('❌ Erro na extração de dados:', error.message);
      return null;
    }
  }

  /**
   * Valida se os dados extraídos estão completos
   */
  validateData(data, consortiumType) {
    const requiredFields = ['valor', 'prazo', 'nome', 'cpf', 'dataNascimento', 'email'];
    
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return {
        valid: false,
        missingFields: missingFields
      };
    }

    // Validações básicas - removidas restrições de valor/prazo
    // O sistema sempre encontrará o plano mais próximo disponível
    // Apenas validações de formato são mantidas abaixo

    // Validação de CPF (básica)
    if (!/^\d{11}$/.test(data.cpf.replace(/\D/g, ''))) {
      return { valid: false, error: 'CPF inválido' };
    }

    // Validação de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { valid: false, error: 'Email inválido' };
    }

    return { valid: true };
  }

  /**
   * Gera mensagem de campos faltantes
   */
  generateMissingFieldsMessage(missingFields, consortiumType) {
    const fieldLabels = {
      valor: `Valor do ${consortiumType === 'CARRO' ? 'veículo' : 'imóvel'}`,
      prazo: 'Prazo em meses',
      nome: 'Nome completo',
      cpf: 'CPF',
      dataNascimento: 'Data de nascimento',
      email: 'Email'
    };

    const missing = missingFields.map(field => fieldLabels[field] || field);

    return `⚠️ *Informações Faltando*

Para gerar sua cotação, ainda preciso de:

${missing.map((field, index) => `${index + 1}. ${field}`).join('\n')}

Por favor, envie essas informações.`;
  }

  /**
   * Detecta intenção de fechar negócio
   */
  async detectClosingIntent(message) {
    const closingKeywords = [
      'fechar',
      'contratar',
      'quero',
      'aceito',
      'prosseguir',
      'continuar',
      'seguir',
      'sim',
      'ok'
    ];

    const messageLower = message.toLowerCase();
    return closingKeywords.some(keyword => messageLower.includes(keyword));
  }

  /**
   * Detecta se o usuário confirmou ou negou uma ação (ex: conectar ao consultor)
   * Retorna: 'yes', 'no', ou null se não detectado
   */
  detectConfirmation(message) {
    const messageLower = message.toLowerCase().trim();
    
    // Palavras de confirmação
    const yesKeywords = ['sim', 'yes', 's', 'y', 'ok', 'okay', 'confirmo', 'confirm', 'aceito', 'aceitar', 'quero', 'gostaria', 'prosseguir', 'continuar'];
    
    // Palavras de negação
    const noKeywords = ['não', 'nao', 'no', 'n', 'não quero', 'nao quero', "don't", "dont", 'cancelar', 'cancel', 'voltar', 'não obrigado', 'nao obrigado'];
    
    // Verificar confirmação
    if (yesKeywords.some(keyword => messageLower === keyword || messageLower.startsWith(keyword + ' ') || messageLower.endsWith(' ' + keyword))) {
      return 'yes';
    }
    
    // Verificar negação
    if (noKeywords.some(keyword => messageLower === keyword || messageLower.startsWith(keyword + ' ') || messageLower.endsWith(' ' + keyword))) {
      return 'no';
    }
    
    return null;
  }

  /**
   * Detecta a intenção principal do usuário
   * Retorna: 'QUESTION', 'QUOTE_REQUEST', 'HUMAN_REQUEST', ou 'OTHER'
   */
  async detectUserIntent(message, conversationHistory = []) {
    try {
      const historyContext = conversationHistory.length > 0
        ? conversationHistory.slice(-5).map(msg => `${msg.type === 'user' ? 'Cliente' : 'Bot'}: ${msg.message}`).join('\n')
        : 'Nenhuma conversa anterior.';

      const prompt = `Você é um assistente que detecta a intenção do cliente em conversas sobre consórcio.

Histórico da conversa (últimas mensagens):
${historyContext}

Mensagem atual do cliente: "${message}"

Analise a mensagem e determine a intenção principal:
- QUESTION: Cliente está fazendo uma pergunta, querendo informações, esclarecimentos sobre consórcio, produtos, processos, etc. Exemplos: "O que é consórcio?", "Como funciona?", "Quais são as taxas?", "Qual a diferença entre consórcio de carro e imóvel?"
- QUOTE_REQUEST: Cliente está explicitamente solicitando uma cotação, pedindo para fazer uma cotação, querendo valores, querendo cotar, pedindo outra cotação com valores diferentes, OU enviando dados completos de cotação (Valor, Prazo, Nome, CPF, Data Nascimento, Email). Exemplos: "Quero cotar um carro", "Fazer uma cotação", "Preciso de uma cotação de imóvel", "Quanto custa para X valor em Y meses", "Quero outra cotação de 50 mil", "E se fosse 30 mil?", "Cotação para 100 mil", mensagens que contêm "Valor: R$ X", "Prazo: Y meses", "Nome:", "CPF:", "Data Nascimento:", "Email:"
- HUMAN_REQUEST: Cliente quer falar com um humano, atendente, consultor. Exemplos: "Quero falar com alguém", "Atendimento humano", "Consultor", "Falar com atendente", "Quero falar com um humano"
- OTHER: Outras intenções não categorizadas

IMPORTANTE: 
- Perguntas sobre consórcio devem ser classificadas como QUESTION, mesmo que mencionem tipos específicos
- Solicitações de cotação (incluindo segundas, terceiras cotações com valores diferentes) devem ser QUOTE_REQUEST
- Se a mensagem contém dados estruturados de cotação (Valor, Prazo, Nome, CPF, Data Nascimento, Email), SEMPRE classifique como QUOTE_REQUEST, mesmo que seja uma nova cotação após uma anterior
- Se o cliente pedir uma nova cotação com valores diferentes, classifique como QUOTE_REQUEST
- Se a mensagem for uma pergunta informativa, SEMPRE classifique como QUESTION
- Apenas quando o cliente EXPLICITAMENTE pedir para falar com humano, classifique como HUMAN_REQUEST
- NUNCA classifique como HUMAN_REQUEST se a mensagem contém dados de cotação ou parece ser uma solicitação de cotação

Responda APENAS com uma das palavras: QUESTION, QUOTE_REQUEST, HUMAN_REQUEST, ou OTHER`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um assistente especializado em detectar intenções de clientes.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 20
      });

      const intent = response.choices[0].message.content.trim().toUpperCase();
      console.log(`🤖 Intenção detectada: ${intent}`);
      
      return intent;
    } catch (error) {
      console.error('❌ Erro na detecção de intenção:', error.message);
      return 'OTHER';
    }
  }

  /**
   * Detecta preferência de idioma do usuário na mensagem
   * Retorna: 'en', 'pt', ou null se não detectado
   */
  async detectLanguagePreference(message, conversationHistory = []) {
    try {
      const messageLower = message.toLowerCase();
      
      // Verificar mensagem atual
      const languageKeywords = {
        'en': ['english', 'in english', 'answer in english', 'respond in english', 'speak english', 'from now on', 'please answer', 'all questions'],
        'pt': ['português', 'portugues', 'em português', 'responda em português', 'falar português']
      };

      // Verificar se há solicitação explícita de idioma
      for (const [lang, keywords] of Object.entries(languageKeywords)) {
        if (keywords.some(keyword => messageLower.includes(keyword))) {
          console.log(`🌐 Preferência de idioma detectada: ${lang}`);
          return lang;
        }
      }

      // Verificar histórico para preferências anteriores
      if (conversationHistory.length > 0) {
        const historyText = conversationHistory.map(msg => msg.message).join(' ').toLowerCase();
        for (const [lang, keywords] of Object.entries(languageKeywords)) {
          if (keywords.some(keyword => historyText.includes(keyword))) {
            // Verificar se a solicitação foi recente (últimas 5 mensagens)
            const recentHistory = conversationHistory.slice(-5);
            const recentText = recentHistory.map(msg => msg.message).join(' ').toLowerCase();
            if (keywords.some(keyword => recentText.includes(keyword))) {
              console.log(`🌐 Preferência de idioma detectada no histórico: ${lang}`);
              return lang;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao detectar preferência de idioma:', error.message);
      return null;
    }
  }

  /**
   * Gera resposta conversacional baseada no contexto e pergunta do cliente
   */
  async generateConversationalResponse(message, conversationHistory = [], consortiumType = null, preferredLanguage = 'pt') {
    try {
      const historyContext = conversationHistory.length > 0
        ? conversationHistory.slice(-10).map(msg => `${msg.type === 'user' ? 'Cliente' : 'Você'}: ${msg.message}`).join('\n')
        : preferredLanguage === 'en' ? 'No previous conversation.' : 'Nenhuma conversa anterior.';

      const contextInfo = consortiumType 
        ? (preferredLanguage === 'en'
          ? `\nContext: The customer mentioned interest in ${consortiumType === 'CARRO' ? 'car/automobile' : consortiumType === 'IMOVEL' ? 'real estate/property' : 'other type (motorcycle, consulting, etc.)'} consortium, but hasn't explicitly requested a quote yet.`
          : `\nContexto: O cliente mencionou interesse em consórcio de ${consortiumType === 'CARRO' ? 'automóvel/carro' : consortiumType === 'IMOVEL' ? 'imóvel' : 'outro tipo (moto, consultoria, etc.)'}, mas ainda não solicitou cotação explicitamente.`)
        : '';

      const languageInstruction = preferredLanguage === 'en'
        ? 'IMPORTANT: You MUST respond in English. The customer has requested that all responses be in English from now on.'
        : 'IMPORTANTE: Responda em português brasileiro.';

      const prompt = preferredLanguage === 'en'
        ? `You are a virtual assistant specialized in consortium for CotaFácil Alphaville company.

Your role is:
- Answer questions about consortium in a natural and conversational way
- Explain concepts clearly and didactically
- Be friendly, professional, and helpful
- Vary your responses naturally (like a real human would)
- DO NOT offer quotes unless explicitly requested by the customer
- DO NOT assume the customer wants a quote when they are just asking questions

${languageInstruction}

Conversation history:
${historyContext}
${contextInfo}

Customer message: "${message}"

Generate a natural, conversational, and helpful response. The response should:
- Be specific to the customer's question
- Be informative and clear
- Vary in style (not always the same)
- If appropriate, mention that you can help with quotes when the customer wants, but without pressuring

Response (in English):`
        : `Você é um assistente virtual especializado em consórcio para a empresa CotaFácil Alphaville.

Sua função é:
- Responder perguntas sobre consórcio de forma natural e conversacional
- Explicar conceitos de forma clara e didática
- Ser amigável, profissional e útil
- Variar suas respostas naturalmente (como em uma conversa humana real)
- NÃO oferecer cotações a menos que explicitamente solicitado pelo cliente
- NÃO assumir que o cliente quer cotar quando ele está apenas perguntando

${languageInstruction}

Histórico da conversa:
${historyContext}
${contextInfo}

Mensagem do cliente: "${message}"

Gere uma resposta natural, conversacional e útil. A resposta deve:
- Ser específica à pergunta do cliente
- Ser informativa e clara
- Variar no estilo (não sempre igual)
- Se apropriado, mencionar que você pode ajudar com cotações quando o cliente quiser, mas sem pressionar

Resposta (em português brasileiro):`;

      const systemMessage = preferredLanguage === 'en'
        ? 'You are a virtual assistant specialized in consortium, conversational and friendly. You answer questions about consortium in a natural and varied way, like a human would. You MUST respond in English as requested by the customer.'
        : 'Você é um assistente virtual especializado em consórcio, conversacional e amigável. Você responde perguntas sobre consórcio de forma natural e variada, como um humano faria.';

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: systemMessage
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8, // Higher temperature for more diverse responses
        max_tokens: 500
      });

      const conversationalResponse = response.choices[0].message.content.trim();
      console.log(`🤖 Resposta conversacional gerada (idioma: ${preferredLanguage})`);
      
      return conversationalResponse;
    } catch (error) {
      console.error('❌ Erro ao gerar resposta conversacional:', error.message);
      const errorMessage = preferredLanguage === 'en'
        ? 'Sorry, I could not process your message. Could you please rephrase your question?'
        : 'Desculpe, não consegui processar sua mensagem. Poderia reformular sua pergunta?';
      return errorMessage;
    }
  }
}

export default new AIService();
