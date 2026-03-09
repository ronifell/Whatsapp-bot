import { chromium } from 'playwright';
import { config } from '../config/config.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * Serviço de RPA para automação do portal Canopus
 */
class CanopusRPAService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isLoggedIn = false;
    this.currentUserAgent = null;
    this.currentProxy = null;
    this.workingProxies = [];
  }

  /**
   * Gera um User-Agent realista e rotacionado
   */
  getRandomUserAgent() {
    const userAgents = [
      // Chrome on Windows (most common)
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      // Chrome on Windows (different versions)
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      // Edge on Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      // Firefox on Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      // Chrome on Mac
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];
    
    const randomIndex = Math.floor(Math.random() * userAgents.length);
    return userAgents[randomIndex];
  }

  /**
   * Simula movimento de mouse humano
   */
  async simulateMouseMovement() {
    try {
      // Movimento aleatório suave do mouse
      const viewport = this.page.viewportSize();
      if (!viewport) return;

      const startX = Math.random() * viewport.width;
      const startY = Math.random() * viewport.height;
      const endX = Math.random() * viewport.width;
      const endY = Math.random() * viewport.height;

      // Movimento em múltiplos passos para parecer mais humano
      const steps = 5 + Math.floor(Math.random() * 5);
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const x = startX + (endX - startX) * progress;
        const y = startY + (endY - startY) * progress;
        
        await this.page.mouse.move(x, y, { steps: 1 });
        await this.page.waitForTimeout(50 + Math.random() * 50);
      }
    } catch (error) {
      // Ignorar erros de movimento de mouse
    }
  }

  /**
   * Simula comportamento humano: pequena pausa aleatória
   */
  async humanDelay(min = 500, max = 2000) {
    const delay = min + Math.random() * (max - min);
    if (this.page) {
      await this.page.waitForTimeout(delay);
    } else {
      // Se não tem página, usar setTimeout
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Simula leitura da página (scroll e pausas)
   */
  async simulatePageReading() {
    try {
      if (!this.page) return;
      
      // Scroll lento pela página
      const viewport = this.page.viewportSize();
      if (viewport) {
        for (let i = 0; i < 3; i++) {
          await this.page.mouse.wheel(0, 200);
          await this.humanDelay(1000, 2000);
        }
      }
      
      // Movimento aleatório do mouse
      await this.simulateMouseMovement();
      
      // Pequena pausa como se estivesse lendo
      await this.humanDelay(2000, 4000);
    } catch (error) {
      // Ignorar erros
    }
  }

  /**
   * Busca proxies gratuitos de fontes públicas
   * Prioriza proxies do Brasil com características ideais
   */
  async fetchFreeProxies() {
    try {
      console.log('🔍 Buscando proxies gratuitos (priorizando Brasil, Elite, HTTPS)...');
      
      const proxies = [];
      
      // Fonte 1: ProxyScrape - Buscar proxies do Brasil especificamente
      try {
        // Primeiro, tentar buscar proxies do Brasil (BR)
        const responseBR = await axios.get('https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=BR&ssl=all&anonymity=all', {
          timeout: 10000
        });
        
        const linesBR = responseBR.data.split('\n').filter(line => line.trim());
        for (const line of linesBR) {
          const [host, port] = line.trim().split(':');
          if (host && port && !isNaN(parseInt(port))) {
            proxies.push({ 
              host, 
              port: parseInt(port), 
              source: 'proxyscrape',
              country: 'BR',
              priority: 10 // Alta prioridade para proxies do Brasil
            });
          }
        }
        console.log(`   📋 ProxyScrape BR: ${linesBR.length} proxies do Brasil encontrados`);
        
        // Se não encontrou muitos do Brasil, buscar de outros países também
        if (linesBR.length < 10) {
          const responseAll = await axios.get('https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all', {
            timeout: 10000
          });
          
          const linesAll = responseAll.data.split('\n').filter(line => line.trim());
          for (const line of linesAll.slice(0, 30)) {
            const [host, port] = line.trim().split(':');
            if (host && port && !isNaN(parseInt(port))) {
              const key = `${host}:${port}`;
              // Só adicionar se não for duplicata
              if (!proxies.some(p => `${p.host}:${p.port}` === key)) {
                proxies.push({ 
                  host, 
                  port: parseInt(port), 
                  source: 'proxyscrape',
                  country: 'unknown',
                  priority: 5 // Prioridade menor para outros países
                });
              }
            }
          }
          console.log(`   📋 ProxyScrape All: ${linesAll.length} proxies adicionais encontrados`);
        }
      } catch (e) {
        console.log(`   ⚠️  ProxyScrape falhou: ${e.message.substring(0, 50)}`);
      }
      
      // Fonte 2: Buscar SOCKS4 também (geralmente são Elite)
      try {
        const responseSOCKS = await axios.get('https://api.proxyscrape.com/v2/?request=get&protocol=socks4&timeout=10000&country=BR', {
          timeout: 10000
        });
        
        const linesSOCKS = responseSOCKS.data.split('\n').filter(line => line.trim());
        for (const line of linesSOCKS) {
          const [host, port] = line.trim().split(':');
          if (host && port && !isNaN(parseInt(port))) {
            const key = `${host}:${port}`;
            if (!proxies.some(p => `${p.host}:${p.port}` === key)) {
              proxies.push({ 
                host, 
                port: parseInt(port), 
                source: 'proxyscrape-socks4',
                country: 'BR',
                protocol: 'socks4',
                priority: 12 // Prioridade ainda maior para SOCKS4 do Brasil (geralmente Elite)
              });
            }
          }
        }
        console.log(`   📋 ProxyScrape SOCKS4 BR: ${linesSOCKS.length} proxies SOCKS4 do Brasil encontrados`);
      } catch (e) {
        console.log(`   ⚠️  ProxyScrape SOCKS4 falhou: ${e.message.substring(0, 50)}`);
      }
      
      // Fonte 3: GitHub (alternativa, sem filtro de país)
      try {
        const response = await axios.get('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', {
          timeout: 10000
        });
        
        const lines = response.data.split('\n').filter(line => line.trim());
        for (const line of lines.slice(0, 30)) {
          const [host, port] = line.trim().split(':');
          if (host && port && !isNaN(parseInt(port))) {
            const key = `${host}:${port}`;
            if (!proxies.some(p => `${p.host}:${p.port}` === key)) {
              proxies.push({ 
                host, 
                port: parseInt(port), 
                source: 'github',
                country: 'unknown',
                priority: 3 // Prioridade baixa
              });
            }
          }
        }
        console.log(`   📋 GitHub: ${lines.length} proxies encontrados`);
      } catch (e) {
        console.log(`   ⚠️  GitHub falhou: ${e.message.substring(0, 50)}`);
      }
      
      // Ordenar por prioridade (maior primeiro) e limitar
      proxies.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      
      console.log(`✅ Total de ${proxies.length} proxies únicos encontrados`);
      console.log(`   🇧🇷 Proxies do Brasil: ${proxies.filter(p => p.country === 'BR').length}`);
      console.log(`   🔒 Proxies SOCKS4: ${proxies.filter(p => p.protocol === 'socks4').length}`);
      
      return proxies.slice(0, 30); // Aumentar para 30 para ter mais opções
    } catch (error) {
      console.log('⚠️  Erro ao buscar proxies gratuitos:', error.message.substring(0, 100));
      return [];
    }
  }

  /**
   * Testa se um proxy funciona
   */
  async testProxy(proxy) {
    let testBrowser = null;
    try {
      // Determinar protocolo do proxy
      const protocol = proxy.protocol || 'http';
      const proxyServer = protocol === 'socks4' 
        ? `socks4://${proxy.host}:${proxy.port}`
        : `http://${proxy.host}:${proxy.port}`;
      
      testBrowser = await chromium.launch({
        headless: true,
        proxy: {
          server: proxyServer
        },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const context = await testBrowser.newContext();
      const page = await context.newPage();
      
      // Tentar acessar site de teste
      await page.goto('https://api.ipify.org?format=json', { 
        timeout: 15000,
        waitUntil: 'domcontentloaded'
      });
      
      const ip = await page.evaluate(() => {
        try {
          return JSON.parse(document.body.textContent).ip;
        } catch {
          return null;
        }
      });
      
      await testBrowser.close();
      
      if (ip) {
        console.log(`   ✅ Proxy ${proxy.host}:${proxy.port} funciona - IP: ${ip}`);
        return { ...proxy, working: true, ip };
      }
      
      return { ...proxy, working: false };
    } catch (error) {
      if (testBrowser) {
        try {
          await testBrowser.close();
        } catch {}
      }
      return { ...proxy, working: false };
    }
  }

  /**
   * Encontra um proxy gratuito que funciona
   */
  async findWorkingProxy() {
    try {
      // Se já temos proxies funcionando em cache, usar um deles
      if (this.workingProxies.length > 0) {
        const proxy = this.workingProxies[Math.floor(Math.random() * this.workingProxies.length)];
        console.log(`🔄 Reutilizando proxy conhecido: ${proxy.host}:${proxy.port}`);
        return proxy;
      }
      
      const proxies = await this.fetchFreeProxies();
      if (proxies.length === 0) {
        console.log('⚠️  Nenhum proxy gratuito encontrado');
        return null;
      }
      
      // Priorizar proxies do Brasil e SOCKS4
      const prioritizedProxies = proxies.sort((a, b) => {
        // Primeiro: proxies do Brasil
        if (a.country === 'BR' && b.country !== 'BR') return -1;
        if (a.country !== 'BR' && b.country === 'BR') return 1;
        // Segundo: SOCKS4 (geralmente Elite)
        if (a.protocol === 'socks4' && b.protocol !== 'socks4') return -1;
        if (a.protocol !== 'socks4' && b.protocol === 'socks4') return 1;
        // Terceiro: prioridade
        return (b.priority || 0) - (a.priority || 0);
      });
      
      console.log(`🧪 Testando ${Math.min(10, prioritizedProxies.length)} proxies (priorizando Brasil e SOCKS4)...`);
      
      // Testar proxies priorizados (mais do Brasil primeiro)
      const testPromises = prioritizedProxies.slice(0, 10).map(proxy => this.testProxy(proxy));
      const results = await Promise.all(testPromises);
      
      const working = results.filter(r => r.working);
      
      if (working.length > 0) {
        // Ordenar proxies funcionais por prioridade
        working.sort((a, b) => {
          if (a.country === 'BR' && b.country !== 'BR') return -1;
          if (a.country !== 'BR' && b.country === 'BR') return 1;
          return (b.priority || 0) - (a.priority || 0);
        });
        
        this.workingProxies = working;
        const selected = working[0];
        const proxyType = selected.protocol === 'socks4' ? 'SOCKS4' : 'HTTP';
        const country = selected.country === 'BR' ? '🇧🇷 Brasil' : 'outro país';
        console.log(`✅ Proxy funcionando encontrado: ${selected.host}:${selected.port} (${proxyType}, ${country})`);
        return selected;
      }
      
      console.log('⚠️  Nenhum proxy gratuito funcionou');
      return null;
    } catch (error) {
      console.log('⚠️  Erro ao encontrar proxy:', error.message.substring(0, 100));
      return null;
    }
  }

  /**
   * Testa conectividade básica
   */
  async testConnection() {
    try {
      if (!this.page) {
        console.log('⚠️  Não há página para testar conectividade');
        return false;
      }
      
      console.log('🔍 Testando conectividade...');
      
      // Testar acesso a site simples
      try {
        await this.page.goto('https://www.google.com', { timeout: 30000 });
        console.log('✅ Consegue acessar Google');
      } catch (e) {
        console.log('❌ Não consegue acessar Google:', e.message.substring(0, 50));
        return false;
      }
      
      // Testar acesso ao domínio Canopus (mas não a página específica)
      try {
        await this.page.goto('https://consorciocanopus.com.br', { timeout: 30000 });
        console.log('✅ Consegue acessar domínio Canopus');
        return true;
      } catch (e) {
        console.log('⚠️  Problema ao acessar domínio Canopus:', e.message.substring(0, 50));
        return false;
      }
    } catch (error) {
      console.log('❌ Erro no teste de conectividade:', error.message.substring(0, 100));
      return false;
    }
  }

  /**
   * Verifica se é um bom horário para tentar (horário comercial no Brasil)
   */
  isGoodTimeToRetry() {
    const hour = new Date().getHours();
    // Horário comercial no Brasil (9h-18h BRT = UTC-3)
    // Assumindo que o servidor está em UTC, ajustar conforme necessário
    const brazilHour = (hour - 3 + 24) % 24;
    return brazilHour >= 9 && brazilHour <= 18;
  }

  /**
   * Simula scroll humano
   */
  async humanScroll(direction = 'down', amount = 200) {
    try {
      const scrollAmount = direction === 'down' ? amount : -amount;
      const steps = 3 + Math.floor(Math.random() * 3);
      const stepSize = scrollAmount / steps;

      for (let i = 0; i < steps; i++) {
        await this.page.mouse.wheel(0, stepSize);
        await this.page.waitForTimeout(100 + Math.random() * 100);
      }
    } catch (error) {
      // Ignorar erros de scroll
    }
  }

  /**
   * Inicializa o navegador
   */
  async initBrowser(headless = true) {
    try {
      console.log('🚀 Iniciando navegador...');
      
      // Tentar encontrar proxy gratuito que funciona (opcional, pode falhar)
      let proxyConfig = null;
      try {
        const workingProxy = await this.findWorkingProxy();
        if (workingProxy) {
          // Determinar protocolo do proxy
          const protocol = workingProxy.protocol || 'http';
          const proxyServer = protocol === 'socks4' 
            ? `socks4://${workingProxy.host}:${workingProxy.port}`
            : `http://${workingProxy.host}:${workingProxy.port}`;
          
          proxyConfig = {
            server: proxyServer
          };
          this.currentProxy = workingProxy;
          const proxyType = workingProxy.protocol === 'socks4' ? 'SOCKS4' : 'HTTP';
          const country = workingProxy.country === 'BR' ? '🇧🇷 Brasil' : 'outro país';
          console.log(`🔒 Usando proxy gratuito: ${workingProxy.host}:${workingProxy.port} (${proxyType}, ${country})`);
        } else {
          console.log('ℹ️  Continuando sem proxy (nenhum proxy gratuito funcionou)');
        }
      } catch (proxyError) {
        console.log('⚠️  Erro ao configurar proxy, continuando sem proxy:', proxyError.message.substring(0, 50));
      }
      
      // Rotacionar User-Agent
      this.currentUserAgent = this.getRandomUserAgent();
      console.log(`🌐 User-Agent: ${this.currentUserAgent.substring(0, 60)}...`);
      
      this.browser = await chromium.launch({
        headless: headless,
        proxy: proxyConfig || undefined,
        args: [
          '--start-maximized',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled', // Remove automation flags
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          // Adicionar flags para melhorar compatibilidade em VPS
          '--disable-software-rasterizer',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          // Melhorar estabilidade de conexão
          '--enable-features=NetworkService,NetworkServiceInProcess',
          '--force-color-profile=srgb'
        ]
      });

      // Gerar viewport aleatório mas realista
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 },
        { width: 1280, height: 720 }
      ];
      const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];

      this.context = await this.browser.newContext({
        viewport: randomViewport,
        userAgent: this.currentUserAgent,
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        // Adicionar permissões realistas
        permissions: ['geolocation'],
        // Simular dispositivo real
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        // Cores e mídia
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        forcedColors: 'none',
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'DNT': '1',
          'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"'
        }
      });

      // Remover sinais de automação via JavaScript
      await this.context.addInitScript(() => {
        // Remover webdriver flag
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });

        // Sobrescrever plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // Sobrescrever languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['pt-BR', 'pt', 'en-US', 'en'],
        });

        // Adicionar Chrome object
        window.chrome = {
          runtime: {},
        };

        // Sobrescrever permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
        
        // Adicionar mais propriedades para parecer navegador real
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => 8,
        });
        
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => 8,
        });
        
        // Sobrescrever getBattery se existir
        if (navigator.getBattery) {
          navigator.getBattery = () => Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1
          });
        }
      });

      // Definir timeout padrão maior para operações (2 minutos)
      this.context.setDefaultTimeout(120000);

      this.page = await this.context.newPage();
      
      // Definir timeout padrão também na página
      this.page.setDefaultTimeout(120000);

      // Simular comportamento humano inicial: pequeno movimento de mouse
      await this.simulateMouseMovement();
      await this.humanDelay(300, 800);
      
      console.log('✅ Navegador iniciado');
      return true;
    } catch (error) {
      console.error('❌ Erro ao iniciar navegador:', error.message);
      
      // Verificar se o erro é relacionado a browsers não instalados
      if (error.message.includes('Executable doesn\'t exist') || 
          error.message.includes('browserType.launch') ||
          error.message.includes('playwright install')) {
        console.error('⚠️ Playwright browsers não foram instalados corretamente.');
        console.error('💡 Solução: Execute "npm run install:browsers" ou "npx playwright install chromium"');
        console.error('💡 Em produção (Render), certifique-se de que o script "postinstall" está configurado no package.json');
      }
      
      throw error;
    }
  }

  /**
   * Navega para uma URL com estratégia de espera tolerante e retry para connection reset
   * Tenta diferentes estratégias para evitar timeouts e connection resets
   */
  async navigateTo(url, options = {}) {
    const timeout = options.timeout || 120000; // Aumentado para 120 segundos
    const maxRetries = options.maxRetries || 5; // Número máximo de tentativas
    const retryDelay = options.retryDelay || 10000; // Delay entre tentativas (10 segundos)
    
    let lastError = null;
    
    // Estratégias de navegação em ordem de preferência
    const navigationStrategies = [
      { waitUntil: 'load', name: 'load' },
      { waitUntil: 'domcontentloaded', name: 'domcontentloaded' },
      { waitUntil: 'networkidle', name: 'networkidle' },
      { waitUntil: undefined, name: 'sem waitUntil' }
    ];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      for (const strategy of navigationStrategies) {
        try {
          if (attempt > 1) {
            console.log(`🔄 Tentativa ${attempt}/${maxRetries} para: ${url} (estratégia: ${strategy.name})`);
            // Delay exponencial entre tentativas
            const delay = retryDelay * Math.pow(1.5, attempt - 2); // 10s, 15s, 22.5s, 33.75s...
            console.log(`⏳ Aguardando ${Math.round(delay / 1000)}s antes de tentar novamente...`);
            await this.humanDelay(delay, delay + 2000);
            
            // Simular comportamento humano: movimento de mouse
            await this.simulateMouseMovement();
          }
          
          // Tentar navegar com a estratégia atual
          const gotoOptions = { timeout: timeout };
          if (strategy.waitUntil) {
            gotoOptions.waitUntil = strategy.waitUntil;
          }
          
          // Se estamos navegando para a segunda página de login, adicionar referrer
          if (url.includes('afv.consorciocanopus.com.br') && this.page.url().includes('parceiros.consorciocanopus.com.br')) {
            gotoOptions.referer = this.page.url();
            console.log(`   🔗 Usando referrer: ${gotoOptions.referer.substring(0, 60)}...`);
          }
          
          await this.page.goto(url, gotoOptions);
          console.log(`✅ Navegação concluída: ${url} (estratégia: ${strategy.name}, tentativa: ${attempt})`);
          
          // Aguardar um pouco para garantir que elementos dinâmicos carregaram
          // Adicionar comportamento humano: pequeno movimento de mouse
          await this.simulateMouseMovement();
          await this.humanDelay(1000, 2000);
          
          return; // Sucesso, sair da função
          
        } catch (error) {
          lastError = error;
          
          // Verificar se é um erro de connection reset
          const isConnectionReset = error.message && (
            error.message.includes('ERR_CONNECTION_RESET') ||
            error.message.includes('Connection reset') ||
            error.message.includes('net::ERR_CONNECTION_RESET')
          );
          
          if (isConnectionReset) {
            console.log(`⚠️  Tentativa ${attempt}/${maxRetries} falhou (Connection Reset). Estratégia: ${strategy.name}`);
            
            // Se é connection reset e ainda temos tentativas, continuar
            if (attempt < maxRetries) {
              // Tentar estratégia alternativa: criar nova página no mesmo contexto
              if (attempt === Math.floor(maxRetries / 2)) {
                console.log('🔄 Tentando estratégia alternativa: criando nova página no mesmo contexto...');
                try {
                  // Fechar página atual
                  await this.page.close().catch(() => {});
                  
                  // Criar nova página no mesmo contexto (mantém cookies e sessão)
                  this.page = await this.context.newPage();
                  this.page.setDefaultTimeout(120000);
                  
                  console.log('✅ Nova página criada, tentando navegar novamente...');
                  // Continuar para próxima tentativa
                  break;
                } catch (e) {
                  console.log('⚠️  Não foi possível criar nova página, continuando com página atual...');
                }
              }
              continue; // Tentar próxima estratégia ou próxima tentativa
            }
          } else {
            // Se não é connection reset, tentar próxima estratégia
            console.log(`⚠️  Estratégia ${strategy.name} falhou: ${error.message.substring(0, 100)}`);
            continue; // Tentar próxima estratégia
          }
        }
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    console.error(`❌ Falha ao navegar para ${url} após ${maxRetries} tentativas`);
    throw lastError || new Error(`Não foi possível navegar para ${url} após ${maxRetries} tentativas`);
  }

  /**
   * Preenche campo de formulário Angular Material de forma adequada
   * Simula digitação real e dispara eventos necessários para Angular
   */
  async fillAngularField(element, value) {
    try {
      // Mover mouse para o campo antes de clicar (comportamento humano)
      const box = await element.boundingBox();
      if (box) {
        await this.page.mouse.move(
          box.x + box.width / 2 + (Math.random() - 0.5) * 10,
          box.y + box.height / 2 + (Math.random() - 0.5) * 10,
          { steps: 3 + Math.floor(Math.random() * 3) }
        );
        await this.humanDelay(100, 300);
      }

      // Clicar no campo para focar
      await element.click({ timeout: 5000 });
      await this.humanDelay(200, 400);
      
      // Limpar campo (Ctrl+A + Delete) com delays humanos
      await element.press('Control+a');
      await this.humanDelay(100, 200);
      await element.press('Delete');
      await this.humanDelay(100, 200);
      
      // Digitar valor com delay variável entre caracteres (simula digitação humana)
      const typingDelay = 30 + Math.random() * 40; // 30-70ms entre caracteres
      await element.type(value, { delay: typingDelay });
      await this.humanDelay(300, 600);
      
      // Disparar eventos adicionais que Angular Material pode precisar
      await element.evaluate((el, val) => {
        // Disparar evento input
        el.dispatchEvent(new Event('input', { bubbles: true }));
        // Disparar evento change
        el.dispatchEvent(new Event('change', { bubbles: true }));
        // Disparar evento blur (quando campo perde foco)
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        // Disparar evento keyup (alguns formulários escutam isso)
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      }, value);
      
      await this.page.waitForTimeout(300); // Aumentado para 300ms
      
      return true;
    } catch (error) {
      console.warn(`⚠️  Erro ao preencher campo Angular: ${error.message}`);
      // Fallback: tentar fill() normal
      try {
        await element.fill(value);
        await this.page.waitForTimeout(300);
        return true;
      } catch (e) {
        throw error;
      }
    }
  }

  /**
   * Verifica se o login foi bem-sucedido
   */
  async verifyLoginSuccess() {
    try {
      // Verificar se ainda está na página de login (indicador de falha)
      const currentUrl = this.page.url().toLowerCase();
      const loginUrl = config.canopus.url.toLowerCase();
      
      // Se a URL mudou, provavelmente o login foi bem-sucedido
      if (currentUrl !== loginUrl && !currentUrl.includes('login')) {
        return true;
      }

      // Verificar se há mensagens de erro na página
      const errorSelectors = [
        // Angular Material e mensagens específicas do Canopus
        'text=/usuário.*senha.*inválido/i',
        'text=/usuário.*inválido/i',
        'text=/senha.*incorreta/i',
        'text=/credenciais.*inválidas/i',
        'text=/invalid.*credentials/i',
        // Seletores genéricos
        '.error',
        '.alert-danger',
        '.login-error',
        '[class*="error"]',
        '[class*="invalid"]',
        '[class*="mat-error"]',
        '.mat-error',
        // Buscar por texto de erro comum
        'text=/erro/i',
        'text=/falhou/i'
      ];

      for (const selector of errorSelectors) {
        try {
          const errorElement = await this.page.locator(selector).first();
          if (await errorElement.isVisible({ timeout: 1000 })) {
            const errorText = await errorElement.textContent();
            console.error(`❌ Erro de login detectado: ${errorText}`);
            return false;
          }
        } catch (e) {
          // Seletor não encontrado, continuar
        }
      }
      
      // Verificar também no texto da página inteira
      try {
        const pageText = await this.page.textContent('body');
        const credentialErrorPatterns = [
          /usuário.*senha.*inválido/i,
          /usuário.*inválido/i,
          /senha.*incorreta/i,
          /credenciais.*inválidas/i,
          /invalid.*credentials/i
        ];
        
        for (const pattern of credentialErrorPatterns) {
          if (pattern.test(pageText)) {
            const match = pageText.match(pattern);
            console.error(`❌ Erro de login detectado no texto da página: ${match ? match[0] : 'credenciais inválidas'}`);
            return false;
          }
        }
      } catch (e) {
        // Ignorar erro ao ler texto
      }

      // Verificar se há indicadores de login bem-sucedido
      const successIndicators = [
        'text=/bem-vindo/i',
        'text=/dashboard/i',
        'text=/painel/i',
        '[class*="user-menu"]',
        '[class*="logout"]',
        '[id*="user"]'
      ];

      for (const selector of successIndicators) {
        try {
          const element = await this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            return true;
          }
        } catch (e) {
          // Seletor não encontrado, continuar
        }
      }

      // Se não encontrou indicadores claros, verificar se ainda está na página de login
      const loginFormExists = await this.page.locator('input[type="password"]').count() > 0;
      return !loginFormExists;
    } catch (error) {
      console.warn('⚠️ Erro ao verificar login:', error.message);
      // Em caso de dúvida, assumir que não está logado
      return false;
    }
  }

  /**
   * Faz login no portal Canopus
   */
  async login() {
    try {
      if (this.isLoggedIn) {
        // Verificar se ainda está logado
        const stillLoggedIn = await this.verifyLoginSuccess();
        if (stillLoggedIn) {
          console.log('ℹ️  Já está logado');
          return true;
        } else {
          console.log('⚠️  Sessão expirada, fazendo novo login...');
          this.isLoggedIn = false;
        }
      }

      if (!this.page) {
        throw new Error('Navegador não inicializado. Chame initBrowser() primeiro.');
      }

      console.log('🔐 Fazendo login no Canopus...');
      console.log(`   URL: ${config.canopus.url}`);
      console.log(`   Usuário: ${config.canopus.username}`);
      
      // Validar credenciais
      if (!config.canopus.username || !config.canopus.password) {
        throw new Error('Credenciais não configuradas no .env (CANOPUS_USERNAME e CANOPUS_PASSWORD)');
      }
      
      // Navegar para a página de login usando método tolerante
      await this.navigateTo(config.canopus.url);

      // IMPORTANTE: Os seletores abaixo são EXEMPLOS
      // Você precisa ajustá-los de acordo com o site real da Canopus
      
      // Aguardar um pouco mais para garantir que elementos dinâmicos carregaram
      console.log('⏳ Aguardando elementos da página carregarem...');
      await this.page.waitForTimeout(3000); // Aumentado para 3 segundos
      
      // Debug: Listar todos os inputs encontrados na página
      console.log('🔍 Procurando campos de formulário...');
      try {
        const allInputs = await this.page.locator('input').all();
        console.log(`   Encontrados ${allInputs.length} campos input na página`);
        for (let i = 0; i < Math.min(allInputs.length, 5); i++) {
          try {
            const input = allInputs[i];
            const type = await input.getAttribute('type') || 'text';
            const name = await input.getAttribute('name') || '';
            const id = await input.getAttribute('id') || '';
            const placeholder = await input.getAttribute('placeholder') || '';
            console.log(`   Input ${i + 1}: type="${type}", name="${name}", id="${id}", placeholder="${placeholder}"`);
          } catch (e) {
            // Ignorar erros ao ler atributos
          }
        }
      } catch (e) {
        console.log('   ⚠️  Não foi possível listar inputs');
      }
      
      // Procurar campo de usuário com múltiplas tentativas e estratégias
      const usernameSelectors = [
        // Seletores Angular Material (Canopus específico)
        'input[formcontrolname="Usuario"]',
        'input[formControlName="Usuario"]',
        'input#mat-input-1',
        'input.mat-input-element[formcontrolname="Usuario"]',
        // Seletores específicos
        'input[name="username"]',
        'input[name="user"]',
        'input[name="email"]',
        'input[name="login"]',
        'input[name="usuario"]',
        'input[id="username"]',
        'input[id="user"]',
        'input[id="email"]',
        'input[id="login"]',
        'input[id="usuario"]',
        // Seletores por placeholder (case insensitive)
        'input[placeholder*="usuário" i]',
        'input[placeholder*="usuario" i]',
        'input[placeholder*="email" i]',
        'input[placeholder*="login" i]',
        'input[placeholder*="user" i]',
        // Seletores por label associado
        'label:has-text("usuário") + input, label:has-text("usuario") + input',
        'label:has-text("email") + input',
        'label:has-text("login") + input',
        'label:has-text("user") + input',
        // Buscar por label e depois o input relacionado
        'input[aria-label*="usuário" i], input[aria-label*="usuario" i]',
        'input[aria-label*="email" i]',
        'input[aria-label*="login" i]',
        // Seletores genéricos (última tentativa)
        'input[type="text"]:not(input[type="password"])',
        'form input[type="text"]:first-of-type',
        'input:not([type="password"]):not([type="submit"]):not([type="button"]):not([type="hidden"])'
      ];

      let usernameFilled = false;
      let lastError = null;
      
      for (const selector of usernameSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          if (elements.length > 0) {
            // Tentar o primeiro elemento visível
            for (const element of elements) {
              try {
                if (await element.isVisible({ timeout: 1000 })) {
                  // Verificar se não é campo de senha
                  const type = await element.getAttribute('type');
                  if (type === 'password') continue;
                  
                  await this.fillAngularField(element, config.canopus.username);
                  console.log(`✅ Usuário preenchido (seletor: ${selector})`);
                  usernameFilled = true;
                  break;
                }
              } catch (e) {
                // Tentar próximo elemento
              }
            }
            if (usernameFilled) break;
          }
        } catch (e) {
          lastError = e;
          // Tentar próximo seletor
        }
      }

      // Se ainda não encontrou, tentar estratégia mais agressiva: pegar primeiro input text visível
      if (!usernameFilled) {
        console.log('⚠️  Tentando estratégia alternativa: primeiro input text visível...');
        try {
          const allTextInputs = await this.page.locator('input[type="text"], input:not([type])').all();
          for (const input of allTextInputs) {
            try {
              if (await input.isVisible({ timeout: 1000 })) {
                const type = await input.getAttribute('type');
                if (type === 'password' || type === 'hidden' || type === 'submit' || type === 'button') continue;
                
                await this.fillAngularField(input, config.canopus.username);
                console.log('✅ Usuário preenchido (primeiro input text visível)');
                usernameFilled = true;
                break;
              }
            } catch (e) {
              // Continuar
            }
          }
        } catch (e) {
          // Ignorar
        }
      }

      if (!usernameFilled) {
        console.error('❌ Não foi possível encontrar o campo de usuário.');
        console.error('💡 Dicas:');
        console.error('   1. Inspecione a página no navegador para encontrar o seletor correto');
        console.error('   2. Adicione o seletor correto em src/services/canopus-rpa.service.js');
        throw new Error('Não foi possível encontrar o campo de usuário. Verifique os seletores no código.');
      }

      // Procurar campo de senha
      const passwordSelectors = [
        // Seletores Angular Material (Canopus específico)
        'input[type="password"][formcontrolname="Senha"]',
        'input[type="password"][formControlName="Senha"]',
        'input#mat-input-2',
        'input[formcontrolname="Senha"]',
        'input.mat-input-element[type="password"][formcontrolname="Senha"]',
        // Seletores específicos
        'input[name="password"]',
        'input[name="senha"]',
        'input[type="password"]',
        'input[id="password"]',
        'input[id="senha"]',
        // Seletores por placeholder
        'input[placeholder*="senha" i]',
        'input[placeholder*="password" i]',
        // Seletores por label associado
        'label:has-text("senha") + input, label:has-text("password") + input',
        // Buscar por aria-label
        'input[aria-label*="senha" i], input[aria-label*="password" i]',
        // Seletor genérico (última tentativa)
        'input[type="password"]'
      ];

      let passwordFilled = false;
      
      for (const selector of passwordSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          if (elements.length > 0) {
            // Tentar o primeiro elemento visível
            for (const element of elements) {
              try {
                if (await element.isVisible({ timeout: 1000 })) {
                  await this.fillAngularField(element, config.canopus.password);
                  console.log(`✅ Senha preenchida (seletor: ${selector})`);
                  passwordFilled = true;
                  break;
                }
              } catch (e) {
                // Tentar próximo elemento
              }
            }
            if (passwordFilled) break;
          }
        } catch (e) {
          // Tentar próximo seletor
        }
      }

      // Se ainda não encontrou, tentar pegar primeiro input password visível
      if (!passwordFilled) {
        console.log('⚠️  Tentando estratégia alternativa: primeiro input password visível...');
        try {
          const allPasswordInputs = await this.page.locator('input[type="password"]').all();
          for (const input of allPasswordInputs) {
            try {
              if (await input.isVisible({ timeout: 1000 })) {
                await this.fillAngularField(input, config.canopus.password);
                console.log('✅ Senha preenchida (primeiro input password visível)');
                passwordFilled = true;
                break;
              }
            } catch (e) {
              // Continuar
            }
          }
        } catch (e) {
          // Ignorar
        }
      }

      if (!passwordFilled) {
        console.error('❌ Não foi possível encontrar o campo de senha.');
        console.error('💡 Dicas:');
        console.error('   1. Inspecione a página no navegador para encontrar o seletor correto');
        console.error('   2. Adicione o seletor correto em src/services/canopus-rpa.service.js');
        throw new Error('Não foi possível encontrar o campo de senha. Verifique os seletores no código.');
      }

      // Aguardar um pouco para Angular processar as mudanças e validar o formulário
      // Simular comportamento humano: pequeno movimento de mouse
      console.log('⏳ Aguardando validação do formulário Angular...');
      await this.simulateMouseMovement();
      await this.humanDelay(2000, 4000);

      // Procurar botão de login
      const loginButtonSelectors = [
        // Seletores Angular Material (Canopus específico)
        'button[aria-label="LOG IN"]',
        'button.submit-button',
        'button.mat-raised-button[color="accent"]',
        'button:has-text("ACESSAR")',
        'button:has-text("Acessar")',
        'button:has-text("acessar")',
        'button.mat-button-base.submit-button',
        // Seletores específicos por tipo
        'button[type="submit"]',
        'input[type="submit"]',
        // Seletores por texto (case insensitive)
        'button:has-text("Entrar")',
        'button:has-text("entrar")',
        'button:has-text("Login")',
        'button:has-text("login")',
        'button:has-text("Sign in")',
        'button:has-text("sign in")',
        // Seletores por classe
        'button.btn-login',
        'button.btn-primary',
        'button.btn-submit',
        'button[class*="login"]',
        'button[class*="submit"]',
        'button[class*="entrar"]',
        // Seletores genéricos
        'form button[type="submit"]',
        'form button:not([type="button"])',
        'form button:last-of-type',
        // Buscar dentro do form
        'form input[type="submit"]',
        'form button'
      ];

      let buttonClicked = false;
      
      for (const selector of loginButtonSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          if (elements.length > 0) {
            // Tentar o primeiro elemento visível e clicável
            for (const element of elements) {
              try {
                if (await element.isVisible({ timeout: 1000 })) {
                  // Mover mouse para o botão antes de clicar (comportamento humano)
                  const box = await element.boundingBox();
                  if (box) {
                    await this.page.mouse.move(
                      box.x + box.width / 2 + (Math.random() - 0.5) * 5,
                      box.y + box.height / 2 + (Math.random() - 0.5) * 5,
                      { steps: 2 + Math.floor(Math.random() * 2) }
                    );
                    await this.humanDelay(100, 200);
                  }
                  await element.click();
                  console.log(`🔘 Botão de login clicado (seletor: ${selector})`);
                  buttonClicked = true;
                  break;
                }
              } catch (e) {
                // Tentar próximo elemento
              }
            }
            if (buttonClicked) break;
          }
        } catch (e) {
          // Tentar próximo seletor
        }
      }

      // Se ainda não encontrou, tentar estratégias alternativas
      if (!buttonClicked) {
        console.log('⚠️  Tentando estratégias alternativas para o botão de login...');
        
        // Estratégia 1: Pressionar Enter no campo de senha
        try {
          const passwordField = await this.page.locator('input[type="password"]').first();
          if (await passwordField.isVisible({ timeout: 1000 })) {
            await passwordField.press('Enter');
            console.log('🔘 Enter pressionado no campo de senha');
            buttonClicked = true;
          }
        } catch (e) {
          // Tentar próxima estratégia
        }
        
        // Estratégia 2: Buscar qualquer botão no form
        if (!buttonClicked) {
          try {
            const formButtons = await this.page.locator('form button, form input[type="submit"]').all();
            for (const btn of formButtons) {
              try {
                if (await btn.isVisible({ timeout: 1000 })) {
                  await btn.click();
                  console.log('🔘 Botão clicado (qualquer botão do form)');
                  buttonClicked = true;
                  break;
                }
              } catch (e) {
                // Continuar
              }
            }
          } catch (e) {
            // Ignorar
          }
        }
        
        // Estratégia 3: Submeter formulário diretamente (para Angular forms)
        if (!buttonClicked) {
          try {
            const form = await this.page.locator('form').first();
            if (await form.isVisible({ timeout: 1000 })) {
              await form.evaluate((formEl) => {
                // Disparar evento submit no formulário
                formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
              });
              console.log('🔘 Formulário submetido diretamente');
              buttonClicked = true;
            }
          } catch (e) {
            // Ignorar
          }
        }
      }

      if (!buttonClicked) {
        console.error('❌ Não foi possível encontrar o botão de login.');
        console.error('💡 Dicas:');
        console.error('   1. Inspecione a página no navegador para encontrar o seletor correto');
        console.error('   2. Adicione o seletor correto em src/services/canopus-rpa.service.js');
        throw new Error('Não foi possível encontrar o botão de login. Verifique os seletores no código.');
      }

      // Aguardar navegação após login
      console.log('⏳ Aguardando resposta do servidor após login...');
      const initialUrl = this.page.url();
      try {
        // Aguardar por mudança de URL (indicando redirecionamento após login)
        try {
          await this.page.waitForFunction(
            (url) => window.location.href !== url,
            initialUrl,
            { timeout: 30000 } // Aumentado para 30 segundos
          );
          console.log('✅ URL mudou após login');
        } catch (e) {
          // URL não mudou, continuar
          console.log('ℹ️  URL não mudou, continuando...');
        }
        
        // Aguardar carregamento da página
        try {
          await this.page.waitForLoadState('load', { timeout: 30000 }); // Aumentado para 30 segundos
          console.log('✅ Página carregada completamente');
        } catch (e) {
          console.log('⚠️  Aguardando carregamento básico...');
          await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }); // Aumentado para 15 segundos
        }
      } catch (error) {
        // Continuar mesmo se não conseguir esperar
        console.log('⚠️  Continuando sem esperar load state completo');
      }
      await this.page.waitForTimeout(5000); // Aumentado para 5 segundos para garantir

      // Verificar se o login foi bem-sucedido
      const loginSuccessful = await this.verifyLoginSuccess();
      
      if (!loginSuccessful) {
        // Verificar se há mensagens de erro visíveis relacionadas a credenciais
        const pageText = await this.page.textContent('body');
        const credentialErrorKeywords = ['usuário.*inválido', 'senha.*incorreta', 'credenciais.*inválidas', 'invalid.*credentials'];
        const hasCredentialError = credentialErrorKeywords.some(keyword => {
          const regex = new RegExp(keyword, 'i');
          return regex.test(pageText);
        });

        if (hasCredentialError) {
          console.error('\n❌ ERRO DE CREDENCIAIS DETECTADO');
          console.error('   A automação está funcionando corretamente, mas as credenciais estão incorretas.');
          console.error('   Verifique no arquivo .env:');
          console.error(`   - CANOPUS_USERNAME=${config.canopus.username}`);
          console.error(`   - CANOPUS_PASSWORD=${'*'.repeat(config.canopus.password.length)}`);
          console.error('\n💡 Dica: Verifique se o usuário e senha estão corretos no arquivo .env\n');
          throw new Error('Login falhou: Credenciais inválidas. Verifique CANOPUS_USERNAME e CANOPUS_PASSWORD no arquivo .env');
        } else {
          // Verificar outros tipos de erro
          const errorKeywords = ['erro', 'inválido', 'incorreto', 'falhou', 'error', 'invalid', 'incorrect'];
          const hasError = errorKeywords.some(keyword => 
            pageText.toLowerCase().includes(keyword)
          );

          if (hasError) {
            throw new Error('Login falhou. Verifique os logs para ver o erro específico.');
          } else {
            // Se não encontrou erro explícito, mas também não confirmou sucesso, assumir falha
            throw new Error('Não foi possível confirmar se o login foi bem-sucedido.');
          }
        }
      }

      this.isLoggedIn = true;
      console.log('✅ Primeiro login realizado com sucesso!');
      console.log(`   URL atual: ${this.page.url()}`);
      
      // Após o primeiro login, fazer login na segunda página
      console.log('\n🔐 Fazendo login na segunda página do sistema...');
      await this.loginSecondPage();
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao fazer login:', error.message);
      this.isLoggedIn = false;
      throw error;
    }
  }

  /**
   * Faz login na segunda página do sistema (AFV)
   */
  async loginSecondPage() {
    try {
      const secondLoginUrl = 'https://afv.consorciocanopus.com.br/Sistema/';
      
      console.log(`🔐 Navegando para segunda página de login: ${secondLoginUrl}`);
      
      // Simular leitura da página antes de tentar navegar
      console.log('📖 Simulando leitura da página...');
      await this.simulatePageReading();
      
      // Verificar se é um bom horário (pode ajudar em alguns casos)
      if (!this.isGoodTimeToRetry()) {
        console.log('⏰ Fora do horário comercial, aguardando um pouco mais...');
        await this.humanDelay(5000, 10000);
      }
      
      // Estratégia 0: Tentar window.location.href DIRETAMENTE primeiro (mais rápido e pode evitar bloqueios)
      // Isso funciona melhor em VPS porque não cria nova conexão TCP
      let navigationSuccess = false;
      try {
        console.log('🔍 Estratégia 0: Tentando window.location.href diretamente (mais rápido, evita bloqueios)...');
        const currentUrl = this.page.url();
        console.log(`   🔧 Navegando de ${currentUrl} para ${secondLoginUrl} usando window.location.href...`);
        
        // Aguardar um pouco antes de navegar (comportamento humano) - aumentar delay
        await this.humanDelay(3000, 6000);
        
        // Tentar múltiplas formas de navegação JavaScript
        const navSuccess = await this.page.evaluate((url) => {
          try {
            // Método 1: window.location.href (mais comum)
            window.location.href = url;
            return true;
          } catch (e1) {
            try {
              // Método 2: window.location.replace (não adiciona ao histórico)
              window.location.replace(url);
              return true;
            } catch (e2) {
              try {
                // Método 3: window.location.assign
                window.location.assign(url);
                return true;
              } catch (e3) {
                return false;
              }
            }
          }
        }, secondLoginUrl);
        
        if (!navSuccess) {
          console.log(`   ⚠️  Não foi possível executar navegação JavaScript`);
        }
        
        // Aguardar navegação acontecer - aumentar tempo de espera
        console.log(`   ⏳ Aguardando navegação (pode levar até 15 segundos)...`);
        await this.humanDelay(5000, 8000);
        
        // Verificar se navegou - tentar múltiplas vezes com delays crescentes
        for (let checkAttempt = 1; checkAttempt <= 3; checkAttempt++) {
          let newUrl = this.page.url();
          console.log(`   📍 Verificação ${checkAttempt}/3 - URL atual: ${newUrl}`);
          
          if (newUrl.includes('afv.consorciocanopus.com.br')) {
            console.log(`✅ Navegação via window.location.href bem-sucedida! URL: ${newUrl}`);
            navigationSuccess = true;
            break;
          } else if (checkAttempt < 3) {
            const waitTime = checkAttempt * 3000;
            console.log(`   ⏳ Aguardando mais ${waitTime/1000}s antes de verificar novamente...`);
            await this.humanDelay(waitTime, waitTime + 2000);
          }
        }
        
        // Última verificação
        if (!navigationSuccess) {
          const finalUrl = this.page.url();
          console.log(`   ⚠️  window.location.href não funcionou após todas as tentativas, URL ainda: ${finalUrl}`);
          console.log(`   💡 Tentando outras estratégias...`);
        }
      } catch (e) {
        const errorMsg = e.message || String(e);
        console.log(`⚠️  Estratégia 0 falhou: ${errorMsg.substring(0, 100)}`);
        console.log(`   💡 Tentando outras estratégias...`);
      }
      
      // Estratégia 1: Tentar encontrar e clicar no botão específico que leva para a segunda página
      // (só tenta se Estratégia 0 falhou)
      
      if (!navigationSuccess) {
        try {
          console.log('🔍 Estratégia 1: Procurando botão span.nav-link-title.ng-star-inserted...');
          
          // Aguardar página carregar completamente antes de procurar - aumentar delay
          await this.humanDelay(5000, 8000);
          await this.simulatePageReading();
          await this.simulateMouseMovement();
          
          // Primeiro, tentar o seletor específico fornecido pelo usuário
        const specificButtonSelectors = [
          'span.nav-link-title.ng-star-inserted',
          'span[class*="nav-link-title"][class*="ng-star-inserted"]',
          '.nav-link-title.ng-star-inserted',
          'span.nav-link-title'
        ];
        
        for (const selector of specificButtonSelectors) {
          try {
            console.log(`   🔍 Tentando seletor: ${selector}`);
            const buttons = await this.page.locator(selector).all();
            console.log(`   📊 Encontrados ${buttons.length} elementos com este seletor`);
            
            // Filtrar apenas botões que contenham "AFV" no texto
            for (const button of buttons) {
              try {
                if (await button.isVisible({ timeout: 3000 })) {
                  const text = await button.textContent() || '';
                  const className = await button.getAttribute('class') || '';
                  
                  // Verificar se o texto contém "AFV" (case insensitive)
                  const textLower = text.toLowerCase().trim();
                  if (!textLower.includes('afv')) {
                    console.log(`   ⏭️  Pulando botão "${text}" - não contém "AFV"`);
                    continue;
                  }
                  
                  console.log(`   ✅ Botão AFV encontrado: texto="${text}" class="${className}"`);
                  
                  // Tentar extrair URL real do link antes de clicar
                  let extractedUrl = null;
                  let linkTarget = null;
                  let hasOnClick = false;
                  try {
                    // Tentar encontrar um link pai (a tag) que contém este span
                    const parentLink = await button.locator('xpath=ancestor::a').first();
                    if (await parentLink.count() > 0) {
                      extractedUrl = await parentLink.getAttribute('href');
                      linkTarget = await parentLink.getAttribute('target');
                      
                      console.log(`   🔍 Debug: href extraído = ${extractedUrl || 'null'}`);
                      
                      // Verificar se o link usa JavaScript
                      hasOnClick = await parentLink.evaluate(el => {
                        return el.onclick !== null || el.getAttribute('onclick') !== null || 
                               (el.href && el.href.startsWith('javascript:'));
                      });
                      
                      // Se não tem href, tentar extrair de data attributes ou outros lugares
                      if (!extractedUrl) {
                        extractedUrl = await parentLink.evaluate(el => {
                          // Tentar data-href, data-url, ou onclick que contenha URL
                          return el.getAttribute('data-href') || 
                                 el.getAttribute('data-url') ||
                                 (el.getAttribute('onclick') && el.getAttribute('onclick').match(/['"](https?:\/\/[^'"]+)['"]/)?.[1]) ||
                                 null;
                        });
                        if (extractedUrl) {
                          console.log(`   🔍 URL extraída de data attribute: ${extractedUrl}`);
                        }
                      }
                      
                      if (extractedUrl) {
                        // Se for URL relativa, converter para absoluta
                        if (extractedUrl.startsWith('/')) {
                          const baseUrl = new URL(this.page.url()).origin;
                          extractedUrl = baseUrl + extractedUrl;
                        } else if (!extractedUrl.startsWith('http') && !extractedUrl.startsWith('javascript:')) {
                          const baseUrl = new URL(this.page.url()).origin;
                          extractedUrl = baseUrl + '/' + extractedUrl;
                        }
                        console.log(`   🔗 URL extraída do link: ${extractedUrl}`);
                        console.log(`   🎯 Target do link: ${linkTarget || 'mesma página'}`);
                        if (hasOnClick) {
                          console.log(`   ⚠️  Link usa JavaScript para navegar`);
                        }
                      } else {
                        console.log(`   ⚠️  Não foi possível extrair URL do link - pode usar JavaScript puro`);
                        // Se não conseguiu extrair URL, usar URL hardcoded como fallback
                        extractedUrl = 'https://afv.consorciocanopus.com.br/Sistema/';
                        console.log(`   💡 Usando URL hardcoded como fallback: ${extractedUrl}`);
                      }
                    } else {
                      console.log(`   ⚠️  Não foi encontrado link pai - usando URL hardcoded`);
                      extractedUrl = 'https://afv.consorciocanopus.com.br/Sistema/';
                    }
                  } catch (e) {
                    console.log(`   ⚠️  Erro ao extrair URL: ${e.message.substring(0, 50)}`);
                    // Usar URL hardcoded como fallback
                    extractedUrl = 'https://afv.consorciocanopus.com.br/Sistema/';
                    console.log(`   💡 Usando URL hardcoded como fallback: ${extractedUrl}`);
                  }
                  
                  // Mover mouse para o botão antes de clicar (comportamento humano)
                  const box = await button.boundingBox();
                  if (box) {
                    await this.page.mouse.move(
                      box.x + box.width / 2 + (Math.random() - 0.5) * 5,
                      box.y + box.height / 2 + (Math.random() - 0.5) * 5,
                      { steps: 2 + Math.floor(Math.random() * 2) }
                    );
                    await this.humanDelay(100, 200);
                  }
                  
                  // Clicar no botão e aguardar navegação
                  const initialUrl = this.page.url();
                  console.log(`   🖱️  Clicando no botão AFV... URL atual: ${initialUrl}`);
                  
                  // Verificar se há um link pai que pode ser clicado
                  let clickableElement = button;
                  try {
                    // Tentar encontrar um link pai (a tag) que contém este span
                    const parentLink = await button.locator('xpath=ancestor::a').first();
                    if (await parentLink.count() > 0) {
                      clickableElement = parentLink;
                      console.log('   📎 Encontrado link pai, clicando no link em vez do span');
                    }
                  } catch (e) {
                    // Continuar com o span
                  }
                  
                  // Se extraímos uma URL e ela aponta para AFV, usar navegação direta como fallback
                  if (extractedUrl && extractedUrl.includes('afv.consorciocanopus.com.br')) {
                    console.log(`   💡 URL extraída aponta para AFV, será usada como fallback se o clique falhar`);
                  }
                  
                  // Se o link usa JavaScript, tentar executar antes do clique normal
                  if (hasOnClick && extractedUrl && extractedUrl.includes('afv.consorciocanopus.com.br')) {
                    try {
                      console.log('   🔧 Link usa JavaScript, tentando executar onclick...');
                      const parentLink = await button.locator('xpath=ancestor::a').first();
                      if (await parentLink.count() > 0) {
                        await parentLink.evaluate(el => {
                          // Tentar executar onclick se existir
                          if (el.onclick) {
                            el.onclick();
                          } else if (el.getAttribute('onclick')) {
                            eval(el.getAttribute('onclick'));
                          }
                          // Se não funcionar e tiver href válido, usar window.location
                          if (el.href && !el.href.startsWith('javascript:')) {
                            window.location.href = el.href;
                          }
                        });
                        await this.humanDelay(3000, 5000);
                        
                        // Verificar se navegou
                        const jsNavUrl = this.page.url();
                        if (jsNavUrl.includes('afv.consorciocanopus.com.br')) {
                          console.log(`✅ Navegação via JavaScript bem-sucedida! URL: ${jsNavUrl}`);
                          navigationSuccess = true;
                          break;
                        }
                      }
                    } catch (jsError) {
                      console.log(`   ⚠️  Navegação JavaScript falhou: ${jsError.message.substring(0, 50)}`);
                    }
                  }
                  
                  // Aguardar por possíveis novas páginas/abas (aumentar timeout para links com target="_blank")
                  const pageTimeout = linkTarget === '_blank' ? 15000 : 10000;
                  const pagePromise = this.context.waitForEvent('page', { timeout: pageTimeout }).catch(() => null);
                  
                  try {
                    await Promise.all([
                      this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
                      pagePromise,
                      clickableElement.click({ timeout: 5000 })
                    ]);
                  } catch (clickError) {
                    // Se falhar, tentar JavaScript click
                    console.log('   ⚠️  Click normal falhou, tentando JavaScript click...');
                    await clickableElement.evaluate(el => {
                      // Tentar clicar no elemento ou no link pai
                      if (el.tagName === 'A') {
                        el.click();
                      } else {
                        const link = el.closest('a');
                        if (link) {
                          link.click();
                        } else {
                          el.click();
                        }
                      }
                    });
                    await this.humanDelay(2000, 4000);
                  }
                  
                  // Verificar se uma nova página foi aberta
                  const newPage = await pagePromise;
                  if (newPage) {
                    console.log('   🆕 Nova página/aba detectada!');
                    // Fechar página antiga e usar a nova
                    await this.page.close().catch(() => {});
                    this.page = newPage;
                    await this.page.setDefaultTimeout(120000);
                    await this.humanDelay(2000, 4000);
                  } else {
                    await this.humanDelay(2000, 4000);
                  }
                  
                  // Verificar se navegou para a URL correta
                  const currentUrl = this.page.url();
                  console.log(`   📍 URL após clique: ${currentUrl}`);
                  
                  // Verificar se estamos no domínio AFV
                  if (currentUrl.includes('afv.consorciocanopus.com.br')) {
                    console.log(`✅ Navegação bem-sucedida para AFV! URL atual: ${currentUrl}`);
                    navigationSuccess = true;
                    break;
                  } else if (currentUrl !== initialUrl && currentUrl.includes('consorciocanopus.com.br')) {
                    // Se mudou de URL mas ainda não está no AFV, pode estar em uma página intermediária
                    console.log(`   ⚠️  URL mudou mas ainda não está no AFV. Aguardando mais...`);
                    await this.humanDelay(3000, 5000);
                    
                    // Verificar novamente
                    const finalUrl = this.page.url();
                    if (finalUrl.includes('afv.consorciocanopus.com.br')) {
                      console.log(`✅ Navegação bem-sucedida para AFV após espera! URL: ${finalUrl}`);
                      navigationSuccess = true;
                      break;
                    } else {
                      console.log(`   ⚠️  Ainda não está no AFV. URL atual: ${finalUrl}`);
                    }
                  } else {
                    console.log(`   ⚠️  URL não mudou ou não é a página esperada. Tentando navegação direta...`);
                    
                    // Se temos uma URL extraída e o clique não funcionou, tentar navegação direta
                    if (extractedUrl && extractedUrl.includes('afv.consorciocanopus.com.br')) {
                      console.log(`   🔄 Tentando navegação direta com URL: ${extractedUrl}`);
                      
                      // Primeiro, tentar usar window.location.href na página ATUAL (mais natural, mantém sessão)
                      try {
                        console.log(`   🔧 Tentando window.location.href na página atual...`);
                        await this.page.evaluate((url) => {
                          window.location.href = url;
                        }, extractedUrl);
                        
                        // Aguardar navegação acontecer
                        await this.humanDelay(3000, 5000);
                        
                        // Verificar se navegou
                        const jsNavUrl = this.page.url();
                        console.log(`   📍 URL após window.location.href: ${jsNavUrl}`);
                        
                        if (jsNavUrl.includes('afv.consorciocanopus.com.br')) {
                          console.log(`   ✅ Navegação via window.location bem-sucedida! URL: ${jsNavUrl}`);
                          navigationSuccess = true;
                          break;
                        } else {
                          console.log(`   ⚠️  window.location.href não mudou para AFV, tentando aguardar mais...`);
                          // Aguardar mais um pouco - pode estar carregando
                          await this.humanDelay(5000, 8000);
                          const finalUrl = this.page.url();
                          if (finalUrl.includes('afv.consorciocanopus.com.br')) {
                            console.log(`   ✅ Navegação bem-sucedida após espera adicional! URL: ${finalUrl}`);
                            navigationSuccess = true;
                            break;
                          }
                        }
                      } catch (jsNavError) {
                        console.log(`   ⚠️  Navegação JavaScript falhou: ${jsNavError.message.substring(0, 100)}`);
                      }
                      
                      // Se JavaScript não funcionou, tentar page.goto com mais opções
                      try {
                        console.log(`   🔄 Tentando page.goto com URL extraída...`);
                        await this.page.goto(extractedUrl, {
                          waitUntil: 'domcontentloaded',
                          timeout: 60000,
                          referer: initialUrl
                        });
                        await this.humanDelay(2000, 3000);
                        const directNavUrl = this.page.url();
                        if (directNavUrl.includes('afv.consorciocanopus.com.br')) {
                          console.log(`   ✅ Navegação direta bem-sucedida! URL: ${directNavUrl}`);
                          navigationSuccess = true;
                          break;
                        }
                      } catch (directNavError) {
                        const errorMsg = directNavError.message || String(directNavError);
                        console.log(`   ⚠️  Navegação direta também falhou: ${errorMsg.substring(0, 100)}`);
                        
                        // Se for connection reset, tentar uma última vez com timeout maior
                        if (errorMsg.includes('ERR_CONNECTION_RESET') || errorMsg.includes('Connection Reset')) {
                          console.log(`   🔄 Tentando novamente com timeout maior devido a connection reset...`);
                          try {
                            await this.humanDelay(5000, 8000);
                            await this.page.goto(extractedUrl, {
                              waitUntil: 'load',
                              timeout: 90000,
                              referer: initialUrl
                            });
                            await this.humanDelay(3000, 5000);
                            const retryNavUrl = this.page.url();
                            if (retryNavUrl.includes('afv.consorciocanopus.com.br')) {
                              console.log(`   ✅ Navegação após retry bem-sucedida! URL: ${retryNavUrl}`);
                              navigationSuccess = true;
                              break;
                            }
                          } catch (retryError) {
                            console.log(`   ❌ Retry também falhou: ${retryError.message.substring(0, 50)}`);
                          }
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                console.log(`   ⚠️  Erro ao processar botão: ${e.message.substring(0, 50)}`);
                // Continuar procurando
              }
            }
            if (navigationSuccess) break;
          } catch (e) {
            console.log(`   ⚠️  Erro com seletor ${selector}: ${e.message.substring(0, 50)}`);
            // Tentar próximo seletor
          }
        }
        
        // Se não encontrou com o seletor específico, tentar seletores alternativos
        if (!navigationSuccess) {
          console.log('🔍 Estratégia 1b: Procurando links alternativos...');
          
          const linkSelectors = [
            `a[href*="afv.consorciocanopus.com.br"]`,
            `a[href*="Sistema"]`,
            `a:has-text("Sistema")`,
            `a:has-text("AFV")`,
            `a[href*="/Sistema/"]`,
            `button:has-text("Sistema")`,
            `button:has-text("AFV")`
          ];
          
          for (const selector of linkSelectors) {
            try {
              const links = await this.page.locator(selector).all();
              for (const link of links) {
                try {
                  if (await link.isVisible({ timeout: 2000 })) {
                    const href = await link.getAttribute('href');
                    if (href && (href.includes('afv.consorciocanopus.com.br') || href.includes('/Sistema/'))) {
                      console.log(`✅ Link encontrado: ${href}`);
                      
                      // Mover mouse para o link antes de clicar
                      const box = await link.boundingBox();
                      if (box) {
                        await this.page.mouse.move(
                          box.x + box.width / 2 + (Math.random() - 0.5) * 5,
                          box.y + box.height / 2 + (Math.random() - 0.5) * 5,
                          { steps: 2 + Math.floor(Math.random() * 2) }
                        );
                        await this.humanDelay(100, 200);
                      }
                      
                      // Clicar no link e aguardar navegação
                      await Promise.all([
                        this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
                        link.click()
                      ]);
                      
                      await this.humanDelay(2000, 4000);
                      
                      // Verificar se navegou para a URL correta
                      const currentUrl = this.page.url();
                      if (currentUrl.includes('afv.consorciocanopus.com.br') || currentUrl.includes('/Sistema/')) {
                        console.log(`✅ Navegação bem-sucedida via link! URL atual: ${currentUrl}`);
                        navigationSuccess = true;
                        break;
                      }
                    }
                  }
                } catch (e) {
                  // Continuar procurando
                }
              }
              if (navigationSuccess) break;
            } catch (e) {
              // Tentar próximo seletor
            }
          }
          }
        } catch (e) {
          console.log(`⚠️  Estratégia 1 falhou: ${e.message.substring(0, 100)}`);
        }
      }
      
      // Estratégia 1.5: Tentar window.location.href na página atual ANTES de criar nova página
      // Isso pode funcionar melhor porque mantém a sessão e cookies da página atual
      if (!navigationSuccess) {
        try {
          console.log('🔍 Estratégia 1.5: Tentando window.location.href na página atual...');
          const currentUrl = this.page.url();
          const targetUrl = 'https://afv.consorciocanopus.com.br/Sistema/';
          
          // Aguardar mais tempo antes de tentar
          await this.humanDelay(5000, 10000);
          
          console.log(`   🔧 Navegando de ${currentUrl} para ${targetUrl} usando window.location.href...`);
          
          await this.page.evaluate((url) => {
            window.location.href = url;
          }, targetUrl);
          
          // Aguardar navegação acontecer - aumentar tempo
          await this.humanDelay(5000, 10000);
          
          // Verificar se navegou
          let newUrl = this.page.url();
          console.log(`   📍 URL após window.location.href: ${newUrl}`);
          
          if (newUrl.includes('afv.consorciocanopus.com.br')) {
            console.log(`✅ Navegação via window.location.href bem-sucedida! URL: ${newUrl}`);
            navigationSuccess = true;
          } else {
            // Aguardar mais um pouco - pode estar carregando ou redirecionando
            console.log(`   ⏳ Aguardando mais tempo para navegação completar...`);
            await this.humanDelay(5000, 8000);
            newUrl = this.page.url();
            console.log(`   📍 URL após espera adicional: ${newUrl}`);
            
            if (newUrl.includes('afv.consorciocanopus.com.br')) {
              console.log(`✅ Navegação bem-sucedida após espera! URL: ${newUrl}`);
              navigationSuccess = true;
            } else {
              console.log(`   ⚠️  window.location.href não funcionou, URL ainda: ${newUrl}`);
            }
          }
        } catch (e) {
          const errorMsg = e.message || String(e);
          console.log(`⚠️  Estratégia 1.5 falhou: ${errorMsg.substring(0, 100)}`);
        }
      }
      
      // Estratégia 2: Tentar criar nova página no mesmo contexto e navegar
      // IMPORTANTE: Manter cookies e sessão da primeira página
      if (!navigationSuccess) {
        try {
          console.log('🔍 Estratégia 2: Criando nova página no mesmo contexto...');
          
          // Aguardar um pouco antes de criar nova página (comportamento humano)
          await this.humanDelay(2000, 3000);
          
          // Obter URL atual e cookies da página atual para usar como referrer
          const currentUrl = this.page.url();
          const cookies = await this.context.cookies();
          
          console.log(`   📋 Copiando ${cookies.length} cookies da sessão atual...`);
          
          const newPage = await this.context.newPage();
          newPage.setDefaultTimeout(120000);
          
          // Definir cookies na nova página ANTES de navegar
          if (cookies.length > 0) {
            try {
              await newPage.context().addCookies(cookies);
              console.log(`   ✅ Cookies copiados para nova página`);
            } catch (cookieError) {
              console.log(`   ⚠️  Aviso: Não foi possível copiar todos os cookies: ${cookieError.message.substring(0, 50)}`);
            }
          }
          
          // Aguardar um pouco antes de navegar
          await this.humanDelay(1000, 2000);
          
          // Primeiro, tentar usar window.location.href (mais natural, mantém sessão melhor)
          let navigationWorked = false;
          try {
            console.log(`   🔧 Tentando window.location.href na nova página...`);
            await newPage.goto('about:blank'); // Navegar para página em branco primeiro
            await this.humanDelay(500, 1000);
            
            const jsNavSuccess = await newPage.evaluate((url) => {
              window.location.href = url;
              return true;
            }, secondLoginUrl);
            
            if (jsNavSuccess) {
              await this.humanDelay(3000, 5000);
              const jsNavUrl = newPage.url();
              if (jsNavUrl.includes('afv.consorciocanopus.com.br') || jsNavUrl.includes('/Sistema/')) {
                console.log(`   ✅ Navegação via window.location bem-sucedida! URL: ${jsNavUrl}`);
                await this.page.close().catch(() => {});
                this.page = newPage;
                navigationSuccess = true;
                navigationWorked = true;
              }
            }
          } catch (jsError) {
            console.log(`   ⚠️  Navegação JavaScript falhou: ${jsError.message.substring(0, 50)}`);
          }
          
          // Se JavaScript não funcionou, tentar page.goto
          if (!navigationWorked) {
            try {
              console.log(`   🔄 Tentando page.goto na nova página...`);
              // Primeiro, tentar com referrer e waitUntil
              await newPage.goto(secondLoginUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: 90000,
                referer: currentUrl // Adicionar referrer para parecer navegação natural
              });
            } catch (e) {
              // Se falhar, tentar sem waitUntil mas com referrer
              try {
                await newPage.goto(secondLoginUrl, { 
                  timeout: 90000,
                  referer: currentUrl
                });
              } catch (e2) {
                // Se ainda falhar, tentar sem referrer (última tentativa)
                try {
                  await newPage.goto(secondLoginUrl, { 
                    timeout: 90000,
                    waitUntil: 'load'
                  });
                } catch (e3) {
                  // Se tudo falhar, tentar uma última vez com timeout maior após delay
                  const errorMsg = e3.message || String(e3);
                  if (errorMsg.includes('ERR_CONNECTION_RESET') || errorMsg.includes('Connection Reset')) {
                    console.log(`   🔄 Connection reset detectado, aguardando antes de retry...`);
                    await this.humanDelay(5000, 8000);
                    try {
                      await newPage.goto(secondLoginUrl, {
                        waitUntil: 'load',
                        timeout: 120000,
                        referer: currentUrl
                      });
                    } catch (finalError) {
                      throw finalError; // Re-throw para ser capturado pelo catch externo
                    }
                  } else {
                    throw e3;
                  }
                }
              }
            }
            
            // Aguardar um pouco para garantir que a página carregou
            await this.humanDelay(2000, 3000);
            
            // Verificar se a navegação foi bem-sucedida
            const newPageUrl = newPage.url();
            if (newPageUrl.includes('afv.consorciocanopus.com.br') || newPageUrl.includes('/Sistema/')) {
              console.log(`✅ Navegação bem-sucedida na nova página! URL: ${newPageUrl}`);
              // Fechar página antiga e usar a nova
              await this.page.close().catch(() => {});
              this.page = newPage;
              navigationSuccess = true;
            } else {
              console.log(`   ⚠️  URL não corresponde ao esperado: ${newPageUrl}`);
              // Fechar nova página e continuar
              await newPage.close().catch(() => {});
            }
          }
        } catch (e) {
          const errorMsg = e.message || String(e);
          console.log(`⚠️  Estratégia 2 falhou: ${errorMsg.substring(0, 150)}`);
          // Se for connection reset, logar mais detalhes
          if (errorMsg.includes('ERR_CONNECTION_RESET') || errorMsg.includes('Connection Reset')) {
            console.log(`   🔍 Detalhes: Erro de conexão resetada - pode ser bloqueio do servidor ou problema de rede`);
            console.log(`   💡 Tentando estratégias alternativas...`);
          }
        }
      }
      
      // Estratégia 3: Navegação direta com retries (método navigateTo)
      if (!navigationSuccess) {
        console.log('🔍 Estratégia 3: Tentando navegação direta com retries...');
        await this.navigateTo(secondLoginUrl, { 
          maxRetries: 8, // Mais tentativas para a segunda página
          retryDelay: 15000 // 15 segundos entre tentativas
        });
        navigationSuccess = true;
      }
      
      // Aguardar elementos carregarem
      // Simular comportamento humano: movimento de mouse e scroll
      console.log('⏳ Aguardando elementos da segunda página carregarem...');
      await this.simulateMouseMovement();
      await this.humanScroll('down', 100);
      await this.humanDelay(3000, 6000);
      
      // Debug: Listar todos os inputs encontrados na página
      console.log('🔍 Procurando campos de formulário na segunda página...');
      try {
        const allInputs = await this.page.locator('input').all();
        console.log(`   Encontrados ${allInputs.length} campos input na página`);
        for (let i = 0; i < Math.min(allInputs.length, 10); i++) {
          try {
            const input = allInputs[i];
            const type = await input.getAttribute('type') || 'text';
            const name = await input.getAttribute('name') || '';
            const id = await input.getAttribute('id') || '';
            const placeholder = await input.getAttribute('placeholder') || '';
            const className = await input.getAttribute('class') || '';
            console.log(`   Input ${i + 1}: type="${type}", name="${name}", id="${id}", placeholder="${placeholder}", class="${className.substring(0, 50)}"`);
          } catch (e) {
            // Ignorar erros ao ler atributos
          }
        }
      } catch (e) {
        console.log('   ⚠️  Não foi possível listar inputs');
      }
      
      // Preencher campo de usuário - tentar múltiplos seletores com comportamento humano
      console.log('📝 Preenchendo campo de usuário...');
      const usernameSelectors = [
        'input[name="login"]',
        'input#login',
        'input[name="usuario"]',
        'input#usuario',
        'input[name="user"]',
        'input#user',
        'input[type="text"]:not(input[type="password"])',
        'form input[type="text"]:first-of-type',
        'input:not([type="password"]):not([type="submit"]):not([type="button"]):not([type="hidden"])'
      ];
      
      let usernameFilled = false;
      for (const selector of usernameSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          if (elements.length > 0) {
            for (const element of elements) {
              try {
                if (await element.isVisible({ timeout: 2000 })) {
                  const type = await element.getAttribute('type');
                  if (type === 'password' || type === 'submit' || type === 'button' || type === 'hidden') continue;
                  
                  // Usar fillAngularField para comportamento humano (mesmo que não seja Angular)
                  await this.fillAngularField(element, config.canopus.username);
                  console.log(`✅ Usuário preenchido na segunda página (seletor: ${selector})`);
                  usernameFilled = true;
                  break;
                }
              } catch (e) {
                // Tentar próximo elemento
              }
            }
            if (usernameFilled) break;
          }
        } catch (e) {
          // Tentar próximo seletor
        }
      }
      
      if (!usernameFilled) {
        throw new Error('Não foi possível encontrar o campo de usuário na segunda página. Verifique os seletores.');
      }
      
      // Preencher campo de senha - tentar múltiplos seletores com comportamento humano
      console.log('📝 Preenchendo campo de senha...');
      const passwordSelectors = [
        'input[name="senha"]',
        'input#senha',
        'input[name="password"]',
        'input#password',
        'input[type="password"]'
      ];
      
      let passwordFilled = false;
      for (const selector of passwordSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          if (elements.length > 0) {
            for (const element of elements) {
              try {
                if (await element.isVisible({ timeout: 2000 })) {
                  // Mover mouse para o campo antes de preencher
                  const box = await element.boundingBox();
                  if (box) {
                    await this.page.mouse.move(
                      box.x + box.width / 2 + (Math.random() - 0.5) * 10,
                      box.y + box.height / 2 + (Math.random() - 0.5) * 10,
                      { steps: 3 + Math.floor(Math.random() * 3) }
                    );
                    await this.humanDelay(100, 300);
                  }
                  
                  await element.click();
                  await this.humanDelay(200, 400);
                  
                  // Digitar com delay variável (simula digitação humana)
                  const typingDelay = 40 + Math.random() * 30; // 40-70ms entre caracteres
                  await element.type(config.canopus.password, { delay: typingDelay });
                  await this.humanDelay(300, 600);
                  
                  console.log(`✅ Senha preenchida na segunda página (seletor: ${selector})`);
                  passwordFilled = true;
                  break;
                }
              } catch (e) {
                // Tentar próximo elemento
              }
            }
            if (passwordFilled) break;
          }
        } catch (e) {
          // Tentar próximo seletor
        }
      }
      
      if (!passwordFilled) {
        throw new Error('Não foi possível encontrar o campo de senha na segunda página. Verifique os seletores.');
      }
      
      // Aguardar um pouco antes de clicar no botão (comportamento humano)
      await this.simulateMouseMovement();
      await this.humanDelay(800, 1500);
      
      // Clicar no botão de login - tentar múltiplos seletores
      console.log('🔘 Clicando no botão de login...');
      const loginButtonSelectors = [
        'input[type="submit"]',
        'button[type="submit"]',
        'input[value="Entrar"]',
        'button:has-text("Entrar")',
        'input.btn.btn-primary',
        'button.btn.btn-primary',
        'input[class*="btn"]',
        'button[class*="btn"]',
        'form input[type="submit"]',
        'form button[type="submit"]'
      ];
      
      let buttonClicked = false;
      for (const selector of loginButtonSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          if (elements.length > 0) {
            for (const element of elements) {
              try {
                if (await element.isVisible({ timeout: 2000 })) {
                  // Mover mouse para o botão antes de clicar
                  const box = await element.boundingBox();
                  if (box) {
                    await this.page.mouse.move(
                      box.x + box.width / 2 + (Math.random() - 0.5) * 5,
                      box.y + box.height / 2 + (Math.random() - 0.5) * 5,
                      { steps: 2 + Math.floor(Math.random() * 2) }
                    );
                    await this.humanDelay(100, 200);
                  }
                  await element.click();
                  console.log(`✅ Botão de login clicado (seletor: ${selector})`);
                  buttonClicked = true;
                  break;
                }
              } catch (e) {
                // Tentar próximo elemento
              }
            }
            if (buttonClicked) break;
          }
        } catch (e) {
          // Tentar próximo seletor
        }
      }
      
      if (!buttonClicked) {
        // Tentar estratégia alternativa: pressionar Enter no campo de senha
        try {
          const passwordField = await this.page.locator('input[type="password"]').first();
          if (await passwordField.isVisible({ timeout: 2000 })) {
            await passwordField.press('Enter');
            console.log('✅ Enter pressionado no campo de senha');
            buttonClicked = true;
          }
        } catch (e) {
          // Ignorar
        }
      }
      
      if (!buttonClicked) {
        throw new Error('Não foi possível encontrar o botão de login na segunda página. Verifique os seletores.');
      }
      
      // Aguardar navegação após login
      console.log('⏳ Aguardando resposta do servidor após segundo login...');
      await this.page.waitForTimeout(5000);
      
      try {
        await this.page.waitForLoadState('load', { timeout: 30000 });
        console.log('✅ Segunda página carregada completamente');
      } catch (e) {
        await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
        console.log('✅ Segunda página carregada (básico)');
      }
      
      await this.page.waitForTimeout(3000);
      console.log('✅ Segundo login realizado com sucesso!');
      console.log(`   URL atual: ${this.page.url()}`);
      
    } catch (error) {
      console.error('❌ Erro ao fazer login na segunda página:', error.message);
      throw error;
    }
  }

  /**
   * Navega para a página de listagem de planos, seleciona AUTOMOVEIS e captura dados
   */
  async navigateToPlansList() {
    try {
      const plansUrl = 'https://afv.consorciocanopus.com.br/Sistema/planos/listagem_planos.php';
      
      console.log(`📋 Navegando para página de planos: ${plansUrl}`);
      await this.navigateTo(plansUrl);
      
      // Aguardar página carregar completamente
      console.log('⏳ Aguardando página de planos carregar...');
      await this.page.waitForTimeout(5000);
      
      try {
        await this.page.waitForLoadState('load', { timeout: 30000 });
      } catch (e) {
        await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      }
      
      await this.page.waitForTimeout(3000);
      
      // Selecionar "AUTOMOVEIS" no dropdown
      console.log('🔽 Selecionando "AUTOMOVEIS" no dropdown...');
      await this.selectAutomoveis();
      
      // Aguardar grid atualizar após seleção
      console.log('⏳ Aguardando grid atualizar...');
      await this.page.waitForTimeout(5000);
      
      // Selecionar radio button para IPCA (mudar de fabricante para IPCA)
      console.log('📻 Selecionando radio button IPCA...');
      await this.selectReajusteIPCA();
      
      // Aguardar tabela atualizar após mudança do radio button
      console.log('⏳ Aguardando tabela atualizar após seleção do radio button...');
      await this.page.waitForTimeout(5000);
      
      // Aguardar tabela estar visível e carregada
      const table = await this.page.locator('table.table.no-more-tables.table-striped.table-hover.dataTable.no-footer, table.dataTable').first();
      await table.waitFor({ state: 'visible', timeout: 30000 });
      await this.page.waitForTimeout(3000);
      
      // Não extrair dados aqui - a extração será feita em generateCarQuotation
      // Isso evita criar múltiplos arquivos JSON
      
    } catch (error) {
      console.error('❌ Erro ao navegar para página de planos:', error.message);
      throw error;
    }
  }

  /**
   * Navega para a página de listagem de planos, seleciona IMOVEIS e captura dados
   * Não seleciona o radio button IPCA (diferente de AUTOMOVEIS)
   */
  async navigateToPlansListForImoveis() {
    try {
      const plansUrl = 'https://afv.consorciocanopus.com.br/Sistema/planos/listagem_planos.php';
      
      console.log(`📋 Navegando para página de planos: ${plansUrl}`);
      await this.navigateTo(plansUrl);
      
      // Aguardar página carregar completamente
      console.log('⏳ Aguardando página de planos carregar...');
      await this.page.waitForTimeout(5000);
      
      try {
        await this.page.waitForLoadState('load', { timeout: 30000 });
      } catch (e) {
        await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      }
      
      await this.page.waitForTimeout(3000);
      
      // Selecionar "IMOVEIS" no dropdown
      console.log('🔽 Selecionando "IMOVEIS" no dropdown...');
      await this.selectImoveis();
      
      // Aguardar grid atualizar após seleção
      console.log('⏳ Aguardando grid atualizar...');
      await this.page.waitForTimeout(5000);
      
      // NOTA: Para IMOVEIS, não selecionamos o radio button IPCA
      // A tabela já deve estar pronta após selecionar IMOVEIS
      
      // Aguardar tabela estar visível e carregada
      const table = await this.page.locator('table.table.no-more-tables.table-striped.table-hover.dataTable.no-footer, table.dataTable').first();
      await table.waitFor({ state: 'visible', timeout: 30000 });
      await this.page.waitForTimeout(3000);
      
      // Não extrair dados aqui - a extração será feita em generatePropertyQuotation
      // Isso evita criar múltiplos arquivos JSON
      
    } catch (error) {
      console.error('❌ Erro ao navegar para página de planos (IMOVEIS):', error.message);
      throw error;
    }
  }

  /**
   * Seleciona o radio button para reajuste IPCA
   */
  async selectReajusteIPCA() {
    try {
      console.log('🔍 Procurando radio button IPCA...');
      
      // Primeiro, verificar qual radio está selecionado atualmente
      const currentSelection = await this.page.evaluate(() => {
        const allRadios = document.querySelectorAll('input[type="radio"]');
        for (const radio of allRadios) {
          if (radio.checked) {
            return {
              id: radio.id,
              name: radio.name,
              value: radio.value,
              checked: true
            };
          }
        }
        return null;
      });
      
      if (currentSelection) {
        console.log(`ℹ️  Radio atual selecionado: ${currentSelection.value || currentSelection.id || 'desconhecido'}`);
      }
      
      // Procurar o span com id "ln_reajuste_ipca"
      const ipcaSpan = await this.page.locator('span#ln_reajuste_ipca').first();
      await ipcaSpan.waitFor({ state: 'visible', timeout: 15000 });
      console.log('✅ Span "ln_reajuste_ipca" encontrado');
      
      // Usar JavaScript para encontrar e selecionar o radio button de forma mais robusta
      const radioFound = await this.page.evaluate(() => {
        const span = document.getElementById('ln_reajuste_ipca');
        if (!span) {
          console.log('Span ln_reajuste_ipca não encontrado');
          return false;
        }
        
        // Estratégia 1: Procurar radio dentro do span
        let radio = span.querySelector('input[type="radio"]');
        
        // Estratégia 2: Procurar no parent
        if (!radio) {
          let parent = span.parentElement;
          let depth = 0;
          while (parent && depth < 5) {
            radio = parent.querySelector('input[type="radio"]');
            if (radio) break;
            parent = parent.parentElement;
            depth++;
          }
        }
        
        // Estratégia 3: Procurar por name comum (geralmente radio buttons têm o mesmo name)
        if (!radio) {
          // Procurar todos os radios e encontrar o que está relacionado ao span
          const allRadios = document.querySelectorAll('input[type="radio"]');
          const spanText = span.textContent || span.innerText || '';
          
          for (const r of allRadios) {
            // Verificar se o radio está próximo ao span
            const radioParent = r.parentElement;
            if (radioParent && (radioParent.contains(span) || span.parentElement?.contains(r))) {
              // Verificar se o value ou id contém "ipca"
              const value = (r.value || '').toLowerCase();
              const id = (r.id || '').toLowerCase();
              if (value.includes('ipca') || id.includes('ipca')) {
                radio = r;
                break;
              }
            }
          }
        }
        
        // Estratégia 4: Procurar por value ou id contendo "ipca"
        if (!radio) {
          const allRadios = document.querySelectorAll('input[type="radio"]');
          for (const r of allRadios) {
            const value = (r.value || '').toLowerCase();
            const id = (r.id || '').toLowerCase();
            const name = (r.name || '').toLowerCase();
            
            if (value.includes('ipca') || id.includes('ipca') || name.includes('ipca')) {
              radio = r;
              break;
            }
          }
        }
        
        if (radio) {
          // Desmarcar todos os radios do mesmo grupo (name)
          if (radio.name) {
            const sameGroupRadios = document.querySelectorAll(`input[type="radio"][name="${radio.name}"]`);
            sameGroupRadios.forEach(r => {
              r.checked = false;
              // Disparar evento change
              r.dispatchEvent(new Event('change', { bubbles: true }));
            });
          }
          
          // Marcar o radio IPCA
          radio.checked = true;
          
          // Disparar eventos necessários
          radio.dispatchEvent(new Event('click', { bubbles: true }));
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          radio.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Se o radio está dentro de um form, disparar evento no form também
          const form = radio.closest('form');
          if (form) {
            form.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          console.log('Radio IPCA selecionado:', {
            id: radio.id,
            name: radio.name,
            value: radio.value,
            checked: radio.checked
          });
          
          return true;
        }
        
        return false;
      });
      
      if (!radioFound) {
        // Tentar estratégia alternativa: clicar diretamente no span
        console.log('⚠️  Tentando clicar diretamente no span...');
        // Mover mouse para o span antes de clicar
        const box = await ipcaSpan.boundingBox();
        if (box) {
          await this.page.mouse.move(
            box.x + box.width / 2 + (Math.random() - 0.5) * 5,
            box.y + box.height / 2 + (Math.random() - 0.5) * 5,
            { steps: 2 + Math.floor(Math.random() * 2) }
          );
          await this.humanDelay(100, 200);
        }
        await ipcaSpan.click();
        await this.humanDelay(800, 1200);
        
        // Verificar se funcionou
        const clicked = await this.page.evaluate(() => {
          const span = document.getElementById('ln_reajuste_ipca');
          if (span) {
            // Procurar radio próximo novamente
            let radio = span.querySelector('input[type="radio"]');
            if (!radio) {
              let parent = span.parentElement;
              let depth = 0;
              while (parent && depth < 5) {
                radio = parent.querySelector('input[type="radio"]');
                if (radio) break;
                parent = parent.parentElement;
                depth++;
              }
            }
            return radio && radio.checked;
          }
          return false;
        });
        
        if (!clicked) {
          throw new Error('Não foi possível selecionar o radio button IPCA');
        }
      }
      
      // Aguardar um pouco e verificar se a seleção foi aplicada
      await this.page.waitForTimeout(2000);
      
      // Verificar se o radio IPCA está realmente selecionado
      const isSelected = await this.page.evaluate(() => {
        const span = document.getElementById('ln_reajuste_ipca');
        if (span) {
          // Procurar radio relacionado
          let radio = span.querySelector('input[type="radio"]');
          if (!radio) {
            let parent = span.parentElement;
            let depth = 0;
            while (parent && depth < 5) {
              radio = parent.querySelector('input[type="radio"]');
              if (radio) break;
              parent = parent.parentElement;
              depth++;
            }
          }
          
          // Se ainda não encontrou, procurar por value/id
          if (!radio) {
            const allRadios = document.querySelectorAll('input[type="radio"]');
            for (const r of allRadios) {
              const value = (r.value || '').toLowerCase();
              const id = (r.id || '').toLowerCase();
              if (value.includes('ipca') || id.includes('ipca')) {
                radio = r;
                break;
              }
            }
          }
          
          return radio ? radio.checked : false;
        }
        return false;
      });
      
      if (isSelected) {
        console.log('✅ Radio button IPCA selecionado com sucesso!');
      } else {
        console.warn('⚠️  Aviso: Não foi possível verificar se o radio IPCA está selecionado');
      }
      
    } catch (error) {
      console.error('❌ Erro ao selecionar radio button IPCA:', error.message);
      throw error;
    }
  }

  /**
   * Seleciona "AUTOMOVEIS" no dropdown
   */
  async selectAutomoveis() {
    try {
      // Procurar o span com texto "Selecione..."
      const selectSpan = await this.page.locator('span:has-text("Selecione...")').first();
      await selectSpan.waitFor({ state: 'visible', timeout: 15000 });
      
      console.log('✅ Span "Selecione..." encontrado');
      
      // Mover mouse para o dropdown antes de clicar (comportamento humano)
      const box = await selectSpan.boundingBox();
      if (box) {
        await this.page.mouse.move(
          box.x + box.width / 2 + (Math.random() - 0.5) * 5,
          box.y + box.height / 2 + (Math.random() - 0.5) * 5,
          { steps: 2 + Math.floor(Math.random() * 2) }
        );
        await this.humanDelay(100, 200);
      }
      
      // Clicar no span para abrir o dropdown
      await selectSpan.click();
      await this.humanDelay(800, 1500);
      
      // Procurar e clicar na opção "AUTOMOVEIS"
      // Pode ser um link, option, ou outro elemento dentro do dropdown
      const automoveisSelectors = [
        'text="AUTOMOVEIS"',
        'text="AUTOMÓVEIS"',
        'text="Automoveis"',
        'text="Automóveis"',
        'a:has-text("AUTOMOVEIS")',
        'a:has-text("AUTOMÓVEIS")',
        'option:has-text("AUTOMOVEIS")',
        'option:has-text("AUTOMÓVEIS")',
        '[value="AUTOMOVEIS"]',
        '[value="AUTOMÓVEIS"]',
        'li:has-text("AUTOMOVEIS")',
        'li:has-text("AUTOMÓVEIS")'
      ];
      
      let optionSelected = false;
      
      for (const selector of automoveisSelectors) {
        try {
          const option = await this.page.locator(selector).first();
          if (await option.isVisible({ timeout: 2000 })) {
            await option.click();
            console.log(`✅ Opção "AUTOMOVEIS" selecionada (seletor: ${selector})`);
            optionSelected = true;
            break;
          }
        } catch (e) {
          // Tentar próximo seletor
        }
      }
      
      // Se não encontrou, tentar estratégia alternativa: buscar por texto exato
      if (!optionSelected) {
        console.log('⚠️  Tentando estratégia alternativa para selecionar AUTOMOVEIS...');
        try {
          // Buscar todos os elementos clicáveis que contenham "AUTOMOVEIS" ou "AUTOMÓVEIS"
          const allElements = await this.page.locator('*').all();
          for (const element of allElements) {
            try {
              const text = await element.textContent();
              if (text && (text.includes('AUTOMOVEIS') || text.includes('AUTOMÓVEIS') || text.includes('Automoveis') || text.includes('Automóveis'))) {
                if (await element.isVisible({ timeout: 1000 })) {
                  // Mover mouse para a opção antes de clicar
                  const box = await element.boundingBox();
                  if (box) {
                    await this.page.mouse.move(
                      box.x + box.width / 2 + (Math.random() - 0.5) * 3,
                      box.y + box.height / 2 + (Math.random() - 0.5) * 3,
                      { steps: 2 }
                    );
                    await this.humanDelay(50, 150);
                  }
                  await element.click();
                  console.log('✅ Opção "AUTOMOVEIS" selecionada (busca por texto)');
                  optionSelected = true;
                  break;
                }
              }
            } catch (e) {
              // Continuar
            }
          }
        } catch (e) {
          // Ignorar
        }
      }
      
      if (!optionSelected) {
        throw new Error('Não foi possível encontrar e selecionar a opção "AUTOMOVEIS" no dropdown');
      }
      
      await this.page.waitForTimeout(2000);
      
    } catch (error) {
      console.error('❌ Erro ao selecionar AUTOMOVEIS:', error.message);
      throw error;
    }
  }

  /**
   * Seleciona "IMOVEIS" no dropdown
   */
  async selectImoveis() {
    try {
      // Procurar o span com texto "Selecione..."
      const selectSpan = await this.page.locator('span:has-text("Selecione...")').first();
      await selectSpan.waitFor({ state: 'visible', timeout: 15000 });
      
      console.log('✅ Span "Selecione..." encontrado');
      
      // Mover mouse para o dropdown antes de clicar (comportamento humano)
      const box = await selectSpan.boundingBox();
      if (box) {
        await this.page.mouse.move(
          box.x + box.width / 2 + (Math.random() - 0.5) * 5,
          box.y + box.height / 2 + (Math.random() - 0.5) * 5,
          { steps: 2 + Math.floor(Math.random() * 2) }
        );
        await this.humanDelay(100, 200);
      }
      
      // Clicar no span para abrir o dropdown
      await selectSpan.click();
      await this.humanDelay(800, 1500);
      
      // Procurar e clicar na opção "IMOVEIS"
      // Pode ser um link, option, ou outro elemento dentro do dropdown
      const imoveisSelectors = [
        'text="IMOVEIS"',
        'text="IMÓVEIS"',
        'text="Imoveis"',
        'text="Imóveis"',
        'a:has-text("IMOVEIS")',
        'a:has-text("IMÓVEIS")',
        'option:has-text("IMOVEIS")',
        'option:has-text("IMÓVEIS")',
        '[value="IMOVEIS"]',
        '[value="IMÓVEIS"]',
        'li:has-text("IMOVEIS")',
        'li:has-text("IMÓVEIS")'
      ];
      
      let optionSelected = false;
      
      for (const selector of imoveisSelectors) {
        try {
          const option = await this.page.locator(selector).first();
          if (await option.isVisible({ timeout: 2000 })) {
            await option.click();
            console.log(`✅ Opção "IMOVEIS" selecionada (seletor: ${selector})`);
            optionSelected = true;
            break;
          }
        } catch (e) {
          // Tentar próximo seletor
        }
      }
      
      // Se não encontrou, tentar estratégia alternativa: buscar por texto exato
      if (!optionSelected) {
        console.log('⚠️  Tentando estratégia alternativa para selecionar IMOVEIS...');
        try {
          // Buscar todos os elementos clicáveis que contenham "IMOVEIS" ou "IMÓVEIS"
          const allElements = await this.page.locator('*').all();
          for (const element of allElements) {
            try {
              const text = await element.textContent();
              if (text && (text.includes('IMOVEIS') || text.includes('IMÓVEIS') || text.includes('Imoveis') || text.includes('Imóveis'))) {
                if (await element.isVisible({ timeout: 1000 })) {
                  // Mover mouse para a opção antes de clicar
                  const box = await element.boundingBox();
                  if (box) {
                    await this.page.mouse.move(
                      box.x + box.width / 2 + (Math.random() - 0.5) * 3,
                      box.y + box.height / 2 + (Math.random() - 0.5) * 3,
                      { steps: 2 }
                    );
                    await this.humanDelay(50, 150);
                  }
                  await element.click();
                  console.log('✅ Opção "IMOVEIS" selecionada (busca por texto)');
                  optionSelected = true;
                  break;
                }
              }
            } catch (e) {
              // Continuar
            }
          }
        } catch (e) {
          // Ignorar
        }
      }
      
      if (!optionSelected) {
        throw new Error('Não foi possível encontrar e selecionar a opção "IMOVEIS" no dropdown');
      }
      
      await this.page.waitForTimeout(2000);
      
    } catch (error) {
      console.error('❌ Erro ao selecionar IMOVEIS:', error.message);
      throw error;
    }
  }

  /**
   * Extrai dados de uma página específica da tabela
   */
  async extractTablePageData() {
    const tableSelector = 'table.table.no-more-tables.table-striped.table-hover.dataTable.no-footer, table.dataTable, table#table';
    const table = await this.page.locator(tableSelector).first();
    
    return await table.evaluate((tableElement) => {
        const data = {
          headers: [],
          rows: [],
          totalRows: 0
        };
        
        // Extrair cabeçalhos do thead
        const thead = tableElement.querySelector('thead');
        if (thead) {
          const headerRow = thead.querySelector('tr');
          if (headerRow) {
            const headers = headerRow.querySelectorAll('th');
            headers.forEach((th) => {
              const headerText = (th.innerText || th.textContent || '').trim();
              data.headers.push(headerText);
            });
          }
        }
        
        // Extrair dados do tbody
        const tbody = tableElement.querySelector('tbody');
        if (tbody) {
          const rows = tbody.querySelectorAll('tr');
          rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td');
            const rowData = {
              rowNumber: rowIndex + 1,
              data: {}
            };
            
            cells.forEach((cell, cellIndex) => {
              // Usar o cabeçalho correspondente como chave, ou criar uma chave genérica
              const headerKey = data.headers[cellIndex] || `coluna_${cellIndex + 1}`;
              
              // Extrair texto limpo da célula
              let cellText = (cell.innerText || cell.textContent || '').trim();
              
              // Remover espaços extras e quebras de linha
              cellText = cellText.replace(/\s+/g, ' ').trim();
              
              // Armazenar dados estruturados
              rowData.data[headerKey] = cellText;
              
              // Também armazenar dados por índice para referência
              rowData.data[`_col_${cellIndex}`] = cellText;
            });
            
            data.rows.push(rowData);
          });
        }
        
      return data;
    });
  }

  /**
   * Navega para uma página específica da paginação
   */
  async navigateToPage(pageNumber) {
    try {
      const pagination = await this.page.locator('div.dataTables_paginate.paging_bootstrap.pagination, div.dataTables_paginate').first();
      await pagination.waitFor({ state: 'visible', timeout: 10000 });
      
      // Primeiro, tentar scrollar a paginação para tornar a página visível
      await pagination.evaluate((paginationElement, targetPage) => {
        // Scroll para tentar tornar a página visível
        const pageLinks = paginationElement.querySelectorAll('a, button, li');
        let found = false;
        
        for (const link of pageLinks) {
          const text = (link.textContent || link.innerText || '').trim();
          const pageNum = parseInt(text);
          if (pageNum === targetPage) {
            // Se encontrou, scrollar para tornar visível
            link.scrollIntoView({ behavior: 'instant', block: 'center' });
            found = true;
            break;
          }
        }
        
        // Se não encontrou, scrollar para a direita para revelar mais páginas
        if (!found) {
          const scrollContainer = paginationElement;
          const initialScroll = scrollContainer.scrollLeft;
          scrollContainer.scrollLeft += 500; // Scroll significativo
          
          // Verificar novamente após scroll
          for (const link of pageLinks) {
            const text = (link.textContent || link.innerText || '').trim();
            const pageNum = parseInt(text);
            if (pageNum === targetPage) {
              link.scrollIntoView({ behavior: 'instant', block: 'center' });
              found = true;
              break;
            }
          }
        }
      }, pageNumber);
      
      await this.page.waitForTimeout(500); // Aguardar scroll completar
      
      // Procurar o link/button da página específica
      const pageLink = await pagination.locator(`a:has-text("${pageNumber}"), li:has-text("${pageNumber}") a, button:has-text("${pageNumber}")`).first();
      
      if (await pageLink.isVisible({ timeout: 3000 })) {
        // Verificar se não está desabilitado
        const isDisabled = await pageLink.evaluate(el => {
          return el.classList.contains('disabled') || el.classList.contains('paginate_button_disabled') || el.getAttribute('disabled') !== null;
        });
        
        if (!isDisabled) {
          // Scrollar para tornar o elemento visível antes de clicar
          await pageLink.scrollIntoViewIfNeeded();
          await this.page.waitForTimeout(300);
          
          await pageLink.click();
          await this.page.waitForTimeout(3000); // Aguardar tabela atualizar
          
          // Aguardar tabela carregar
          const table = await this.page.locator('table.dataTable, table#table').first();
          await table.waitFor({ state: 'visible', timeout: 15000 });
          await this.page.waitForTimeout(2000);
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn(`⚠️  Erro ao navegar para página ${pageNumber}:`, error.message);
      return false;
    }
  }

  /**
   * Verifica se estamos na última página
   */
  async isLastPage() {
    try {
      const pagination = await this.page.locator('div.dataTables_paginate.paging_bootstrap.pagination, div.dataTables_paginate').first();
      await pagination.waitFor({ state: 'visible', timeout: 10000 });
      
      // Verificar se o botão Next está desabilitado
      const nextButton = await pagination.locator('a.paginate_button.next, a.next, button.next, a:has-text("Next"), a:has-text("Próximo"), a:has-text(">"), li.next a').first();
      
      if (await nextButton.isVisible({ timeout: 2000 })) {
        const isDisabled = await nextButton.evaluate(el => {
          return el.classList.contains('disabled') || 
                 el.classList.contains('paginate_button_disabled') || 
                 el.getAttribute('disabled') !== null ||
                 el.getAttribute('aria-disabled') === 'true';
        });
        
        if (isDisabled) {
          return true; // Estamos na última página
        }
      }
      
      return false;
    } catch (error) {
      // Se não conseguir verificar, assumir que não é a última página
      return false;
    }
  }

  /**
   * Obtém o número da página atual
   */
  async getCurrentPageNumber() {
    try {
      const pagination = await this.page.locator('div.dataTables_paginate.paging_bootstrap.pagination, div.dataTables_paginate').first();
      await pagination.waitFor({ state: 'visible', timeout: 10000 });
      
      const currentPage = await pagination.evaluate((paginationElement) => {
        // Procurar o link/button ativo
        const activeLink = paginationElement.querySelector('a.paginate_button.current, li.active a, a.active, .active a');
        if (activeLink) {
          const text = (activeLink.textContent || activeLink.innerText || '').trim();
          const pageNum = parseInt(text);
          if (!isNaN(pageNum) && pageNum > 0) {
            return pageNum;
          }
        }
        
        // Se não encontrou, procurar em todos os links
        const allLinks = paginationElement.querySelectorAll('a, button, li');
        for (const link of allLinks) {
          if (link.classList.contains('active') || link.classList.contains('current')) {
            const text = (link.textContent || link.innerText || '').trim();
            const pageNum = parseInt(text);
            if (!isNaN(pageNum) && pageNum > 0) {
              return pageNum;
            }
          }
        }
        
        return null;
      });
      
      return currentPage;
    } catch (error) {
      return null;
    }
  }

  /**
   * Navega para a próxima página usando o botão "Next"
   */
  async navigateToNextPage() {
    try {
      // Primeiro verificar se já estamos na última página
      const isLast = await this.isLastPage();
      if (isLast) {
        console.log('ℹ️  Já estamos na última página');
        return false;
      }
      
      const pagination = await this.page.locator('div.dataTables_paginate.paging_bootstrap.pagination, div.dataTables_paginate').first();
      await pagination.waitFor({ state: 'visible', timeout: 10000 });
      
      // Obter página atual antes de navegar
      const currentPageBefore = await this.getCurrentPageNumber();
      
      // Procurar botão "Next" ou "Próximo"
      const nextButton = await pagination.locator('a.paginate_button.next, a.next, button.next, a:has-text("Next"), a:has-text("Próximo"), a:has-text(">"), li.next a').first();
      
      if (await nextButton.isVisible({ timeout: 2000 })) {
        const isDisabled = await nextButton.evaluate(el => {
          return el.classList.contains('disabled') || 
                 el.classList.contains('paginate_button_disabled') || 
                 el.getAttribute('disabled') !== null ||
                 el.getAttribute('aria-disabled') === 'true';
        });
        
        if (isDisabled) {
          console.log('ℹ️  Botão Next está desabilitado, estamos na última página');
          return false;
        }
        
        await nextButton.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(300);
        await nextButton.click();
        await this.page.waitForTimeout(3000);
        
        // Aguardar tabela carregar
        const table = await this.page.locator('table.dataTable, table#table').first();
        await table.waitFor({ state: 'visible', timeout: 15000 });
        await this.page.waitForTimeout(2000);
        
        // Verificar se realmente mudou de página
        const currentPageAfter = await this.getCurrentPageNumber();
        if (currentPageAfter && currentPageBefore && currentPageAfter > currentPageBefore) {
          return true;
        } else if (currentPageAfter && currentPageAfter !== currentPageBefore) {
          return true; // Página mudou
        } else {
          // Página não mudou, pode estar na última
          const isLastNow = await this.isLastPage();
          if (isLastNow) {
            return false;
          }
          // Se não é a última mas não mudou, pode ser um problema, mas tentar continuar
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn('⚠️  Erro ao navegar para próxima página:', error.message);
      return false;
    }
  }

  /**
   * Obtém o número total de páginas da paginação
   */
  async getTotalPages() {
    try {
      // Primeiro, tentar obter do DataTables info (se disponível)
      const tableInfo = await this.page.locator('#table_info, .dataTables_info').first();
      if (await tableInfo.isVisible({ timeout: 2000 })) {
        const infoText = await tableInfo.textContent();
        // Procurar padrões como "Mostrando 1 a 10 de 190 registros" ou "Showing 1 to 10 of 190 entries"
        const match = infoText.match(/(?:de|of)\s*(\d+)/i);
        if (match && match[1]) {
          const totalRecords = parseInt(match[1]);
          // Assumir que cada página tem aproximadamente o mesmo número de registros
          // Pegar o número de registros na primeira página
          const firstPageRows = await this.page.locator('table#table tbody tr').count();
          if (firstPageRows > 0) {
            // Limitar o cálculo de páginas para evitar loops infinitos
            // Se firstPageRows é muito pequeno (1), pode ser que estejamos em modo de busca
            // Nesse caso, usar um limite mais conservador
            const estimatedPages = firstPageRows === 1 
              ? Math.min(Math.ceil(totalRecords / 10), 30) // Assumir ~10 registros por página, máximo 30
              : Math.ceil(totalRecords / firstPageRows);
            console.log(`ℹ️  Total de registros: ${totalRecords}, Registros por página: ${firstPageRows}, Páginas estimadas: ${estimatedPages}`);
            return estimatedPages;
          }
        }
      }
      
      // Se não encontrou no info, tentar obter da paginação com scroll
      const pagination = await this.page.locator('div.dataTables_paginate.paging_bootstrap.pagination, div.dataTables_paginate').first();
      await pagination.waitFor({ state: 'visible', timeout: 10000 });
      
      // Scroll através da paginação para revelar todos os números de página
      // Primeiro, fazer scroll manualmente no Playwright
      const paginationElement = await pagination.elementHandle();
      if (paginationElement) {
        // Scroll múltiplas vezes para revelar todas as páginas
        for (let i = 0; i < 20; i++) {
          await paginationElement.evaluate((el) => {
            el.scrollLeft += 200;
          });
          await this.page.waitForTimeout(100);
        }
        
        // Voltar ao início
        await paginationElement.evaluate((el) => {
          el.scrollLeft = 0;
        });
        await this.page.waitForTimeout(200);
      }
      
      // Agora extrair todos os números de página
      const totalPages = await pagination.evaluate((paginationElement) => {
        let maxPage = 1;
        const allPageNumbers = new Set();
        
        // Função para extrair números de página visíveis
        const extractPageNumbers = () => {
          const pageLinks = paginationElement.querySelectorAll('a, button, li');
          pageLinks.forEach((link) => {
            const text = (link.textContent || link.innerText || '').trim();
            const pageNum = parseInt(text);
            if (!isNaN(pageNum) && pageNum > 0) {
              allPageNumbers.add(pageNum);
              if (pageNum > maxPage) {
                maxPage = pageNum;
              }
            }
          });
        };
        
        // Extrair números iniciais
        extractPageNumbers();
        
        // Scroll para a direita para revelar mais páginas
        const scrollContainer = paginationElement;
        let previousScrollLeft = scrollContainer.scrollLeft;
        let scrollAttempts = 0;
        const maxScrollAttempts = 30;
        
        while (scrollAttempts < maxScrollAttempts) {
          // Scroll para a direita
          scrollContainer.scrollLeft += 200;
          
          // Extrair números de página novamente
          const beforeCount = allPageNumbers.size;
          extractPageNumbers();
          const afterCount = allPageNumbers.size;
          
          // Se não encontrou novos números e não mudou a posição do scroll, parar
          if (afterCount === beforeCount && scrollContainer.scrollLeft === previousScrollLeft) {
            break;
          }
          
          previousScrollLeft = scrollContainer.scrollLeft;
          scrollAttempts++;
        }
        
        // Também verificar se há informação de total de páginas no texto
        const paginationText = paginationElement.textContent || '';
        const match = paginationText.match(/(\d+)\s*(?:de|of|\/)\s*(\d+)/i);
        if (match && match[2]) {
          const total = parseInt(match[2]);
          if (!isNaN(total) && total > maxPage) {
            maxPage = total;
          }
        }
        
        return maxPage;
      });
      
      console.log(`📚 Total de páginas detectadas: ${totalPages}`);
      return totalPages;
    } catch (error) {
      console.warn('⚠️  Erro ao obter total de páginas:', error.message);
      // Se falhar, tentar usar estratégia de "Next" button para contar
      return null; // Retornar null para usar estratégia alternativa
    }
  }

  /**
   * Extrai e salva todos os dados da tabela de planos de todas as páginas
   */
  async scrapeAndSaveGridData(customerValue = null, customerTerm = null, stopOnExactMatch = false, consortiumType = 'automoveis') {
    try {
      // Aguardar tabela estar presente
      const tableSelector = 'table.table.no-more-tables.table-striped.table-hover.dataTable.no-footer, table.dataTable, table#table';
      const table = await this.page.locator(tableSelector).first();
      await table.waitFor({ state: 'visible', timeout: 30000 });
      
      console.log('📄 Extraindo dados de todas as páginas...');
      
      // Modo otimizado: buscar durante extração
      if (customerValue && customerTerm) {
        console.log(`🎯 Modo otimizado: buscando plano (R$ ${customerValue.toLocaleString('pt-BR')}, ${customerTerm} meses)`);
      }
      
      // Extrair cabeçalhos da primeira página
      const firstPageData = await this.extractTablePageData();
      const headers = firstPageData.headers;
      let allRows = [...firstPageData.rows];
      
      console.log(`✅ Página 1 extraída: ${firstPageData.rows.length} registros`);
      
      // OTIMIZAÇÃO: Verificar match na primeira página se parâmetros fornecidos
      let bestMatchSoFar = null;
      let earlyTermination = false;
      let exactMatchFound = false;
      let exactMatchPage = null;
      const PAGES_AFTER_EXACT_MATCH = 3; // Continuar por 3 páginas após match exato
      
      if (customerValue && customerTerm) {
        bestMatchSoFar = this.findBestMatchInPageData(firstPageData, customerValue, customerTerm);
        
        if (bestMatchSoFar) {
          const valueDiff = bestMatchSoFar.valueDifference;
          const termDiff = bestMatchSoFar.termDifference;
          
          if (stopOnExactMatch && valueDiff <= 100 && termDiff === 0) {
            console.log('✅ Match exato encontrado na primeira página! Continuando por mais algumas páginas para verificar melhor opção...');
            exactMatchFound = true;
            exactMatchPage = 1;
          }
        }
      }
      
      // Obter total de páginas
      let totalPages = await this.getTotalPages();
      
      // Não forçar número específico de páginas - usar o valor detectado
      if (totalPages) {
        console.log(`ℹ️  Total de páginas detectado: ${totalPages}`);
      }
      
      // Se não conseguiu obter total de páginas ou detectou menos que o esperado, usar estratégia de "Next" button
      if (!totalPages || totalPages < 2) {
        console.log('⚠️  Não foi possível determinar total de páginas, usando estratégia de navegação sequencial...');
        
        // Usar estratégia de "Next" button até não conseguir mais avançar
        let currentPage = 1;
        let canContinue = true;
        const maxPages = 50; // Limite máximo para prevenir loops infinitos
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 3;
        let lastPageData = null; // Para detectar se voltamos para uma página já visitada
        
        while (canContinue && currentPage < maxPages) {
          // Verificar se estamos na última página ANTES de tentar navegar
          const isLast = await this.isLastPage();
          if (isLast) {
            console.log(`ℹ️  Detectado que estamos na última página (${currentPage}), finalizando...`);
            break;
          }
          
          canContinue = await this.navigateToNextPage();
          if (canContinue) {
            consecutiveFailures = 0; // Reset contador de falhas
            currentPage++;
            console.log(`📄 Navegando para página ${currentPage}...`);
            
            // Aguardar tabela carregar (usar waitForSelector em vez de waitForTimeout quando possível)
            try {
              await this.page.waitForSelector(tableSelector, { state: 'visible', timeout: 5000 });
            } catch (e) {
              // Se falhar, usar timeout como fallback
              await this.page.waitForTimeout(500);
            }
            
            // Extrair dados desta página
            const pageData = await this.extractTablePageData();
            
            // Verificar se há dados (se não houver, pode ter chegado ao fim)
            if (pageData.rows.length === 0) {
              console.log('ℹ️  Nenhum dado encontrado nesta página, finalizando...');
              break;
            }
            
            // OTIMIZAÇÃO: Verificar match enquanto extrai
            if (customerValue && customerTerm && !earlyTermination) {
              const pageMatch = this.findBestMatchInPageData(pageData, customerValue, customerTerm);
              if (pageMatch) {
                // Usar a mesma fórmula de cálculo para comparar matches entre páginas
                const cleanCustomerValue = parseFloat(
                  customerValue.toString().replace(/[^\d,]/g, '').replace(',', '.')
                );
                
                const currentValueDiff = pageMatch.valueDifference;
                const currentTermDiff = pageMatch.termDifference;
                const currentValuePercentDiff = (currentValueDiff / cleanCustomerValue) * 100;
                const currentTermPercentDiff = Math.min((currentTermDiff / customerTerm) * 100, 50);
                const currentTotalDiff = currentValuePercentDiff * 10000 + currentTermPercentDiff * 10;
                
                if (!bestMatchSoFar) {
                  bestMatchSoFar = pageMatch;
                } else {
                  const bestValueDiff = bestMatchSoFar.valueDifference;
                  const bestTermDiff = bestMatchSoFar.termDifference;
                  const bestValuePercentDiff = (bestValueDiff / cleanCustomerValue) * 100;
                  const bestTermPercentDiff = Math.min((bestTermDiff / customerTerm) * 100, 50);
                  const bestTotalDiff = bestValuePercentDiff * 10000 + bestTermPercentDiff * 10;
                  
                  // Atualizar melhor match se este for melhor (menor diferença total)
                  if (currentTotalDiff < bestTotalDiff) {
                    bestMatchSoFar = pageMatch;
                  }
                }
                
                // Verificar se encontrou match exato
                if (currentValueDiff <= 100 && currentTermDiff === 0) {
                  if (!exactMatchFound) {
                    console.log(`✅ Match exato encontrado na página ${currentPage}! Continuando por mais ${PAGES_AFTER_EXACT_MATCH} páginas para verificar melhor opção...`);
                    exactMatchFound = true;
                    exactMatchPage = currentPage;
                  }
                }
                
                // Parar após algumas páginas do match exato (se stopOnExactMatch estiver ativo)
                if (stopOnExactMatch && exactMatchFound && 
                    currentPage >= exactMatchPage + PAGES_AFTER_EXACT_MATCH) {
                  console.log(`✅ Match exato confirmado após verificar ${PAGES_AFTER_EXACT_MATCH} páginas adicionais. Parando extração...`);
                  earlyTermination = true;
                  
                  // Ainda adicionar os dados desta página antes de parar
                  const startRowNumber = allRows.length + 1;
                  pageData.rows.forEach((row, index) => {
                    row.rowNumber = startRowNumber + index;
                    allRows.push(row);
                  });
                  
                  // Sair do loop
                  break;
                }
              }
            }
            
            // Verificar se estamos vendo dados duplicados (mesma primeira linha)
            if (allRows.length > 0 && pageData.rows.length > 0) {
              const lastRowFirstCell = allRows[allRows.length - 1].data[headers[0] || 'Nome do bem'];
              const currentRowFirstCell = pageData.rows[0].data[headers[0] || 'Nome do bem'];
              if (lastRowFirstCell === currentRowFirstCell) {
                console.log('⚠️  Dados duplicados detectados, pode ter voltado para página anterior. Verificando...');
                // Verificar se é realmente duplicado ou se é apenas coincidência
                // Comparar mais linhas
                let duplicateCount = 0;
                const compareRows = Math.min(3, Math.min(allRows.length, pageData.rows.length));
                for (let i = 0; i < compareRows; i++) {
                  const oldRow = allRows[allRows.length - compareRows + i];
                  const newRow = pageData.rows[i];
                  if (oldRow && newRow && oldRow.data[headers[0]] === newRow.data[headers[0]]) {
                    duplicateCount++;
                  }
                }
                if (duplicateCount >= 2) {
                  console.log('⚠️  Múltiplas linhas duplicadas detectadas, finalizando...');
                  break;
                }
              }
            }
            
            // Verificar se voltamos para uma página já visitada (comparar com dados anteriores)
            if (lastPageData && pageData.rows.length > 0) {
              const firstRowCurrent = pageData.rows[0].data[headers[0] || 'Nome do bem'];
              const firstRowLast = lastPageData.rows[0].data[headers[0] || 'Nome do bem'];
              if (firstRowCurrent === firstRowLast) {
                console.log('⚠️  Parece que voltamos para uma página já visitada, finalizando...');
                break;
              }
            }
            
            // Ajustar números de linha para continuidade
            const startRowNumber = allRows.length + 1;
            pageData.rows.forEach((row, index) => {
              row.rowNumber = startRowNumber + index;
              allRows.push(row);
            });
            
            console.log(`✅ Página ${currentPage} extraída: ${pageData.rows.length} registros (Total acumulado: ${allRows.length})`);
            
            // Verificar novamente se estamos na última página após extrair dados
            const isLastAfterExtract = await this.isLastPage();
            if (isLastAfterExtract) {
              console.log(`ℹ️  Confirmado que estamos na última página após extrair página ${currentPage}, finalizando...`);
              break;
            }
            
            // Salvar dados desta página para comparação futura
            lastPageData = pageData;
            
            // OTIMIZAÇÃO: Reduzir wait time de 1000ms para 500ms (mais conservador que 300ms)
            await this.page.waitForTimeout(500);
          } else {
            consecutiveFailures++;
            if (consecutiveFailures >= maxConsecutiveFailures) {
              console.log('ℹ️  Múltiplas tentativas falharam, finalizando...');
              break;
            } else {
              console.log(`⚠️  Falha ao navegar (tentativa ${consecutiveFailures}/${maxConsecutiveFailures}), tentando novamente...`);
              await this.page.waitForTimeout(2000);
            }
          }
        }
        
        if (currentPage >= maxPages) {
          console.warn(`⚠️  Limite máximo de ${maxPages} páginas atingido, parando extração`);
        }
        
        totalPages = earlyTermination ? currentPage : currentPage;
        if (earlyTermination) {
          console.log(`📚 Total de páginas processadas: ${totalPages} (parada antecipada após match exato)`);
        } else {
          console.log(`📚 Total de páginas processadas: ${totalPages}`);
        }
      } else {
        console.log(`📚 Total de páginas encontradas: ${totalPages}`);
        
        // Extrair dados das páginas restantes
        // Usar estratégia híbrida: tentar navegar diretamente, mas usar Next como fallback
        let lastExtractedPage = 1;
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 3;
        // Limite mais conservador: máximo 25 páginas para evitar loops infinitos
        // Se totalPages foi calculado incorretamente, ainda temos um limite de segurança
        const maxPages = totalPages ? Math.min(totalPages, 25) : 25; // Limite máximo de 25 páginas
        console.log(`📊 Limite máximo de páginas definido: ${maxPages} (totalPages detectado: ${totalPages || 'N/A'})`);
        
        for (let pageNum = 2; pageNum <= maxPages; pageNum++) {
          // Verificar se estamos na última página ANTES de tentar navegar
          const isLast = await this.isLastPage();
          if (isLast) {
            console.log(`ℹ️  Detectado que estamos na última página (${lastExtractedPage}), finalizando...`);
            break;
          }
          
          // Se temos totalPages detectado e já passamos dele, parar
          if (totalPages && pageNum > totalPages) {
            console.log(`ℹ️  Já extraímos todas as ${totalPages} páginas detectadas, finalizando...`);
            break;
          }
          
          console.log(`📄 Tentando navegar para página ${pageNum}...`);
          
          let navigated = false;
          
          // Primeiro tentar navegar diretamente para a página
          if (pageNum <= totalPages) {
            navigated = await this.navigateToPage(pageNum);
          }
          
          // Se falhou, usar botão Next
          if (!navigated) {
            console.log(`⚠️  Navegação direta falhou, usando botão Next para página ${pageNum}...`);
            // Se não estamos na página anterior, navegar até lá primeiro
            const currentPage = await this.getCurrentPageNumber();
            if (currentPage && currentPage < pageNum - 1) {
              // Navegar usando Next até chegar na página desejada
              for (let i = currentPage; i < pageNum - 1; i++) {
                const nextSuccess = await this.navigateToNextPage();
                if (!nextSuccess) {
                  console.warn(`⚠️  Não foi possível chegar na página ${pageNum}`);
                  break;
                }
                await this.page.waitForTimeout(1000);
              }
            }
            navigated = await this.navigateToNextPage();
          }
          
          if (!navigated) {
            consecutiveFailures++;
            if (consecutiveFailures >= maxConsecutiveFailures) {
              console.warn(`⚠️  Múltiplas falhas consecutivas (${consecutiveFailures}), finalizando...`);
              break;
            }
            console.warn(`⚠️  Não foi possível navegar para página ${pageNum}, pulando...`);
            continue;
          }
          
          consecutiveFailures = 0; // Reset contador
          
          // Verificar se realmente navegamos para a página correta
          const actualPage = await this.getCurrentPageNumber();
          if (actualPage && actualPage !== pageNum && actualPage < pageNum) {
            console.warn(`⚠️  Navegação não funcionou corretamente. Esperado página ${pageNum}, mas estamos na página ${actualPage}`);
            // Se estamos presos na mesma página, incrementar falhas
            if (actualPage === lastExtractedPage) {
              consecutiveFailures++;
              if (consecutiveFailures >= maxConsecutiveFailures) {
                console.warn(`⚠️  Preso na página ${actualPage} após ${consecutiveFailures} tentativas, finalizando...`);
                break;
              }
            }
          }
          
          // Extrair dados desta página
          const pageData = await this.extractTablePageData();
          
          // Verificar se há dados
          if (pageData.rows.length === 0) {
            console.log(`ℹ️  Nenhum dado encontrado na página ${pageNum}, pode ter chegado ao fim`);
            break;
          }
          
          // Verificar se estamos vendo dados duplicados
          if (allRows.length > 0 && pageData.rows.length > 0) {
            const lastRowFirstCell = allRows[allRows.length - 1].data[headers[0] || 'Nome do bem'];
            const currentRowFirstCell = pageData.rows[0].data[headers[0] || 'Nome do bem'];
            if (lastRowFirstCell === currentRowFirstCell) {
              // Verificar múltiplas linhas para confirmar duplicação
              let duplicateCount = 0;
              const compareRows = Math.min(3, Math.min(allRows.length, pageData.rows.length));
              for (let i = 0; i < compareRows; i++) {
                const oldRow = allRows[allRows.length - compareRows + i];
                const newRow = pageData.rows[i];
                if (oldRow && newRow && oldRow.data[headers[0]] === newRow.data[headers[0]]) {
                  duplicateCount++;
                }
              }
              if (duplicateCount >= 2) {
                console.log(`⚠️  Dados duplicados detectados na página ${pageNum}, finalizando...`);
                break;
              }
            }
          }
          
          // Ajustar números de linha para continuidade
          const startRowNumber = allRows.length + 1;
          pageData.rows.forEach((row, index) => {
            row.rowNumber = startRowNumber + index;
            allRows.push(row);
          });
          
          lastExtractedPage = pageNum;
          console.log(`✅ Página ${pageNum} extraída: ${pageData.rows.length} registros (Total acumulado: ${allRows.length})`);
          
          // Verificar novamente se estamos na última página após extrair dados
          const isLastAfterExtract = await this.isLastPage();
          if (isLastAfterExtract) {
            console.log(`ℹ️  Confirmado que estamos na última página após extrair página ${pageNum}, finalizando...`);
            break;
          }
          
          // Pequena pausa entre páginas
          await this.page.waitForTimeout(1000);
        }
        
        // REMOVIDO: Loop secundário que causava loops infinitos
        // O loop principal já cobre todas as páginas necessárias
        // Se chegamos aqui e ainda não extraímos todas as páginas, é porque:
        // 1. Já chegamos na última página (isLastPage retornou true)
        // 2. Encontramos dados duplicados
        // 3. Não há mais dados para extrair
        // Não precisamos de um loop secundário que pode causar loops infinitos
        
        totalPages = lastExtractedPage;
      }
      
      console.log(`\n✅ Extração completa! Total de registros: ${allRows.length}`);
      
      // Criar diretório para dados se não existir
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Preparar dados para salvar (remover campos auxiliares _col_*)
      const cleanTableData = {
        extractedAt: new Date().toISOString(),
        totalPages: earlyTermination ? totalPages : totalPages,
        headers: headers,
        totalRows: allRows.length,
        earlyTermination: earlyTermination,
        bestMatch: bestMatchSoFar ? {
          nomeBem: bestMatchSoFar.nomeBem,
          valor: bestMatchSoFar.valor,
          prazo: bestMatchSoFar.prazo,
          primeiraParcela: bestMatchSoFar.primeiraParcela,
          plano: bestMatchSoFar.plano,
          tipoVenda: bestMatchSoFar.tipoVenda,
          rawData: bestMatchSoFar.rawData || bestMatchSoFar // Incluir rawData completo
        } : null,
        rows: allRows.map(row => {
          const cleanRow = { ...row.data };
          // Remover campos auxiliares
          Object.keys(cleanRow).forEach(key => {
            if (key.startsWith('_col_')) {
              delete cleanRow[key];
            }
          });
          return cleanRow;
        })
      };
      
      // Salvar dados em JSON
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const jsonFilename = `table-data-${consortiumType}-all-pages-${timestamp}.json`;
      const jsonFilepath = path.join(dataDir, jsonFilename);
      
      fs.writeFileSync(jsonFilepath, JSON.stringify(cleanTableData, null, 2), 'utf-8');
      console.log(`💾 Dados salvos apenas em JSON: ${jsonFilename}`);
      
      // Exibir resumo no console
      console.log(`\n📊 Resumo dos dados extraídos:`);
      console.log(`   - Total de páginas: ${totalPages}`);
      console.log(`   - Total de registros: ${allRows.length}`);
      console.log(`   - Total de colunas: ${headers.length}`);
      console.log(`   - Colunas: ${headers.join(', ')}`);
      console.log(`   - Arquivo salvo em: ./data/${jsonFilename}`);
      
      return cleanTableData;
      
    } catch (error) {
      console.error('❌ Erro ao extrair dados do grid:', error.message);
      throw error;
    }
  }

  /**
   * Verifica se uma página contém um plano que corresponde aos critérios do cliente
   * Retorna o melhor match encontrado nesta página ou null
   */
  findBestMatchInPageData(pageData, customerValue, customerTerm) {
    if (!pageData || !pageData.rows || pageData.rows.length === 0) {
      return null;
    }

    const cleanCustomerValue = parseFloat(
      customerValue.toString().replace(/[^\d,]/g, '').replace(',', '.')
    );
    
    console.log(`🔍 [FIND BEST MATCH IN PAGE] Buscando para: R$ ${cleanCustomerValue.toLocaleString('pt-BR')}, ${customerTerm} meses (${pageData.rows.length} registros na página)`);

    let bestMatch = null;
    let smallestDifference = Infinity;
    const EXACT_MATCH_THRESHOLD = 100; // R$ 100 de diferença = match exato

    for (const row of pageData.rows) {
      try {
        // Tentar diferentes formatos de chave (maiúsculas, minúsculas, com/sem espaços)
        const rowData = row.data || row;
        const planValueText = rowData['VALOR'] || rowData['Valor'] || rowData['valor'] || '';
        const planValue = parseFloat(
          planValueText.toString().replace(/[^\d,]/g, '').replace(',', '.')
        );

        if (isNaN(planValue) || planValue === 0) continue;

        const planTermText = rowData['PRAZO'] || rowData['Prazo'] || rowData['prazo'] || '';
        const planTerm = parseInt(planTermText.toString().replace(/\D/g, ''));

        if (isNaN(planTerm) || planTerm === 0) continue;

        const firstPaymentText = rowData['1ª PARCELA'] || rowData['1ª parcela'] || rowData['primeira_parcela'] || '';
        const firstPayment = parseFloat(
          firstPaymentText.toString().replace(/[^\d,]/g, '').replace(',', '.')
        );

        const termDifference = Math.abs(planTerm - customerTerm);
        const valueDifference = Math.abs(planValue - cleanCustomerValue);
        
        // PRIORIZAR VALOR: Usar diferença absoluta de valor como fator principal
        // Termo é usado apenas como tie-breaker quando valores são muito próximos
        const valuePercentDiff = (valueDifference / cleanCustomerValue) * 100;
        
        // Limitar o impacto da diferença de prazo para que não domine o cálculo
        // Se a diferença de prazo for muito grande (>50%), limitar sua contribuição
        const termPercentDiff = Math.min((termDifference / customerTerm) * 100, 50);
        
          // Valor tem peso muito maior (10000x) para garantir que seja o fator principal
          // Termo tem peso menor e limitado para ser apenas um tie-breaker
          const totalDifference = valuePercentDiff * 10000 + termPercentDiff * 10;

          // Debug: Log top candidates (only for values close to customer value)
          if (valueDifference < cleanCustomerValue * 0.1 || planValue < cleanCustomerValue * 1.5) {
            console.log(`🔍 [MATCH DEBUG] Valor: R$ ${planValue.toLocaleString('pt-BR')}, Prazo: ${planTerm}, ValueDiff: ${valuePercentDiff.toFixed(2)}%, TermDiff: ${termPercentDiff.toFixed(2)}%, Total: ${totalDifference.toFixed(2)}`);
          }

          if (totalDifference < smallestDifference) {
            console.log(`✅ [MATCH UPDATE] Novo melhor match: R$ ${planValue.toLocaleString('pt-BR')} (diferença total: ${totalDifference.toFixed(2)})`);
            smallestDifference = totalDifference;
            bestMatch = {
              nomeBem: rowData['NOME DO BEM'] || rowData['Nome do bem'] || rowData['nome_bem'] || '',
              valor: planValue,
              valorTexto: rowData['VALOR'] || rowData['Valor'] || rowData['valor'] || '',
              prazo: planTerm,
              prazoTexto: rowData['PRAZO'] || rowData['Prazo'] || rowData['prazo'] || '',
              primeiraParcela: firstPayment || 0,
              primeiraParcelaTexto: rowData['1ª PARCELA'] || rowData['1ª parcela'] || rowData['primeira_parcela'] || '',
              plano: rowData['PLANO'] || rowData['Plano'] || rowData['plano'] || '',
              tipoVenda: rowData['TIPO DE VENDA'] || rowData['Tipo de Venda'] || rowData['tipo_venda'] || '',
              rawData: rowData,
              valueDifference: valueDifference,
              termDifference: termDifference
            };
          }
      } catch (e) {
        continue;
      }
    }

    if (bestMatch) {
      console.log(`🎯 [FINAL MATCH] Melhor match encontrado: R$ ${bestMatch.valor.toLocaleString('pt-BR')}, Prazo: ${bestMatch.prazo} meses`);
    }
    return bestMatch;
  }

  /**
   * Encontra o melhor plano baseado nos dados do cliente
   */
  /**
   * Encontra combinações de cotações que somam aproximadamente o valor solicitado
   * Usa algoritmo otimizado para evitar problemas de memória
   * @param {Array} validQuotes - Array de cotações válidas
   * @param {number} targetValue - Valor alvo
   * @param {number} maxCombinations - Número máximo de combinações a retornar
   * @returns {Array} - Array de combinações (cada combinação é um array de cotações)
   */
  findQuoteCombinations(validQuotes, targetValue, maxCombinations = 3) {
    console.log(`🔍 Buscando combinações de ${validQuotes.length} cotações para valor alvo: R$ ${targetValue.toLocaleString('pt-BR')}`);
    
    // STEP 1: Filtrar e ordenar cotações de forma inteligente
    // Remover cotações muito pequenas ou muito grandes
    const minQuoteValue = targetValue * 0.1; // Pelo menos 10% do alvo
    const maxQuoteValue = targetValue * 0.6; // No máximo 60% do alvo (para permitir pelo menos 2 cotações)
    const maxQuotesPerCombination = 5;
    
    const filteredQuotes = validQuotes
      .filter(q => q.planValue >= minQuoteValue && q.planValue <= maxQuoteValue)
      .sort((a, b) => b.planValue - a.planValue); // Ordenar do maior para o menor
    
    // Limitar a 50 cotações mais relevantes para evitar explosão combinatória
    const topQuotes = filteredQuotes.slice(0, 50);
    
    console.log(`📊 ${topQuotes.length} cotações filtradas (de ${validQuotes.length} disponíveis)`);
    
    if (topQuotes.length < 2) {
      console.log(`⚠️ Não há cotações suficientes para formar combinações`);
      return [];
    }
    
    const combinations = [];
    const maxSearchDepth = Math.min(maxQuotesPerCombination, Math.ceil(targetValue / Math.min(...topQuotes.map(q => q.planValue))));
    
    // STEP 2: Usar abordagem iterativa limitada em vez de recursão completa
    // Tentar combinações de 2, 3, 4, 5 cotações
    for (let comboSize = 2; comboSize <= maxSearchDepth && comboSize <= maxQuotesPerCombination; comboSize++) {
      if (combinations.length >= maxCombinations * 2) break;
      
      // Usar abordagem de "sliding window" para combinações pequenas
      if (comboSize === 2) {
        // Para 2 cotações, testar todas as combinações possíveis (limitado)
        for (let i = 0; i < Math.min(topQuotes.length, 30); i++) {
          for (let j = i + 1; j < Math.min(topQuotes.length, 30); j++) {
            const sum = topQuotes[i].planValue + topQuotes[j].planValue;
            if (sum <= targetValue * 1.2 && sum >= targetValue * 0.8) {
              const difference = Math.abs(sum - targetValue);
              combinations.push({
                quotes: [topQuotes[i], topQuotes[j]],
                totalValue: sum,
                difference: difference
              });
              if (combinations.length >= maxCombinations * 3) break;
            }
          }
          if (combinations.length >= maxCombinations * 3) break;
        }
      } else {
        // Para 3+ cotações, usar busca limitada e inteligente
        const generateLimited = (current, startIdx, currentSum, remaining) => {
          if (remaining === 0) {
            if (currentSum <= targetValue * 1.2 && currentSum >= targetValue * 0.8) {
              const difference = Math.abs(currentSum - targetValue);
              combinations.push({
                quotes: [...current],
                totalValue: currentSum,
                difference: difference
              });
            }
            return;
          }
          
          // Limitar busca a apenas as primeiras 20 cotações para evitar explosão
          const searchLimit = Math.min(startIdx + 20, topQuotes.length);
          for (let i = startIdx; i < searchLimit && combinations.length < maxCombinations * 3; i++) {
            const newSum = currentSum + topQuotes[i].planValue;
            if (newSum <= targetValue * 1.3) {
              current.push(topQuotes[i]);
              generateLimited(current, i + 1, newSum, remaining - 1);
              current.pop();
            }
          }
        };
        
        generateLimited([], 0, 0, comboSize);
      }
    }
    
    console.log(`✅ ${combinations.length} combinações candidatas encontradas`);
    
    // STEP 3: Ordenar por menor diferença e retornar as melhores
    combinations.sort((a, b) => a.difference - b.difference);
    
    // Retornar apenas combinações únicas (evitar duplicatas)
    const uniqueCombinations = [];
    const seen = new Set();
    
    for (const combo of combinations) {
      const key = combo.quotes.map(q => q.quote['NOME DO BEM'] || '').sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCombinations.push(combo);
        if (uniqueCombinations.length >= maxCombinations) {
          break;
        }
      }
    }
    
    console.log(`✅ ${uniqueCombinations.length} combinações únicas selecionadas`);
    
    return uniqueCombinations.map(combo => ({
      quotes: combo.quotes.map(q => q.quote),
      totalValue: combo.totalValue,
      difference: combo.difference
    }));
  }

  findBestMatchingPlan(scrapedData, customerValue, customerTerm) {
    console.log(`🔍 Buscando cotação para: R$ ${customerValue.toLocaleString('pt-BR')}, ${customerTerm} meses`);
    try {
      if (!scrapedData || !scrapedData.rows || scrapedData.rows.length === 0) {
        return null;
      }

      // Converter valor do cliente para número (remover formatação)
      const cleanCustomerValue = parseFloat(
        customerValue.toString().replace(/[^\d,]/g, '').replace(',', '.')
      );

      console.log(`📊 Analisando ${scrapedData.rows.length} cotações disponíveis`);

      // STEP 1: Calcular diferenças de VALOR e PRAZO para todas as cotações
      const quotesWithDifferences = [];
      
      for (const row of scrapedData.rows) {
        try {
          // Extrair VALOR da cotação
          const planValueText = row['VALOR'] || row['Valor'] || row['valor'] || '';
          const planValue = parseFloat(
            planValueText.toString().replace(/[^\d,]/g, '').replace(',', '.')
          );

          if (isNaN(planValue) || planValue === 0) continue;

          // Extrair PRAZO da cotação
          const planTermText = row['PRAZO'] || row['Prazo'] || row['prazo'] || '';
          const planTerm = parseInt(planTermText.toString().replace(/\D/g, ''));

          if (isNaN(planTerm) || planTerm === 0) continue;

          // Calcular diferença de VALOR (orçamento)
          const valueDifference = Math.abs(planValue - cleanCustomerValue);
          // Calcular diferença de PRAZO (prazo)
          const termDifference = Math.abs(planTerm - customerTerm);

          quotesWithDifferences.push({
            quote: row, // Objeto da cotação original do JSON
            planValue: planValue,
            planTerm: planTerm,
            valueDifference: valueDifference,
            termDifference: termDifference,
            totalDifference: valueDifference + termDifference * 1000 // Weight term difference less
          });
        } catch (e) {
          // Continuar se houver erro ao processar uma linha
          continue;
        }
      }

      if (quotesWithDifferences.length === 0) {
        console.log(`⚠️ Nenhuma cotação válida encontrada`);
        return null;
      }

      // STEP 1.5: Verificar se o valor solicitado é > 1.5x o maior valor disponível
      const maxAvailableValue = Math.max(...quotesWithDifferences.map(q => q.planValue));
      const threshold = maxAvailableValue * 1.5;
      
      if (cleanCustomerValue > threshold) {
        console.log(`📊 Valor solicitado (R$ ${cleanCustomerValue.toLocaleString('pt-BR')}) é ${(cleanCustomerValue / maxAvailableValue).toFixed(2)}x o maior valor disponível (R$ ${maxAvailableValue.toLocaleString('pt-BR')})`);
        console.log(`🔍 Buscando combinações de cotações para atingir o valor solicitado...`);
        
        // Filtrar cotações com prazo similar (diferença de até 12 meses)
        const quotesWithSimilarTerm = quotesWithDifferences.filter(q => q.termDifference <= 12);
        
        if (quotesWithSimilarTerm.length === 0) {
          console.log(`⚠️ Nenhuma cotação com prazo similar encontrada, usando todas as cotações`);
          // Se não houver cotações com prazo similar, usar todas
          const combinations = this.findQuoteCombinations(quotesWithDifferences, cleanCustomerValue, 3);
          
          if (combinations.length > 0) {
            console.log(`✅ ${combinations.length} combinação(ões) encontrada(s)`);
            // Retornar estrutura especial para combinações
            return {
              isCombination: true,
              combinations: combinations
            };
          }
        } else {
          const combinations = this.findQuoteCombinations(quotesWithSimilarTerm, cleanCustomerValue, 3);
          
          if (combinations.length > 0) {
            console.log(`✅ ${combinations.length} combinação(ões) encontrada(s) com prazo similar`);
            // Retornar estrutura especial para combinações
            return {
              isCombination: true,
              combinations: combinations
            };
          }
        }
        
        // Se não encontrou combinações, continuar com lógica normal
        console.log(`⚠️ Não foi possível encontrar combinações adequadas, usando lógica padrão`);
      }

      // STEP 2: Encontrar a menor diferença de VALOR (cotação mais similar)
      const smallestValueDifference = Math.min(...quotesWithDifferences.map(q => q.valueDifference));
      console.log(`💰 Menor diferença de VALOR encontrada: R$ ${smallestValueDifference.toLocaleString('pt-BR')}`);

      // STEP 3: Filtrar cotações com a menor diferença de VALOR
      const quotesWithBestValue = quotesWithDifferences.filter(q => q.valueDifference === smallestValueDifference);
      console.log(`📋 ${quotesWithBestValue.length} cotação(ões) com VALOR mais similar`);

      // STEP 4: Entre as cotações com melhor VALOR, encontrar as com melhor PRAZO
      const smallestTermDifference = Math.min(...quotesWithBestValue.map(q => q.termDifference));
      const quotesWithBestValueAndTerm = quotesWithBestValue.filter(q => q.termDifference === smallestTermDifference);
      
      console.log(`📋 ${quotesWithBestValueAndTerm.length} cotação(ões) com VALOR e PRAZO mais similares`);

      // STEP 5: Se há múltiplas cotações com mesmo valor e prazo, retornar todas
      if (quotesWithBestValueAndTerm.length > 1) {
        const selectedQuotes = quotesWithBestValueAndTerm.map(q => q.quote);
        console.log(`✅ ${selectedQuotes.length} cotações com mesmo VALOR e PRAZO encontradas - retornando todas`);
        return selectedQuotes;
      }

      // STEP 6: Se há apenas uma cotação com melhor valor e prazo, buscar 2-3 similares adicionais
      const bestQuote = quotesWithBestValueAndTerm[0].quote;
      const bestPlanValue = quotesWithBestValueAndTerm[0].planValue;
      const bestPlanTerm = quotesWithBestValueAndTerm[0].planTerm;

      // Buscar cotações similares (mesmo valor ou mesmo prazo ou valor muito próximo)
      const similarQuotes = quotesWithDifferences
        .filter(q => {
          // Excluir a melhor cotação já encontrada
          if (q.planValue === bestPlanValue && q.planTerm === bestPlanTerm) return false;
          
          // Incluir se: mesmo valor (independente do prazo) OU mesmo prazo (independente do valor) OU valor muito próximo
          return (q.valueDifference === 0) || 
                 (q.termDifference === 0) || 
                 (q.valueDifference <= bestPlanValue * 0.1); // Até 10% de diferença no valor
        })
        .sort((a, b) => {
          // Ordenar por: primeiro valor igual, depois prazo igual, depois menor diferença total
          if (a.valueDifference === 0 && b.valueDifference !== 0) return -1;
          if (a.valueDifference !== 0 && b.valueDifference === 0) return 1;
          if (a.termDifference === 0 && b.termDifference !== 0) return -1;
          if (a.termDifference !== 0 && b.termDifference === 0) return 1;
          return a.totalDifference - b.totalDifference;
        })
        .slice(0, 3) // Pegar até 3 cotações similares
        .map(q => q.quote);

      const allQuotes = [bestQuote, ...similarQuotes];
      console.log(`✅ 1 cotação principal + ${similarQuotes.length} similares encontradas - retornando ${allQuotes.length} cotações`);
      
      return allQuotes;
    } catch (error) {
      console.error('❌ Erro ao encontrar melhor cotação:', error.message);
      return null;
    }
  }

  /**
   * Gera cotação de consórcio de automóvel usando dados extraídos da tabela
   */
  async generateCarQuotation(data) {
    try {
      console.log('🚗 Gerando cotação de automóvel...');
      console.log(`   Cliente: ${data.nome}`);
      console.log(`   Valor desejado: R$ ${data.valor.toLocaleString('pt-BR')}`);
      console.log(`   Prazo desejado: ${data.prazo} meses`);
      
      if (!this.isLoggedIn) {
        await this.login();
      }

      // Navegar para página de planos, selecionar AUTOMOVEIS e IPCA
      console.log('📋 Acessando lista de planos...');
      await this.navigateToPlansList();

      // Extrair TODOS os dados e salvar em um único arquivo JSON
      console.log('📊 Extraindo todos os dados disponíveis...');
      let fullExtractionResult = null;
      try {
        fullExtractionResult = await this.scrapeAndSaveGridData(null, null, false, 'automoveis');
        console.log(`✅ Extração completa! ${fullExtractionResult.rows.length} cotações extraídas e salvas em JSON`);
      } catch (error) {
        console.error('❌ Erro durante extração completa:', error.message);
        throw error;
      }
      
      // Usar os dados extraídos para encontrar as melhores cotações
      let matchingPlans = null;
      let isCombination = false;
      if (fullExtractionResult && fullExtractionResult.rows && fullExtractionResult.rows.length > 0) {
        console.log(`🔍 Buscando melhores cotações em ${fullExtractionResult.rows.length} cotações disponíveis...`);
        const matches = this.findBestMatchingPlan(fullExtractionResult, data.valor, data.prazo);
        if (matches) {
          // Verificar se é uma combinação
          if (matches.isCombination && matches.combinations) {
            isCombination = true;
            matchingPlans = matches;
            console.log(`✅ ${matches.combinations.length} combinação(ões) de cotações encontrada(s)`);
          } else {
            matchingPlans = Array.isArray(matches) ? matches : [matches];
            console.log(`✅ ${matchingPlans.length} cotação(ões) encontrada(s) nos dados extraídos`);
          }
        }
      }

      if (!matchingPlans || (isCombination && (!matchingPlans.combinations || matchingPlans.combinations.length === 0)) || (!isCombination && matchingPlans.length === 0)) {
        throw new Error('Não foi possível encontrar nenhuma cotação disponível nos dados. Por favor, tente novamente mais tarde.');
      }

      let isExactMatch = false;
      
      if (isCombination) {
        // Para combinações, não é match exato
        isExactMatch = false;
        console.log(`✅ ${matchingPlans.combinations.length} combinação(ões) encontrada(s):`);
        matchingPlans.combinations.forEach((combo, comboIndex) => {
          console.log(`   Combinação ${comboIndex + 1} (Total: R$ ${combo.totalValue.toLocaleString('pt-BR')}):`);
          combo.quotes.forEach((quote, quoteIndex) => {
            console.log(`     Cotação ${quoteIndex + 1}:`);
            console.log(`       NOME DO BEM: ${quote['NOME DO BEM'] || 'N/A'}`);
            console.log(`       VALOR: ${quote['VALOR'] || 'N/A'}`);
            console.log(`       PRAZO: ${quote['PRAZO'] || 'N/A'}`);
            console.log(`       1ª PARCELA: ${quote['1ª PARCELA'] || 'N/A'}`);
          });
        });
      } else {
        // Verificar se é match exato (primeira cotação)
        const firstPlan = matchingPlans[0];
        const planValue = parseFloat((firstPlan['VALOR'] || '').replace(/[^\d,]/g, '').replace(',', '.'));
        const planTerm = parseInt((firstPlan['PRAZO'] || '').replace(/\D/g, ''));
        isExactMatch = planValue && planTerm && 
          (Math.abs(planValue - data.valor) < 0.01) && 
          (planTerm === data.prazo);

        console.log(`✅ ${matchingPlans.length} cotação(ões) encontrada(s):`);
        matchingPlans.forEach((plan, index) => {
          console.log(`   Cotação ${index + 1}:`);
          console.log(`     NOME DO BEM: ${plan['NOME DO BEM'] || 'N/A'}`);
          console.log(`     VALOR: ${plan['VALOR'] || 'N/A'}`);
          console.log(`     PRAZO: ${plan['PRAZO'] || 'N/A'}`);
          console.log(`     1ª PARCELA: ${plan['1ª PARCELA'] || 'N/A'}`);
          console.log(`     PLANO: ${plan['PLANO'] || 'N/A'}`);
          console.log(`     TIPO DE VENDA: ${plan['TIPO DE VENDA'] || 'N/A'}`);
        });
      }

      // Preparar dados da cotação usando array de objetos row completos ou combinações
      const quotationData = {
        type: 'Consórcio de Automóvel',
        rawData: isCombination ? matchingPlans : matchingPlans, // Pode ser array ou objeto com combinações
        isCombination: isCombination,
        isExactMatch: isExactMatch,
        requestedValue: data.valor,
        requestedTerm: data.prazo,
        timestamp: new Date().toISOString(),
        customerData: {
          nome: data.nome,
          cpf: data.cpf,
          email: data.email,
          dataNascimento: data.dataNascimento
        }
      };
      
      console.log('✅ Cotação de automóvel gerada com sucesso!');
      return quotationData;

    } catch (error) {
      console.error('❌ Erro ao gerar cotação de automóvel:', error.message);
      throw error;
    }
  }

  /**
   * Gera cotação de consórcio de imóvel usando dados extraídos da tabela
   */
  async generatePropertyQuotation(data) {
    try {
      console.log('🏠 Gerando cotação de imóvel...');
      console.log(`   Cliente: ${data.nome}`);
      console.log(`   Valor desejado: R$ ${data.valor.toLocaleString('pt-BR')}`);
      console.log(`   Prazo desejado: ${data.prazo} meses`);
      
      if (!this.isLoggedIn) {
        await this.login();
      }

      // Navegar para página de planos, selecionar IMOVEIS
      console.log('📋 Acessando lista de planos...');
      await this.navigateToPlansListForImoveis();

      // Extrair TODOS os dados e salvar em um único arquivo JSON
      console.log('📊 Extraindo todos os dados disponíveis...');
      let fullExtractionResult = null;
      try {
        fullExtractionResult = await this.scrapeAndSaveGridData(null, null, false, 'imoveis');
        console.log(`✅ Extração completa! ${fullExtractionResult.rows.length} cotações extraídas e salvas em JSON`);
      } catch (error) {
        console.error('❌ Erro durante extração completa:', error.message);
        throw error;
      }
      
      // Usar os dados extraídos para encontrar as melhores cotações
      let matchingPlans = null;
      let isCombination = false;
      if (fullExtractionResult && fullExtractionResult.rows && fullExtractionResult.rows.length > 0) {
        console.log(`🔍 Buscando melhores cotações em ${fullExtractionResult.rows.length} cotações disponíveis...`);
        const matches = this.findBestMatchingPlan(fullExtractionResult, data.valor, data.prazo);
        if (matches) {
          // Verificar se é uma combinação
          if (matches.isCombination && matches.combinations) {
            isCombination = true;
            matchingPlans = matches;
            console.log(`✅ ${matches.combinations.length} combinação(ões) de cotações encontrada(s)`);
          } else {
            matchingPlans = Array.isArray(matches) ? matches : [matches];
            console.log(`✅ ${matchingPlans.length} cotação(ões) encontrada(s) nos dados extraídos`);
          }
        }
      }

      if (!matchingPlans || (isCombination && (!matchingPlans.combinations || matchingPlans.combinations.length === 0)) || (!isCombination && matchingPlans.length === 0)) {
        throw new Error('Não foi possível encontrar nenhuma cotação disponível nos dados. Por favor, tente novamente mais tarde.');
      }

      let isExactMatch = false;
      
      if (isCombination) {
        // Para combinações, não é match exato
        isExactMatch = false;
        console.log(`✅ ${matchingPlans.combinations.length} combinação(ões) encontrada(s):`);
        matchingPlans.combinations.forEach((combo, comboIndex) => {
          console.log(`   Combinação ${comboIndex + 1} (Total: R$ ${combo.totalValue.toLocaleString('pt-BR')}):`);
          combo.quotes.forEach((quote, quoteIndex) => {
            console.log(`     Cotação ${quoteIndex + 1}:`);
            console.log(`       NOME DO BEM: ${quote['NOME DO BEM'] || 'N/A'}`);
            console.log(`       VALOR: ${quote['VALOR'] || 'N/A'}`);
            console.log(`       PRAZO: ${quote['PRAZO'] || 'N/A'}`);
            console.log(`       1ª PARCELA: ${quote['1ª PARCELA'] || 'N/A'}`);
          });
        });
      } else {
        // Verificar se é match exato (primeira cotação)
        const firstPlan = matchingPlans[0];
        const planValue = parseFloat((firstPlan['VALOR'] || '').replace(/[^\d,]/g, '').replace(',', '.'));
        const planTerm = parseInt((firstPlan['PRAZO'] || '').replace(/\D/g, ''));
        isExactMatch = planValue && planTerm && 
          (Math.abs(planValue - data.valor) < 0.01) && 
          (planTerm === data.prazo);

        console.log(`✅ ${matchingPlans.length} cotação(ões) encontrada(s):`);
        matchingPlans.forEach((plan, index) => {
          console.log(`   Cotação ${index + 1}:`);
          console.log(`     NOME DO BEM: ${plan['NOME DO BEM'] || 'N/A'}`);
          console.log(`     VALOR: ${plan['VALOR'] || 'N/A'}`);
          console.log(`     PRAZO: ${plan['PRAZO'] || 'N/A'}`);
          console.log(`     1ª PARCELA: ${plan['1ª PARCELA'] || 'N/A'}`);
          console.log(`     PLANO: ${plan['PLANO'] || 'N/A'}`);
          console.log(`     TIPO DE VENDA: ${plan['TIPO DE VENDA'] || 'N/A'}`);
        });
      }

      // Preparar dados da cotação usando array de objetos row completos ou combinações
      const quotationData = {
        type: 'Consórcio de Imóvel',
        rawData: isCombination ? matchingPlans : matchingPlans, // Pode ser array ou objeto com combinações
        isCombination: isCombination,
        isExactMatch: isExactMatch,
        requestedValue: data.valor,
        requestedTerm: data.prazo,
        timestamp: new Date().toISOString(),
        customerData: {
          nome: data.nome,
          cpf: data.cpf,
          email: data.email,
          dataNascimento: data.dataNascimento
        }
      };
      
      console.log('✅ Cotação de imóvel gerada com sucesso!');
      return quotationData;

    } catch (error) {
      console.error('❌ Erro ao gerar cotação de imóvel:', error.message);
      throw error;
    }
  }

  /**
   * Extrai dados da cotação da página de resultado
   */
  async extractQuotationData(type, valor, prazo) {
    try {
      // IMPORTANTE: Ajustar seletores conforme o site real
      // Este é um exemplo genérico
      
      // Tentar extrair parcela mensal
      let monthlyPayment = 0;
      try {
        const monthlyPaymentSelector = '.parcela-mensal, .valor-parcela, [data-field="parcela"]';
        const monthlyPaymentText = await this.page.textContent(monthlyPaymentSelector);
        monthlyPayment = parseFloat(monthlyPaymentText.replace(/[^\d,]/g, '').replace(',', '.'));
      } catch (error) {
        // Se não conseguir extrair, calcular estimativa
        monthlyPayment = this.calculateEstimatedPayment(valor, prazo);
      }

      // Tentar extrair taxa de administração
      let adminFee = 0;
      try {
        const adminFeeSelector = '.taxa-admin, .taxa-administracao, [data-field="taxa"]';
        const adminFeeText = await this.page.textContent(adminFeeSelector);
        adminFee = parseFloat(adminFeeText.replace(/[^\d,]/g, '').replace(',', '.'));
      } catch (error) {
        adminFee = type === 'CARRO' ? 15 : 18; // Estimativa padrão
      }

      return {
        type: type === 'CARRO' ? 'Consórcio de Automóvel' : 'Consórcio de Imóvel',
        value: valor,
        months: prazo,
        monthlyPayment: monthlyPayment,
        adminFee: adminFee,
        details: `Cotação gerada automaticamente via sistema.`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('⚠️ Erro ao extrair dados, usando valores estimados:', error.message);
      
      // Retornar dados estimados em caso de erro
      return {
        type: type === 'CARRO' ? 'Consórcio de Automóvel' : 'Consórcio de Imóvel',
        value: valor,
        months: prazo,
        monthlyPayment: this.calculateEstimatedPayment(valor, prazo),
        adminFee: type === 'CARRO' ? 15 : 18,
        details: `Cotação estimada. Entre em contato para valores exatos.`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Calcula pagamento mensal estimado
   */
  calculateEstimatedPayment(value, months) {
    // Fórmula simples de estimativa
    // Total = Valor + (Valor * Taxa Admin)
    // Parcela = Total / Meses
    const adminRate = 0.15; // 15% de taxa administrativa média
    const total = value * (1 + adminRate);
    return total / months;
  }


  /**
   * Fecha o navegador
   */
  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.context = null;
        this.page = null;
        this.isLoggedIn = false;
        console.log('✅ Navegador fechado');
      }
    } catch (error) {
      console.error('⚠️ Erro ao fechar navegador:', error.message);
    }
  }

  /**
   * Mantém sessão ativa (para uso contínuo)
   */
  async keepAlive() {
    try {
      if (this.page) {
        await this.page.evaluate(() => {
          // Simular atividade para manter sessão
          console.log('Session keep-alive');
        });
      }
    } catch (error) {
      console.error('⚠️ Erro no keep-alive:', error.message);
      this.isLoggedIn = false;
    }
  }
}

export default new CanopusRPAService();
