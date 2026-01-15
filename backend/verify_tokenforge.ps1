
$baseUrl = "http://localhost:3000/api"
$timestamp = Get-Date -Format "yyyyMMddHHmm"
$testUser = "testuser_$timestamp"
$testEmail = "$testUser@example.com"

Write-Host "`n--- 🛡️ TokenForge Automated Verification ---" -ForegroundColor Cyan

# 1. Health Check
Write-Host "`n[1/4] Checking Health Status..." -NoNewline
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/auth/health" -Method Get
    if ($health.status -eq "ok") {
        Write-Host " ✅ OK" -ForegroundColor Green
    } else {
        Write-Host " ❌ FAILED (Status: $($health.status))" -ForegroundColor Red
    }
} catch {
    Write-Host " ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. OIDC Discovery
Write-Host "[2/4] Checking OIDC Discovery..." -NoNewline
try {
    $oidc = Invoke-RestMethod -Uri "$baseUrl/.well-known/openid-configuration" -Method Get
    if ($oidc.issuer -match "http://localhost:3000/api") {
        Write-Host " ✅ OK (OIDC Compliant)" -ForegroundColor Green
    } else {
        Write-Host " ❌ FAILED (Invalid Issuer)" -ForegroundColor Red
    }
} catch {
    Write-Host " ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. User Registration (Database Test)
Write-Host "[3/4] Testing User Registration..." -NoNewline
try {
    $regBody = @{
        email = $testEmail
        username = $testUser
        password = "SecurePassword123!"
        firstName = "Test"
        lastName = "User"
    } | ConvertTo-Json

    $regResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regBody -ContentType "application/json"
    if ($regResponse.message -match "successfully") {
        Write-Host " ✅ OK (User Registered)" -ForegroundColor Green
    } else {
        Write-Host " ❌ FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host " ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Rate Limiting (Throttler Test)
Write-Host "[4/4] Testing Rate Limiting (Spamming Health Endpoint)..." -NoNewline
$triggered = $false
for ($i = 1; $i -le 15; $i++) {
    try {
        $res = Invoke-WebRequest -Uri "$baseUrl/auth/health" -Method Get -ErrorAction SilentlyContinue
    } catch {
        if ($_.Exception.Message -match "429") {
            $triggered = $true
            break
        }
    }
}

if ($triggered) {
    Write-Host " ✅ OK (Throttler active - 429 Received)" -ForegroundColor Green
} else {
    Write-Host " ❌ FAILED (No rate limiting triggered)" -ForegroundColor Yellow
}

Write-Host "`n--- ✅ Verification Complete ---`n" -ForegroundColor Cyan
