/**
 * Serviço para verificar horário de funcionamento
 * Business hours: Monday-Friday 8:30-12:00 AM (Brazil timezone)
 * Closed: Sunday and Saturday
 */
class BusinessHoursService {
  /**
   * Verifica se está dentro do horário de funcionamento
   * @returns {boolean} true se está dentro do horário de funcionamento
   */
  isBusinessHours() {
    // Obter data/hora atual no fuso horário do Brasil (America/Sao_Paulo)
    // Usar Intl.DateTimeFormat para obter corretamente a hora no timezone do Brasil
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'long',
      hour12: false // Usar formato 24 horas
    });
    
    const parts = formatter.formatToParts(now);
    const dayOfWeekName = parts.find(p => p.type === 'weekday').value;
    const hourPart = parts.find(p => p.type === 'hour');
    const minutePart = parts.find(p => p.type === 'minute');
    
    // Se formatToParts não estiver disponível, usar fallback
    if (!hourPart || !minutePart) {
      // Fallback: usar método alternativo
      const brazilTimeStr = now.toLocaleString('en-US', { 
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'long',
        hour12: false
      });
      // Parse manual (formato: "Monday, 14:30")
      const match = brazilTimeStr.match(/(\w+day),\s*(\d+):(\d+)/);
      if (!match) return false;
      
      const fallbackDayOfWeek = match[1];
      const fallbackHour = parseInt(match[2]);
      const fallbackMinute = parseInt(match[3]);
      
      if (fallbackDayOfWeek === 'Sunday' || fallbackDayOfWeek === 'Saturday') {
        return false;
      }
      
      const currentTimeInMinutes = fallbackHour * 60 + fallbackMinute;
      const businessStartMinutes = 8 * 60 + 30; // 8:30 AM
      const businessEndMinutes = 12 * 60; // 12:00 PM
      
      return currentTimeInMinutes >= businessStartMinutes && currentTimeInMinutes < businessEndMinutes;
    }
    
    const hour = parseInt(hourPart.value);
    const minute = parseInt(minutePart.value);
    
    // Domingo e Sábado estão fechados
    if (dayOfWeekName === 'Sunday' || dayOfWeekName === 'Saturday') {
      return false;
    }
    
    // Segunda a Sexta: verificar se está entre 8:30 e 12:00
    const currentTimeInMinutes = hour * 60 + minute;
    
    // 8:30 AM = 8 * 60 + 30 = 510 minutos
    // 12:00 PM = 12 * 60 = 720 minutos
    const businessStartMinutes = 8 * 60 + 30; // 8:30 AM
    const businessEndMinutes = 12 * 60; // 12:00 PM
    
    return currentTimeInMinutes >= businessStartMinutes && currentTimeInMinutes < businessEndMinutes;
  }

  /**
   * Obtém informações sobre o horário de funcionamento
   * @returns {object} Informações sobre horário de funcionamento
   */
  getBusinessHoursInfo() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long'
    });
    
    const brazilTimeStr = formatter.format(now);
    const parts = formatter.formatToParts(now);
    const dayName = parts.find(p => p.type === 'weekday').value;
    const timeStr = parts.find(p => p.type === 'hour').value + ':' + parts.find(p => p.type === 'minute').value;
    
    return {
      isBusinessHours: this.isBusinessHours(),
      currentDay: dayName,
      currentTime: timeStr,
      hours: '8:30 - 12:00',
      days: 'Segunda a Sexta'
    };
  }
}

export default new BusinessHoursService();
