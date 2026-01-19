/**
 * Serviço de gerenciamento de sessões de usuários
 */
class SessionService {
  constructor() {
    // Armazena sessões em memória (para MVP)
    // Em produção, usar Redis ou banco de dados
    this.sessions = new Map();
  }

  /**
   * Cria ou atualiza sessão de usuário
   */
  createSession(phone, data = {}) {
    const session = {
      phone: phone,
      state: 'INITIAL', // INITIAL, AWAITING_TYPE, AWAITING_DATA, PROCESSING, COMPLETED
      consortiumType: null,
      data: {},
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };

    this.sessions.set(phone, session);
    return session;
  }

  /**
   * Obtém sessão do usuário
   */
  getSession(phone) {
    return this.sessions.get(phone);
  }

  /**
   * Atualiza sessão do usuário
   */
  updateSession(phone, updates) {
    const session = this.sessions.get(phone);
    
    if (!session) {
      return this.createSession(phone, updates);
    }

    Object.assign(session, updates, {
      updatedAt: new Date()
    });

    this.sessions.set(phone, session);
    return session;
  }

  /**
   * Adiciona mensagem ao histórico
   */
  addToHistory(phone, message, type = 'user') {
    const session = this.getSession(phone);
    
    if (session) {
      session.history.push({
        type: type, // 'user' ou 'bot'
        message: message,
        timestamp: new Date()
      });
      
      this.sessions.set(phone, session);
    }
  }

  /**
   * Limpa sessão do usuário
   */
  clearSession(phone) {
    this.sessions.delete(phone);
  }

  /**
   * Obtém todas as sessões ativas
   */
  getActiveSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Limpa sessões antigas (mais de 24 horas)
   */
  cleanOldSessions() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [phone, session] of this.sessions.entries()) {
      if (session.updatedAt < oneDayAgo) {
        this.sessions.delete(phone);
        console.log(`🗑️  Sessão removida (inativa): ${phone}`);
      }
    }
  }
}

export default new SessionService();
