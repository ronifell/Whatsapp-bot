/**
 * Message Bus Service
 * Handles communication between backend and frontend
 * Stores messages that need to be delivered to the frontend
 */
class MessageBusService {
  constructor() {
    // Store messages per session/phone
    // Format: { phone: [{ message, timestamp, type }] }
    this.messageQueue = new Map();
    
    // Store active SSE connections
    // Format: { phone: Set<res objects> }
    this.sseConnections = new Map();
  }

  /**
   * Add a message to the queue for a specific phone/session
   */
  addMessage(phone, message, type = 'bot') {
    if (!this.messageQueue.has(phone)) {
      this.messageQueue.set(phone, []);
    }

    const messageData = {
      message,
      type,
      timestamp: new Date().toISOString(),
    };

    this.messageQueue.get(phone).push(messageData);

    // Notify all SSE connections for this phone
    this.notifySSE(phone, messageData);

    console.log(`📨 Message queued for ${phone}:`, message.substring(0, 50) + '...');
  }

  /**
   * Get all messages for a phone/session
   */
  getMessages(phone, since = null) {
    const messages = this.messageQueue.get(phone) || [];
    
    if (since) {
      const sinceDate = new Date(since);
      return messages.filter(msg => new Date(msg.timestamp) > sinceDate);
    }
    
    return messages;
  }

  /**
   * Clear messages for a phone/session
   */
  clearMessages(phone) {
    this.messageQueue.delete(phone);
  }

  /**
   * Register an SSE connection
   */
  registerSSE(phone, res) {
    if (!this.sseConnections.has(phone)) {
      this.sseConnections.set(phone, new Set());
    }

    this.sseConnections.get(phone).add(res);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // Cleanup on disconnect
    res.on('close', () => {
      this.unregisterSSE(phone, res);
    });

    console.log(`🔌 SSE connection registered for ${phone}`);
  }

  /**
   * Unregister an SSE connection
   */
  unregisterSSE(phone, res) {
    const connections = this.sseConnections.get(phone);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        this.sseConnections.delete(phone);
      }
    }
    console.log(`🔌 SSE connection unregistered for ${phone}`);
  }

  /**
   * Notify all SSE connections for a phone
   */
  notifySSE(phone, messageData) {
    const connections = this.sseConnections.get(phone);
    console.log(`📡 Notifying SSE for ${phone}:`, {
      hasConnections: !!connections,
      connectionCount: connections?.size || 0,
      messageType: messageData.type,
      messagePreview: messageData.message?.substring(0, 50)
    });
    
    if (connections && connections.size > 0) {
      connections.forEach(res => {
        try {
          // Check if connection is still open
          if (res.writableEnded || res.destroyed) {
            console.log(`⚠️ Connection closed for ${phone}, unregistering`);
            this.unregisterSSE(phone, res);
            return;
          }
          
          // Send with eventType to avoid conflict with message type field
          const sseData = { eventType: 'message', ...messageData };
          const sseMessage = `data: ${JSON.stringify(sseData)}\n\n`;
          res.write(sseMessage);
          console.log(`✅ SSE message sent to ${phone}:`, messageData.type, messageData.message?.substring(0, 30));
        } catch (error) {
          console.error(`❌ Error sending SSE message to ${phone}:`, error);
          this.unregisterSSE(phone, res);
        }
      });
    } else {
      console.log(`⚠️ No active SSE connections for ${phone}`);
    }
  }

  /**
   * Check if frontend mode is enabled
   */
  isFrontendMode() {
    return process.env.FRONTEND_MODE === 'true' || process.env.NODE_ENV === 'development';
  }
}

export default new MessageBusService();