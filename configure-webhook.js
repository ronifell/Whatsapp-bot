import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function configureWebhook() {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const baseUrl = process.env.ZAPI_BASE_URL || 'https://api.z-api.io';
  
  // URL pública do seu webhook (ngrok ou servidor)
  const webhookUrl = process.argv[2]; // Recebe como argumento: node configure-webhook.js https://sua-url.com/webhook
  
  if (!webhookUrl) {
    console.error('\n❌ Erro: Forneça a URL do webhook como argumento');
    console.log('\n📖 Uso:');
    console.log('   node configure-webhook.js <URL_DO_WEBHOOK>');
    console.log('\n📝 Exemplos:');
    console.log('   node configure-webhook.js https://abc123.ngrok.io/webhook');
    console.log('   node configure-webhook.js https://cotafacil.com/webhook');
    console.log('\n💡 Dica: Se estiver usando ngrok, copie a URL HTTPS que aparece no terminal do ngrok');
    process.exit(1);
  }
  
  if (!instanceId || !token) {
    console.error('\n❌ Erro: ZAPI_INSTANCE_ID e ZAPI_TOKEN devem estar configurados no .env');
    console.log('\n📝 Verifique se o arquivo .env contém:');
    console.log('   ZAPI_INSTANCE_ID=seu_instance_id');
    console.log('   ZAPI_TOKEN=seu_token');
    console.log('   ZAPI_BASE_URL=https://api.z-api.io');
    process.exit(1);
  }
  
  const apiUrl = `${baseUrl}/instances/${instanceId}/token/${token}`;
  
  try {
    console.log('\n' + '═'.repeat(70));
    console.log('🔧 CONFIGURANDO WEBHOOK Z-API');
    console.log('═'.repeat(70));
    console.log(`📡 URL do Webhook: ${webhookUrl}`);
    console.log(`🔑 Instance ID: ${instanceId}`);
    console.log(`🌐 Base URL: ${baseUrl}`);
    console.log('═'.repeat(70) + '\n');
    
    console.log('⏳ Enviando requisição para Z-API...\n');
    
    // Função auxiliar para verificar se a resposta contém erro
    function hasError(response) {
      if (!response || !response.data) return false;
      const data = response.data;
      return data.error || data.status === 'error' || (data.message && data.message.toLowerCase().includes('error'));
    }
    
    // Tentar diferentes endpoints em ordem com várias variações
    // Baseado no padrão fornecido pelo cliente: /instances/{id}/token/{token}/send-text
    // Priorizamos endpoints que seguem o mesmo padrão
    const endpoints = [
      // Endpoints mais prováveis baseados no padrão do cliente (tentados primeiro)
      { name: 'set-webhook (POST value)', method: 'post', path: '/set-webhook', payload: { value: webhookUrl } },
      { name: 'set-received-callback (POST value)', method: 'post', path: '/set-received-callback', payload: { value: webhookUrl } },
      { name: 'webhook (POST url)', method: 'post', path: '/webhook', payload: { url: webhookUrl } },
      { name: 'callback (POST value)', method: 'post', path: '/callback', payload: { value: webhookUrl } },
      
      // Variações com diferentes payloads
      { name: 'set-webhook (POST url)', method: 'post', path: '/set-webhook', payload: { url: webhookUrl } },
      { name: 'set-received-callback (POST url)', method: 'post', path: '/set-received-callback', payload: { url: webhookUrl } },
      { name: 'webhook (POST value)', method: 'post', path: '/webhook', payload: { value: webhookUrl } },
      { name: 'received-callback (POST value)', method: 'post', path: '/received-callback', payload: { value: webhookUrl } },
      
      // Endpoints alternativos
      { name: 'update-webhook (POST)', method: 'post', path: '/update-webhook', payload: { webhook: webhookUrl } },
      { name: 'update-webhook (POST value)', method: 'post', path: '/update-webhook', payload: { value: webhookUrl } },
      
      // PUT methods (menos comuns)
      { name: 'set-webhook (PUT value)', method: 'put', path: '/set-webhook', payload: { value: webhookUrl } },
      { name: 'set-received-callback (PUT value)', method: 'put', path: '/set-received-callback', payload: { value: webhookUrl } }
    ];
    
    let response;
    let lastError = null;
    let successEndpoint = null;
    
    for (const endpoint of endpoints) {
      try {
        const fullUrl = `${apiUrl}${endpoint.path}`;
        console.log(`🔄 Tentando: ${endpoint.name}...`);
        console.log(`   📍 URL: ${fullUrl}`);
        console.log(`   📤 Método: ${endpoint.method.toUpperCase()}`);
        console.log(`   📦 Payload: ${JSON.stringify(endpoint.payload)}`);
        
        // Usar o método HTTP apropriado
        if (endpoint.method === 'put') {
          response = await axios.put(fullUrl, endpoint.payload);
        } else {
          response = await axios.post(fullUrl, endpoint.payload);
        }
        
        // Verificar se a resposta contém erro mesmo com status 200
        if (hasError(response)) {
          console.log(`   ⚠️  Retornou erro na resposta`);
          console.log(`   📊 Status: ${response.status}`);
          console.log(`   📋 Resposta: ${JSON.stringify(response.data, null, 2)}`);
          lastError = new Error(response.data.message || response.data.error || 'Erro desconhecido na resposta');
          lastError.response = response;
          console.log(''); // Linha em branco
          continue; // Tentar próximo endpoint
        }
        
        // Sucesso!
        successEndpoint = endpoint.name;
        console.log(`   ✅ Sucesso!`);
        console.log(`   📊 Status: ${response.status}`);
        console.log(`   📋 Resposta: ${JSON.stringify(response.data, null, 2)}`);
        console.log(`✅ Webhook configurado usando ${endpoint.name}\n`);
        break;
        
      } catch (error) {
        const statusCode = error.response?.status;
        const responseData = error.response?.data;
        const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
        
        console.log(`   ❌ Falhou:`);
        console.log(`      📊 Status: ${statusCode || 'N/A'}`);
        console.log(`      📝 Mensagem: ${errorMessage}`);
        
        if (responseData && Object.keys(responseData).length > 0) {
          console.log(`      📋 Resposta completa:`);
          console.log(`         ${JSON.stringify(responseData, null, 2).split('\n').join('\n         ')}`);
        }
        console.log(''); // Linha em branco
        
        // Se for 404, tentar próximo endpoint
        if (statusCode === 404) {
          lastError = error;
          continue;
        }
        
        // Se for outro erro HTTP, verificar se tem erro na resposta
        if (error.response && hasError(error.response)) {
          lastError = error;
          continue;
        }
        
        // Se for 405 (Method Not Allowed), tentar próximo
        if (statusCode === 405) {
          lastError = error;
          continue;
        }
        
        // Se for 400, 401, 403, 500+, salvar e continuar
        if (statusCode >= 400 && statusCode < 600) {
          lastError = error;
          continue;
        }
        
        // Erro não esperado (rede, timeout, etc), lançar
        throw error;
      }
    }
    
    // Verificar se algum endpoint funcionou
    if (!successEndpoint) {
      console.error('\n' + '═'.repeat(70));
      console.error('❌ NENHUM ENDPOINT FUNCIONOU');
      console.error('═'.repeat(70));
      console.error('\n📊 Resumo das tentativas:');
      console.error(`   • Total de endpoints testados: ${endpoints.length}`);
      
      if (lastError?.response) {
        const statusCode = lastError.response.status;
        const responseData = lastError.response.data;
        console.error(`\n📋 Última resposta recebida:`);
        console.error(`   • Status HTTP: ${statusCode}`);
        console.error(`   • URL testada: ${apiUrl}${endpoints[endpoints.length - 1]?.path || 'N/A'}`);
        
        if (responseData) {
          console.error(`   • Resposta completa:`);
          console.error(JSON.stringify(responseData, null, 2).split('\n').map(line => `      ${line}`).join('\n'));
        }
        
        // Análise específica por status code
        if (statusCode === 401) {
          console.error(`\n💡 Status 401 (Não Autorizado):`);
          console.error(`   • Token ou Instance ID podem estar incorretos`);
          console.error(`   • Verifique ZAPI_TOKEN e ZAPI_INSTANCE_ID no arquivo .env`);
        } else if (statusCode === 404) {
          console.error(`\n💡 Status 404 (Não Encontrado):`);
          console.error(`   • O endpoint pode não existir nesta versão da Z-API`);
          console.error(`   • Verifique a documentação: https://developer.z-api.io/`);
        } else if (statusCode === 400) {
          console.error(`\n💡 Status 400 (Requisição Inválida):`);
          console.error(`   • A URL do webhook pode estar em formato incorreto`);
          console.error(`   • Verifique se a URL começa com http:// ou https://`);
        } else if (statusCode === 405) {
          console.error(`\n💡 Status 405 (Método Não Permitido):`);
          console.error(`   • O método HTTP pode estar incorreto`);
          console.error(`   • A API pode exigir configuração manual no painel`);
        }
      } else if (lastError) {
        console.error(`\n📋 Último erro capturado:`);
        console.error(`   • Mensagem: ${lastError.message}`);
        console.error(`   • Tipo: ${lastError.name || 'Erro desconhecido'}`);
      }
      
      console.error('\n' + '═'.repeat(70));
      console.error('💡 SOLUÇÕES ALTERNATIVAS');
      console.error('═'.repeat(70));
      console.error('\n📋 Opção 1: Configuração Manual no Painel Z-API');
      console.error('   1. Acesse: https://www.z-api.io');
      console.error('   2. Faça login com as credenciais do cliente');
      console.error(`   3. Vá na instância: ${instanceId}`);
      console.error('   4. Configure o webhook manualmente:');
      console.error(`      - URL: ${webhookUrl}`);
      console.error('      - Eventos: message, message-received');
      console.error('\n📋 Opção 2: Testar Mesmo com Erro');
      console.error('   Às vezes a API retorna erro mas o webhook é configurado.');
      console.error('   Teste enviando uma mensagem para o WhatsApp e veja se aparece nos logs.');
      console.error('\n📋 Opção 3: Verificar Documentação Z-API');
      console.error('   A API pode ter mudado. Verifique:');
      console.error('   - https://developer.z-api.io/');
      console.error('   - Ou peça ao cliente para verificar no painel qual é o endpoint correto');
      console.error('\n📋 Opção 4: Usar curl diretamente');
      console.error(`   curl -X POST "${apiUrl}/set-webhook" \\`);
      console.error(`     -H "Content-Type: application/json" \\`);
      console.error(`     -d '{"value": "${webhookUrl}"}'`);
      console.error('\n' + '═'.repeat(70) + '\n');
      
      throw lastError || new Error('Todos os endpoints falharam');
    }
    
    console.log('✅ Webhook configurado com sucesso!\n');
    console.log('📋 Resposta da API:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n' + '═'.repeat(70));
    console.log('🎉 Configuração concluída!');
    console.log('═'.repeat(70));
    console.log('\n💡 Próximos passos:');
    console.log('   1. Inicie o servidor: npm start');
    console.log('   2. Envie uma mensagem de teste para o WhatsApp do bot');
    console.log('   3. Verifique os logs no console para confirmar que está funcionando\n');
    
  } catch (error) {
    console.error('\n' + '═'.repeat(70));
    console.error('❌ ERRO AO CONFIGURAR WEBHOOK');
    console.error('═'.repeat(70));
    
    if (error.response) {
      console.error(`\n📊 Status HTTP: ${error.response.status}`);
      console.error('📋 Resposta da API:');
      console.error(JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.error('\n💡 Possíveis causas:');
        console.error('   - Token inválido ou expirado');
        console.error('   - Instance ID incorreto');
        console.error('   - Verifique as credenciais no arquivo .env');
      } else if (error.response.status === 404) {
        console.error('\n💡 Possíveis causas:');
        console.error('   - Instance ID não encontrado');
        console.error('   - URL da API incorreta');
        console.error('   - Verifique ZAPI_BASE_URL no arquivo .env');
        console.error('   - O endpoint pode não estar disponível nesta versão da Z-API');
      } else if (error.response.status === 400) {
        console.error('\n💡 Possíveis causas:');
        console.error('   - URL do webhook inválida');
        console.error('   - URL deve começar com http:// ou https://');
        console.error('   - Verifique se a URL está acessível publicamente');
      }
    } else {
      console.error('\n📋 Erro:', error.message);
      console.error('\n💡 Possíveis causas:');
      console.error('   - Sem conexão com a internet');
      console.error('   - URL da API inacessível');
      console.error('   - Verifique ZAPI_BASE_URL no arquivo .env');
    }
    
    console.error('\n💡 Dica: Algumas versões da Z-API podem exigir configuração manual do webhook no painel.');
    console.error('   Acesse o painel Z-API e configure o webhook manualmente se necessário.\n');
    
    console.error('═'.repeat(70) + '\n');
    process.exit(1);
  }
}

configureWebhook();
