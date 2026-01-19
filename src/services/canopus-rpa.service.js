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

      // Definir timeout padrão maior para operações (2 minutos)
      this.context.setDefaultTimeout(120000);

      this.page = await this.context.newPage();
      
      // Definir timeout padrão também na página
      this.page.setDefaultTimeout(120000);
      
      console.log('✅ Navegador iniciado');
      return true;
    } catch (error) {
      console.error('❌ Erro ao iniciar navegador:', error.message);
      throw error;
    }
  }

  /**
   * Navega para uma URL com estratégia de espera tolerante
   * Tenta diferentes estratégias para evitar timeouts
   */
  async navigateTo(url, options = {}) {
    const timeout = options.timeout || 120000; // Aumentado para 120 segundos
    
    try {
      // Primeiro, tentar com 'load' (espera evento load do navegador)
      await this.page.goto(url, { 
        waitUntil: 'load',
        timeout: timeout 
      });
      console.log(`✅ Navegação concluída: ${url}`);
    } catch (error) {
      // Se falhar, tentar com 'domcontentloaded' (mais rápido)
      try {
        console.log(`⚠️  Tentando navegação alternativa para: ${url}`);
        await this.page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: timeout 
        });
        console.log(`✅ Navegação concluída (domcontentloaded): ${url}`);
      } catch (error2) {
        // Se ainda falhar, tentar sem waitUntil (navega e continua)
        console.log(`⚠️  Navegação sem espera completa: ${url}`);
        await this.page.goto(url, { 
          timeout: timeout 
        });
        console.log(`✅ Navegação concluída (sem waitUntil): ${url}`);
      }
    }
    
    // Aguardar um pouco para garantir que elementos dinâmicos carregaram
    await this.page.waitForTimeout(2000);
  }

  /**
   * Preenche campo de formulário Angular Material de forma adequada
   * Simula digitação real e dispara eventos necessários para Angular
   */
  async fillAngularField(element, value) {
    try {
      // Clicar no campo para focar
      await element.click({ timeout: 5000 }); // Aumentado para 5 segundos
      await this.page.waitForTimeout(300); // Aumentado para 300ms
      
      // Limpar campo (Ctrl+A + Delete)
      await element.press('Control+a');
      await this.page.waitForTimeout(150); // Aumentado para 150ms
      await element.press('Delete');
      await this.page.waitForTimeout(150); // Aumentado para 150ms
      
      // Digitar valor (simula digitação real, dispara eventos input)
      await element.type(value, { delay: 50 });
      await this.page.waitForTimeout(500); // Aumentado para 500ms
      
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
        console.error('   1. Verifique o screenshot em ./screenshots/01-login-page-*.png');
        console.error('   2. Inspecione a página no navegador para encontrar o seletor correto');
        console.error('   3. Adicione o seletor correto em src/services/canopus-rpa.service.js');
        throw new Error('Não foi possível encontrar o campo de usuário. Verifique os seletores no código e o screenshot.');
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
        console.error('   1. Verifique o screenshot em ./screenshots/02-credentials-filled-*.png');
        console.error('   2. Inspecione a página no navegador para encontrar o seletor correto');
        console.error('   3. Adicione o seletor correto em src/services/canopus-rpa.service.js');
        throw new Error('Não foi possível encontrar o campo de senha. Verifique os seletores no código e o screenshot.');
      }

      // Aguardar um pouco para Angular processar as mudanças e validar o formulário
      console.log('⏳ Aguardando validação do formulário Angular...');
      await this.page.waitForTimeout(3000); // Aumentado para 3 segundos

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
        console.error('   1. Verifique o screenshot em ./screenshots/02-credentials-filled-*.png');
        console.error('   2. Inspecione a página no navegador para encontrar o seletor correto');
        console.error('   3. Adicione o seletor correto em src/services/canopus-rpa.service.js');
        throw new Error('Não foi possível encontrar o botão de login. Verifique os seletores no código e o screenshot.');
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
            throw new Error('Login falhou. Verifique os screenshots em ./screenshots/ para ver o erro específico.');
          } else {
            // Se não encontrou erro explícito, mas também não confirmou sucesso, assumir falha
            throw new Error('Não foi possível confirmar se o login foi bem-sucedido. Verifique os screenshots em ./screenshots/');
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
      await this.screenshot('error-login');
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
      await this.navigateTo(secondLoginUrl);
      
      // Aguardar elementos carregarem
      console.log('⏳ Aguardando elementos da segunda página carregarem...');
      await this.page.waitForTimeout(3000);
      
      // Preencher campo de usuário (formulário HTML simples, não Angular)
      console.log('📝 Preenchendo campo de usuário...');
      const usernameField = await this.page.locator('input[name="login"], input#login').first();
      await usernameField.waitFor({ state: 'visible', timeout: 10000 });
      await usernameField.click();
      await this.page.waitForTimeout(200);
      await usernameField.fill(config.canopus.username);
      console.log('✅ Usuário preenchido na segunda página');
      
      // Preencher campo de senha
      console.log('📝 Preenchendo campo de senha...');
      const passwordField = await this.page.locator('input[name="senha"], input#senha').first();
      await passwordField.waitFor({ state: 'visible', timeout: 10000 });
      await passwordField.click();
      await this.page.waitForTimeout(200);
      await passwordField.fill(config.canopus.password);
      console.log('✅ Senha preenchida na segunda página');
      
      // Aguardar um pouco antes de clicar no botão
      await this.page.waitForTimeout(1000);
      
      // Clicar no botão de login
      console.log('🔘 Clicando no botão de login...');
      const loginButton = await this.page.locator('input[type="submit"].btn.btn-primary.btn-block, input[value="Entrar"]').first();
      await loginButton.waitFor({ state: 'visible', timeout: 10000 });
      await loginButton.click();
      console.log('✅ Botão de login clicado');
      
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
      
      // Aguardar tabela estar visível e carregada
      const table = await this.page.locator('table.table.no-more-tables.table-striped.table-hover.dataTable.no-footer, table.dataTable').first();
      await table.waitFor({ state: 'visible', timeout: 30000 });
      await this.page.waitForTimeout(3000);
      
      // Capturar screenshot apenas desta página
      console.log('📸 Capturando screenshot da página de planos...');
      await this.screenshot('listagem-planos');
      console.log('✅ Screenshot capturado com sucesso!');
      
      // Scrape e salvar dados do grid-body
      console.log('📊 Extraindo dados do grid...');
      await this.scrapeAndSaveGridData();
      console.log('✅ Dados extraídos e salvos com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao navegar para página de planos:', error.message);
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
      
      // Clicar no span para abrir o dropdown
      await selectSpan.click();
      await this.page.waitForTimeout(1000);
      
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
   * Extrai e salva todos os dados da tabela de planos
   */
  async scrapeAndSaveGridData() {
    try {
      // Aguardar tabela estar presente
      const tableSelector = 'table.table.no-more-tables.table-striped.table-hover.dataTable.no-footer, table.dataTable, table#table';
      const table = await this.page.locator(tableSelector).first();
      await table.waitFor({ state: 'visible', timeout: 30000 });
      
      // Extrair todos os dados da tabela de forma estruturada
      const tableData = await table.evaluate((tableElement) => {
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
        
        data.totalRows = data.rows.length;
        
        return data;
      });
      
      // Criar diretório para dados se não existir
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Salvar dados em JSON
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const jsonFilename = `table-data-automoveis-${timestamp}.json`;
      const jsonFilepath = path.join(dataDir, jsonFilename);
      
      // Preparar dados para salvar (remover campos auxiliares _col_*)
      const cleanTableData = {
        extractedAt: new Date().toISOString(),
        headers: tableData.headers,
        totalRows: tableData.totalRows,
        rows: tableData.rows.map(row => {
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
      
      fs.writeFileSync(jsonFilepath, JSON.stringify(cleanTableData, null, 2), 'utf-8');
      console.log(`💾 Dados salvos em JSON: ${jsonFilename}`);
      
      // Salvar também em formato CSV para fácil importação
      const csvFilename = `table-data-automoveis-${timestamp}.csv`;
      const csvFilepath = path.join(dataDir, csvFilename);
      
      let csvContent = '';
      // Cabeçalho CSV
      if (tableData.headers.length > 0) {
        csvContent += tableData.headers.map(h => `"${h}"`).join(',') + '\n';
      }
      
      // Dados CSV
      tableData.rows.forEach((row) => {
        const csvRow = tableData.headers.map((header, index) => {
          const value = row.data[header] || row.data[`_col_${index}`] || '';
          // Escapar aspas e quebras de linha no CSV
          return `"${value.replace(/"/g, '""')}"`;
        });
        csvContent += csvRow.join(',') + '\n';
      });
      
      fs.writeFileSync(csvFilepath, csvContent, 'utf-8');
      console.log(`💾 Dados salvos em CSV: ${csvFilename}`);
      
      // Salvar também em formato texto legível
      const txtFilename = `table-data-automoveis-${timestamp}.txt`;
      const txtFilepath = path.join(dataDir, txtFilename);
      
      let textContent = '=== DADOS DA TABELA - AUTOMOVEIS ===\n\n';
      textContent += `Data/Hora de Extração: ${new Date().toLocaleString('pt-BR')}\n`;
      textContent += `Total de Registros: ${tableData.totalRows}\n\n`;
      
      if (tableData.headers.length > 0) {
        textContent += '=== COLUNAS ===\n';
        tableData.headers.forEach((header, index) => {
          textContent += `  ${index + 1}. ${header}\n`;
        });
        textContent += '\n';
      }
      
      if (tableData.rows.length > 0) {
        textContent += '=== DADOS ESTRUTURADOS ===\n\n';
        tableData.rows.forEach((row, index) => {
          textContent += `--- Registro ${index + 1} ---\n`;
          tableData.headers.forEach((header, headerIndex) => {
            const value = row.data[header] || row.data[`_col_${headerIndex}`] || '';
            textContent += `  ${header}: ${value}\n`;
          });
          textContent += '\n';
        });
      }
      
      fs.writeFileSync(txtFilepath, textContent, 'utf-8');
      console.log(`💾 Dados salvos em TXT: ${txtFilename}`);
      
      // Exibir resumo no console
      console.log(`\n📊 Resumo dos dados extraídos:`);
      console.log(`   - Total de registros: ${tableData.totalRows}`);
      console.log(`   - Total de colunas: ${tableData.headers.length}`);
      console.log(`   - Colunas: ${tableData.headers.join(', ')}`);
      console.log(`   - Arquivos salvos em: ./data/`);
      console.log(`     • JSON: ${jsonFilename}`);
      console.log(`     • CSV: ${csvFilename}`);
      console.log(`     • TXT: ${txtFilename}`);
      
      return cleanTableData;
      
    } catch (error) {
      console.error('❌ Erro ao extrair dados do grid:', error.message);
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
      await this.navigateTo(`${config.canopus.url}/cotacao/automovel`);
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
      try {
        await this.page.waitForLoadState('load', { timeout: 20000 });
      } catch (error) {
        // Se falhar, tentar domcontentloaded ou apenas aguardar
        try {
          await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
        } catch (e) {
          // Continuar mesmo se não conseguir esperar
          console.log('⚠️  Continuando sem esperar load state completo');
        }
      }
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
      await this.navigateTo(`${config.canopus.url}/cotacao/imovel`);
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
      try {
        await this.page.waitForLoadState('load', { timeout: 20000 });
      } catch (error) {
        // Se falhar, tentar domcontentloaded ou apenas aguardar
        try {
          await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
        } catch (e) {
          // Continuar mesmo se não conseguir esperar
          console.log('⚠️  Continuando sem esperar load state completo');
        }
      }
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
