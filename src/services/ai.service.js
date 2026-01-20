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
- CARRO: Consórcio de automóvel, veículo, carro, moto
- IMOVEL: Consórcio de imóvel, casa, apartamento, terreno
- OUTROS: Consultoria, outras dúvidas, não relacionado a carro ou imóvel

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
- QUOTE_REQUEST: Cliente está explicitamente solicitando uma cotação, pedindo para fazer uma cotação, querendo valores, querendo cotar. Exemplos: "Quero cotar um carro", "Fazer uma cotação", "Preciso de uma cotação de imóvel", "Quanto custa para X valor em Y meses"
- HUMAN_REQUEST: Cliente quer falar com um humano, atendente, consultor. Exemplos: "Quero falar com alguém", "Atendimento humano", "Consultor", "Falar com atendente"
- OTHER: Outras intenções não categorizadas

IMPORTANTE: 
- Perguntas sobre consórcio devem ser classificadas como QUESTION, mesmo que mencionem tipos específicos
- Apenas solicitações explícitas de cotação devem ser QUOTE_REQUEST
- Se a mensagem for uma pergunta informativa, SEMPRE classifique como QUESTION

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
   * Gera resposta conversacional baseada no contexto e pergunta do cliente
   */
  async generateConversationalResponse(message, conversationHistory = [], consortiumType = null) {
    try {
      const historyContext = conversationHistory.length > 0
        ? conversationHistory.slice(-10).map(msg => `${msg.type === 'user' ? 'Cliente' : 'Você'}: ${msg.message}`).join('\n')
        : 'Nenhuma conversa anterior.';

      const contextInfo = consortiumType 
        ? `\nContexto: O cliente mencionou interesse em consórcio de ${consortiumType === 'CARRO' ? 'automóvel' : 'imóvel'}, mas ainda não solicitou cotação explicitamente.`
        : '';

      const prompt = `Você é um assistente virtual especializado em consórcio para a empresa CotaFácil Alphaville.

Sua função é:
- Responder perguntas sobre consórcio de forma natural e conversacional
- Explicar conceitos de forma clara e didática
- Ser amigável, profissional e útil
- Variar suas respostas naturalmente (como em uma conversa humana real)
- NÃO oferecer cotações a menos que explicitamente solicitado pelo cliente
- NÃO assumir que o cliente quer cotar quando ele está apenas perguntando

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

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um assistente virtual especializado em consórcio, conversacional e amigável. Você responde perguntas sobre consórcio de forma natural e variada, como um humano faria.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8, // Higher temperature for more diverse responses
        max_tokens: 500
      });

      const conversationalResponse = response.choices[0].message.content.trim();
      console.log('🤖 Resposta conversacional gerada');
      
      return conversationalResponse;
    } catch (error) {
      console.error('❌ Erro ao gerar resposta conversacional:', error.message);
      return 'Desculpe, não consegui processar sua mensagem. Poderia reformular sua pergunta?';
    }
  }
}

export default new AIService();
