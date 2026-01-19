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

    // Validações específicas
    if (data.valor < 1000) {
      return { valid: false, error: 'Valor do bem muito baixo' };
    }

    if (consortiumType === 'CARRO') {
      const validPrazos = [24, 36, 48, 60, 72, 80];
      if (!validPrazos.includes(data.prazo)) {
        return { 
          valid: false, 
          error: `Prazo inválido para automóvel. Prazos válidos: ${validPrazos.join(', ')} meses` 
        };
      }
    }

    if (consortiumType === 'IMOVEL') {
      const validPrazos = [80, 100, 120, 150, 180, 200];
      if (!validPrazos.includes(data.prazo)) {
        return { 
          valid: false, 
          error: `Prazo inválido para imóvel. Prazos válidos: ${validPrazos.join(', ')} meses` 
        };
      }
    }

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
}

export default new AIService();
