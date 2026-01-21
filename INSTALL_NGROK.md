# Como Instalar ngrok no Windows

O ngrok não está instalado no seu sistema. Siga estas instruções para instalar.

## 📥 Método 1: Download Direto (Recomendado)

### Passo 1: Baixar ngrok

1. Acesse: [https://ngrok.com/download](https://ngrok.com/download)
2. Selecione **Windows**
3. Baixe o arquivo ZIP (ngrok-stable-windows-amd64.zip)

### Passo 2: Extrair

1. **Extraia o ZIP** para uma pasta fácil de acessar:
   - Exemplo: `C:\ngrok`
   - Ou: `C:\Users\SeuUsuario\ngrok`

2. **Você terá um arquivo:** `ngrok.exe`

### Passo 3: Usar ngrok

Você tem duas opções:

#### Opção A: Adicionar ao PATH (Permanente)

1. Pressione `Win + X` e escolha "Sistema"
2. Clique em "Configurações avançadas do sistema"
3. Clique em "Variáveis de Ambiente"
4. Em "Variáveis do sistema", encontre "Path" e clique em "Editar"
5. Clique em "Novo" e adicione o caminho onde extraiu o ngrok
   - Exemplo: `C:\ngrok`
6. Clique em "OK" em todas as janelas
7. **Feche e reabra o terminal/PowerShell**

Agora você pode usar: `ngrok http 3000`

#### Opção B: Usar com Caminho Completo (Temporário)

Use o caminho completo sempre:

```bash
C:\ngrok\ngrok.exe http 3000
```

Ou se estiver na pasta do ngrok:

```bash
cd C:\ngrok
.\ngrok.exe http 3000
```

### Passo 4: Criar Conta (Opcional mas Recomendado)

1. Acesse [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
2. Crie uma conta gratuita
3. No painel, copie seu **authtoken**
4. Configure no terminal:

```bash
ngrok config add-authtoken seu_token_aqui
```

Isso permite URLs mais estáveis e remove limites.

## 🚀 Método 2: Usar Direto do Projeto (Mais Simples)

Se não quiser instalar globalmente:

1. **Baixe o ngrok.exe** de [https://ngrok.com/download](https://ngrok.com/download)
2. **Coloque na pasta do projeto** (mesma pasta onde está o `package.json`)
3. **Use assim:**

```bash
.\ngrok.exe http 3000
```

Ou crie um arquivo `start-ngrok.bat`:

```batch
@echo off
echo Iniciando ngrok...
ngrok.exe http 3000
pause
```

## ✅ Verificar se Funcionou

Após instalar, teste:

```bash
ngrok version
```

Ou:

```bash
ngrok http 3000
```

Você deve ver algo como:

```
ngrok

Session Status                online
Account                       [seu email] (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

A URL importante é: `https://abc123.ngrok.io` (sua será diferente)

## 📝 Próximos Passos Após Instalar

1. **Inicie o ngrok:**
   ```bash
   ngrok http 3000
   ```

2. **Copie a URL HTTPS** que aparece (ex: `https://abc123.ngrok.io`)

3. **Configure o webhook:**
   ```bash
   npm run configure:webhook https://abc123.ngrok.io/webhook
   ```

4. **Inicie o servidor (em outro terminal):**
   ```bash
   npm start
   ```

## ⚠️ Notas Importantes

- **URLs do ngrok gratuito mudam a cada reinício**
- Se você reiniciar o ngrok, precisará reconfigurar o webhook
- Para produção, considere usar um servidor com URL fixa

## 🆘 Problemas Comuns

### "ngrok não é reconhecido"

**Solução:** 
- Verifique se adicionou ao PATH
- Reinicie o terminal após adicionar ao PATH
- Ou use o caminho completo: `C:\ngrok\ngrok.exe http 3000`

### "Erro de autenticação"

**Solução:**
1. Crie uma conta gratuita em [ngrok.com](https://ngrok.com)
2. Obtenha seu authtoken no painel
3. Configure:
   ```bash
   ngrok config add-authtoken seu_token_aqui
   ```

### "Porta já em uso"

**Solução:**
- Verifique se já tem algo rodando na porta 3000
- Ou use outra porta: `ngrok http 3001`
- E ajuste o PORT no `.env` se necessário

---

**Pronto!** Após instalar o ngrok, você poderá criar URLs públicas para testar o webhook localmente! 🎉
