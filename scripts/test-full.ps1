# TokenForge Scorch Test 🔥
# Verifies the full authentication lifecycle

Write-Host "`n🚀 Starting TokenForge System Test...`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api/auth"
$testUser = "testuser_$(Get-Random)"
$testEmail = "test_$(Get-Random)@example.com"
$headers = @{}

# 1. Health Check
Write-Host "1️⃣  Testing Health Endpoint..." -NoNewline
try {
    $res = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    Write-Host " OK ✅" -ForegroundColor Green
} catch {
    Write-Host " FAILED ❌" -ForegroundColor Red
    Write-Error $_
    exit
}

# 2. Register
Write-Host "2️⃣  Registering New User ($testUser)..." -NoNewline
$body = @{
    email = $testEmail
    username = $testUser
    password = "Password123!"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

try {
    $res = Invoke-WebRequest -Uri "$baseUrl/register" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    $data = $res.Content | ConvertFrom-Json
    $accessToken = $data.accessToken
    $refreshToken = $data.refreshToken
    Write-Host " OK ✅" -ForegroundColor Green
} catch {
    Write-Host " FAILED ❌" -ForegroundColor Red
    Write-Host $_.Exception.Response.GetResponseStream()
    exit
}

# 3. Get Profile (Protected)
Write-Host "3️⃣  Fetching Protected Profile..." -NoNewline
try {
    $res = Invoke-WebRequest -Uri "$baseUrl/me" -Headers @{Authorization="Bearer $accessToken"} -UseBasicParsing
    $user = $res.Content | ConvertFrom-Json
    if ($user.username -eq $testUser) {
        Write-Host " OK (User: $($user.username)) ✅" -ForegroundColor Green
    } else {
        throw "Username mismatch"
    }
} catch {
    Write-Host " FAILED ❌" -ForegroundColor Red
    exit
}

# 4. Login
Write-Host "4️⃣  Testing Login..." -NoNewline
$loginBody = @{
    usernameOrEmail = $testUser
    password = "Password123!"
} | ConvertTo-Json

try {
    $res = Invoke-WebRequest -Uri "$baseUrl/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    Write-Host " OK ✅" -ForegroundColor Green
} catch {
    Write-Host " FAILED ❌" -ForegroundColor Red
    exit
}

# 5. Refresh Token
Write-Host "5️⃣  Refreshing Access Token..." -NoNewline
$refreshBody = @{ refreshToken = $refreshToken } | ConvertTo-Json
try {
    $res = Invoke-WebRequest -Uri "$baseUrl/refresh" -Method POST -Body $refreshBody -ContentType "application/json" -UseBasicParsing
    Write-Host " OK ✅" -ForegroundColor Green
} catch {
    Write-Host " FAILED ❌" -ForegroundColor Red
    exit
}

# 6. Logout
Write-Host "6️⃣  Logging Out..." -NoNewline
$logoutBody = @{ refreshToken = $refreshToken } | ConvertTo-Json
try {
    Invoke-WebRequest -Uri "$baseUrl/logout" -Method POST -Headers @{Authorization="Bearer $accessToken"} -Body $logoutBody -ContentType "application/json" -UseBasicParsing
    Write-Host " OK ✅" -ForegroundColor Green
} catch {
    Write-Host " FAILED ❌" -ForegroundColor Red
    exit
}

Write-Host "`n🎉 ALL TESTS PASSED! System is fully operational." -ForegroundColor Cyan
