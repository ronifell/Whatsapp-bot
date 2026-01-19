import { chromium } from 'playwright';
import { config } from '../config/config.js';
import fs from 'fs';
import path from 'path';

/**
 * Serviço de RPA para automação do portal Canopus
 */
class CanopusRPAService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isLoggedIn = false;
  }

  /**
   * Inicializa o navegador
   */
  async initBrowser(headless = true) {
    try {
      console.log('🚀 Iniciando navegador...');
      
      this.browser = await chromium.launch({
        headless: headless,
        args: ['--start-maximized']
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      this.page = await this.context.newPage();
      
      console.log('✅ Navegador iniciado');
      return true;
    } catch (error) {
      console.error('❌ Erro ao iniciar navegador:', error.message);
      throw error;
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
        '.error',
        '.alert-danger',
        '.login-error',
        '[class*="error"]',
        '[class*="invalid"]',
        'text=/usuário.*inválido/i',
        'text=/senha.*incorreta/i',
        'text=/credenciais.*inválidas/i'
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
      
      await this.page.goto(config.canopus.url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Aguardar página carregar completamente
      await this.page.waitForTimeout(2000);

      // Captura screenshot da página de login
      await this.screenshot('01-login-page');

      // IMPORTANTE: Os seletores abaixo são EXEMPLOS
      // Você precisa ajustá-los de acordo com o site real da Canopus
      
      // Procurar campo de usuário com múltiplas tentativas
      const usernameSelectors = [
        'input[name="username"]',
        'input[name="user"]',
        'input[name="email"]',
        'input[type="text"]',
        'input#username',
        'input#user',
        'input#email',
        'input[placeholder*="usuário" i]',
        'input[placeholder*="email" i]',
        'input[placeholder*="login" i]'
      ];

      let usernameFilled = false;
      for (const selector of usernameSelectors) {
        try {
          const element = await this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.fill(config.canopus.username);
            console.log(`✅ Usuário preenchido (seletor: ${selector})`);
            usernameFilled = true;
            break;
          }
        } catch (e) {
          // Tentar próximo seletor
        }
      }

      if (!usernameFilled) {
        throw new Error('Não foi possível encontrar o campo de usuário. Verifique os seletores no código.');
      }

      // Procurar campo de senha
      const passwordSelectors = [
        'input[name="password"]',
        'input[name="senha"]',
        'input[type="password"]',
        'input#password',
        'input#senha',
        'input[placeholder*="senha" i]',
        'input[placeholder*="password" i]'
      ];

      let passwordFilled = false;
      for (const selector of passwordSelectors) {
        try {
          const element = await this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.fill(config.canopus.password);
            console.log(`✅ Senha preenchida (seletor: ${selector})`);
            passwordFilled = true;
            break;
          }
        } catch (e) {
          // Tentar próximo seletor
        }
      }

      if (!passwordFilled) {
        throw new Error('Não foi possível encontrar o campo de senha. Verifique os seletores no código.');
      }

      await this.screenshot('02-credentials-filled');

      // Procurar botão de login
      const loginButtonSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Entrar")',
        'button:has-text("Login")',
        'button:has-text("Acessar")',
        'button.btn-login',
        'button.btn-primary',
        'form button',
        'button[class*="login"]',
        'button[class*="submit"]'
      ];

      let buttonClicked = false;
      for (const selector of loginButtonSelectors) {
        try {
          const element = await this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            console.log(`🔘 Botão de login clicado (seletor: ${selector})`);
            buttonClicked = true;
            break;
          }
        } catch (e) {
          // Tentar próximo seletor
        }
      }

      if (!buttonClicked) {
        // Tentar pressionar Enter no campo de senha
        try {
          await this.page.keyboard.press('Enter');
          console.log('🔘 Enter pressionado no campo de senha');
          buttonClicked = true;
        } catch (e) {
          throw new Error('Não foi possível encontrar o botão de login. Verifique os seletores no código.');
        }
      }

      // Aguardar navegação após login
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });
      await this.page.waitForTimeout(3000); // Aguardar um pouco mais para garantir

      await this.screenshot('03-after-login');

      // Verificar se o login foi bem-sucedido
      const loginSuccessful = await this.verifyLoginSuccess();
      
      if (!loginSuccessful) {
        // Verificar se há mensagens de erro visíveis
        const pageText = await this.page.textContent('body');
        const errorKeywords = ['erro', 'inválido', 'incorreto', 'falhou', 'error', 'invalid', 'incorrect'];
        const hasError = errorKeywords.some(keyword => 
          pageText.toLowerCase().includes(keyword)
        );

        if (hasError) {
          throw new Error('Login falhou. Verifique as credenciais no arquivo .env e os seletores no código.');
        } else {
          // Se não encontrou erro explícito, mas também não confirmou sucesso, assumir falha
          throw new Error('Não foi possível confirmar se o login foi bem-sucedido. Verifique os screenshots em ./screenshots/');
        }
      }

      this.isLoggedIn = true;
      console.log('✅ Login realizado com sucesso!');
      console.log(`   URL atual: ${this.page.url()}`);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao fazer login:', error.message);
      await this.screenshot('error-login');
      this.isLoggedIn = false;
      throw error;
    }
  }

  /**
   * Gera cotação de consórcio de automóvel
   */
  async generateCarQuotation(data) {
    try {
      console.log('🚗 Gerando cotação de automóvel...');
      
      if (!this.isLoggedIn) {
        await this.login();
      }

      // Navegar para página de cotação de automóvel
      // IMPORTANTE: Ajustar URL e seletores conforme o site real
      await this.page.goto(`${config.canopus.url}/cotacao/automovel`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.page.waitForTimeout(2000);
      await this.screenshot('04-car-quotation-page');

      // Preencher valor do veículo
      const valueSelector = 'input[name="valor"], input#valor, input[placeholder*="valor"]';
      await this.page.waitForSelector(valueSelector, { timeout: 10000 });
      await this.page.fill(valueSelector, data.valor.toString());
      console.log(`✅ Valor preenchido: R$ ${data.valor}`);

      // Selecionar prazo
      const prazoSelector = 'select[name="prazo"], select#prazo';
      await this.page.selectOption(prazoSelector, data.prazo.toString());
      console.log(`✅ Prazo selecionado: ${data.prazo} meses`);

      // Preencher dados pessoais
      await this.page.fill('input[name="nome"], input#nome', data.nome);
      await this.page.fill('input[name="cpf"], input#cpf', data.cpf);
      await this.page.fill('input[name="dataNascimento"], input#dataNascimento', data.dataNascimento);
      await this.page.fill('input[name="email"], input#email', data.email);
      
      console.log('✅ Dados pessoais preenchidos');

      await this.screenshot('05-form-filled');

      // Clicar em gerar cotação
      const generateButtonSelector = 'button:has-text("Gerar"), button:has-text("Cotar"), button[type="submit"]';
      await this.page.click(generateButtonSelector);
      console.log('🔘 Botão de gerar cotação clicado');

      // Aguardar resultado
      await this.page.waitForLoadState('networkidle', { timeout: 20000 });
      await this.page.waitForTimeout(3000);

      await this.screenshot('06-quotation-result');

      // Extrair dados da cotação
      const quotationData = await this.extractQuotationData('CARRO', data.valor, data.prazo);
      
      console.log('✅ Cotação de automóvel gerada com sucesso!');
      return quotationData;

    } catch (error) {
      console.error('❌ Erro ao gerar cotação de automóvel:', error.message);
      await this.screenshot('error-car-quotation');
      throw error;
    }
  }

  /**
   * Gera cotação de consórcio de imóvel
   */
  async generatePropertyQuotation(data) {
    try {
      console.log('🏠 Gerando cotação de imóvel...');
      
      if (!this.isLoggedIn) {
        await this.login();
      }

      // Navegar para página de cotação de imóvel
      // IMPORTANTE: Ajustar URL e seletores conforme o site real
      await this.page.goto(`${config.canopus.url}/cotacao/imovel`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.page.waitForTimeout(2000);
      await this.screenshot('07-property-quotation-page');

      // Preencher valor do imóvel
      const valueSelector = 'input[name="valor"], input#valor, input[placeholder*="valor"]';
      await this.page.waitForSelector(valueSelector, { timeout: 10000 });
      await this.page.fill(valueSelector, data.valor.toString());
      console.log(`✅ Valor preenchido: R$ ${data.valor}`);

      // Selecionar prazo
      const prazoSelector = 'select[name="prazo"], select#prazo';
      await this.page.selectOption(prazoSelector, data.prazo.toString());
      console.log(`✅ Prazo selecionado: ${data.prazo} meses`);

      // Preencher dados pessoais
      await this.page.fill('input[name="nome"], input#nome', data.nome);
      await this.page.fill('input[name="cpf"], input#cpf', data.cpf);
      await this.page.fill('input[name="dataNascimento"], input#dataNascimento', data.dataNascimento);
      await this.page.fill('input[name="email"], input#email', data.email);
      
      console.log('✅ Dados pessoais preenchidos');

      await this.screenshot('08-form-filled');

      // Clicar em gerar cotação
      const generateButtonSelector = 'button:has-text("Gerar"), button:has-text("Cotar"), button[type="submit"]';
      await this.page.click(generateButtonSelector);
      console.log('🔘 Botão de gerar cotação clicado');

      // Aguardar resultado
      await this.page.waitForLoadState('networkidle', { timeout: 20000 });
      await this.page.waitForTimeout(3000);

      await this.screenshot('09-quotation-result');

      // Extrair dados da cotação
      const quotationData = await this.extractQuotationData('IMOVEL', data.valor, data.prazo);
      
      console.log('✅ Cotação de imóvel gerada com sucesso!');
      return quotationData;

    } catch (error) {
      console.error('❌ Erro ao gerar cotação de imóvel:', error.message);
      await this.screenshot('error-property-quotation');
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
   * Captura screenshot
   */
  async screenshot(name) {
    try {
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${name}-${timestamp}.png`;
      const filepath = path.join(screenshotsDir, filename);

      await this.page.screenshot({ 
        path: filepath,
        fullPage: true 
      });
      
      console.log(`📸 Screenshot salvo: ${filename}`);
    } catch (error) {
      console.error('⚠️ Erro ao capturar screenshot:', error.message);
    }
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
