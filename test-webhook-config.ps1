# Script para testar configuração de webhook Z-API
# Baseado no padrão de endpoint fornecido pelo cliente

$webhookUrl = "https://nongrieved-maeve-shelteringly.ngrok-free.dev/webhook"
$baseUrl = "https://api.z-api.io/instances/3ED53E69CF90C19ADB44D66739CEE648/token/8AF4D86F7CA2A2FDD649066A"

# Se webhook URL foi passado como argumento, use ele
if ($args.Count -gt 0) {
    $webhookUrl = $args[0]
}

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  TESTE DE CONFIGURACAO DE WEBHOOK Z-API" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL do Webhook: $webhookUrl" -ForegroundColor Yellow
Write-Host "Instance ID: 3ED53E69CF90C19ADB44D66739CEE648" -ForegroundColor Yellow
Write-Host "Base URL: https://api.z-api.io" -ForegroundColor Yellow
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# Try different endpoints based on the pattern from client
$endpoints = @(
    @{ name = "set-webhook"; payload = @{ value = $webhookUrl } },
    @{ name = "set-received-callback"; payload = @{ value = $webhookUrl } },
    @{ name = "webhook"; payload = @{ url = $webhookUrl } },
    @{ name = "callback"; payload = @{ value = $webhookUrl } },
    @{ name = "set-webhook"; payload = @{ url = $webhookUrl } },
    @{ name = "set-received-callback"; payload = @{ url = $webhookUrl } }
)

$success = $false

foreach ($endpoint in $endpoints) {
    Write-Host "[TENTANDO] $($endpoint.name) com payload: $($endpoint.payload.Keys -join ', ')" -ForegroundColor Yellow
    
    $body = $endpoint.payload | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/$($endpoint.name)" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body `
            -ErrorAction Stop
        
        $responseData = $response.Content | ConvertFrom-Json
        
        # Check if response contains error
        if ($responseData.error -or $responseData.status -eq "error") {
            Write-Host "[AVISO] $($endpoint.name) retornou erro na resposta" -ForegroundColor Red
            Write-Host "   Resposta: $($response.Content)" -ForegroundColor Gray
            continue
        }
        
        Write-Host "[SUCESSO] $($endpoint.name)!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Resposta da API:" -ForegroundColor Cyan
        Write-Host ($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10) -ForegroundColor White
        Write-Host ""
        Write-Host "===========================================================" -ForegroundColor Cyan
        Write-Host "Webhook configurado com sucesso!" -ForegroundColor Green
        Write-Host "===========================================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Proximos passos:" -ForegroundColor Yellow
        Write-Host "   1. Inicie o servidor: npm start" -ForegroundColor White
        Write-Host "   2. Envie uma mensagem para o WhatsApp: 5511999484829" -ForegroundColor White
        Write-Host "   3. Verifique os logs no console" -ForegroundColor White
        Write-Host ""
        
        $success = $true
        break
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = $_.Exception.Message
        
        if ($statusCode -eq 404) {
            Write-Host "[AVISO] $($endpoint.name) nao encontrado (404)" -ForegroundColor Yellow
        } elseif ($statusCode -eq 401) {
            Write-Host "[ERRO] $($endpoint.name) - Nao autorizado (401)" -ForegroundColor Red
            Write-Host "   Verifique se o token esta correto" -ForegroundColor Gray
        } elseif ($statusCode -eq 400) {
            Write-Host "[AVISO] $($endpoint.name) - Requisicao invalida (400)" -ForegroundColor Yellow
        } else {
            Write-Host "[ERRO] $($endpoint.name) falhou: $errorMessage" -ForegroundColor Red
        }
        
        # Try to read error response
        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                $reader.Close()
                Write-Host "   Resposta: $responseBody" -ForegroundColor Gray
            } catch {
                # Ignore if can't read response
            }
        }
        
        Write-Host ""
    }
}

if (-not $success) {
    Write-Host ""
    Write-Host "===========================================================" -ForegroundColor Red
    Write-Host "[ERRO] NENHUM ENDPOINT FUNCIONOU" -ForegroundColor Red
    Write-Host "===========================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUCOES ALTERNATIVAS:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opcao 1: Configuracao Manual no Painel Z-API" -ForegroundColor Cyan
    Write-Host "   1. Acesse: https://www.z-api.io" -ForegroundColor White
    Write-Host "   2. Faca login com as credenciais do cliente" -ForegroundColor White
    Write-Host "   3. Va na instancia: 3ED53E69CF90C19ADB44D66739CEE648" -ForegroundColor White
    Write-Host "   4. Configure o webhook manualmente:" -ForegroundColor White
    Write-Host "      - URL: $webhookUrl" -ForegroundColor White
    Write-Host "      - Eventos: message, message-received" -ForegroundColor White
    Write-Host ""
    Write-Host "Opcao 2: Testar Mesmo com Erro" -ForegroundColor Cyan
    Write-Host "   As vezes a API retorna erro mas o webhook e configurado." -ForegroundColor White
    Write-Host "   Teste enviando uma mensagem para o WhatsApp e veja se aparece nos logs." -ForegroundColor White
    Write-Host ""
    Write-Host "Opcao 3: Verificar Documentacao Z-API" -ForegroundColor Cyan
    Write-Host "   A API pode ter mudado. Verifique:" -ForegroundColor White
    Write-Host "   - https://developer.z-api.io/" -ForegroundColor White
    Write-Host "   - Ou peca ao cliente para verificar no painel qual e o endpoint correto" -ForegroundColor White
    Write-Host ""
    Write-Host "===========================================================" -ForegroundColor Red
    Write-Host ""
}
