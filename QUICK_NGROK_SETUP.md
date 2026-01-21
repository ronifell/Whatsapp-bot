# 🚀 Setup Rápido do ngrok

## ⚡ Instalação Rápida (5 minutos)

### 1. Baixar ngrok

1. Acesse: **https://ngrok.com/download**
2. Clique em **"Download for Windows"**
3. Baixe o arquivo ZIP

### 2. Extrair

1. Extraia o ZIP para: `C:\ngrok`
2. Você terá: `C:\ngrok\ngrok.exe`

### 3. Usar

**Opção A: Adicionar ao PATH (Recomendado)**

1. Pressione `Win + R`
2. Digite: `sysdm.cpl` e pressione Enter
3. Vá em **"Avançado"** → **"Variáveis de Ambiente"**
4. Em **"Variáveis do sistema"**, encontre **"Path"** → **"Editar"**
5. Clique **"Novo"** e adicione: `C:\ngrok`
6. Clique **"OK"** em todas as janelas
7. **Feche e reabra o terminal**

Agora use: `ngrok http 3000`

**Opção B: Usar direto (Sem instalar)**

```bash
C:\ngrok\ngrok.exe http 3000
```

### 4. Configurar (Opcional mas Recomendado)

1. Crie conta em: **https://dashboard.ngrok.com/signup**
2. Copie o **authtoken** do painel
3. Configure:

```bash
ngrok config add-authtoken seu_token_aqui
```

## ✅ Testar

```bash
ngrok http 3000
```

Você verá:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

Copie a URL: `https://abc123.ngrok.io`

## 🎯 Próximo Passo

Depois de ter a URL do ngrok:

```bash
npm run configure:webhook https://abc123.ngrok.io/webhook
```

---

**Dica:** Se preferir, coloque o `ngrok.exe` na pasta do projeto e use `.\ngrok.exe http 3000`
