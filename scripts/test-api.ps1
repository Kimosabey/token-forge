# TokenForge API - Complete Test Suite

Write-Host "`n🚀 TokenForge API Test Suite`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri http://localhost:3000/api/auth/health -UseBasicParsing
    $healthData = $health.Content | ConvertFrom-Json
    Write-Host "✅ Health Check: $($healthData.status)" -ForegroundColor Green
}
catch {
    Write-Host "❌ Health Check Failed" -ForegroundColor Red
    exit 1
}

# Test 2: Register User
Write-Host "`nTest 2: Register User" -ForegroundColor Yellow
$registerBody = @{
    email     = "test@tokenforge.com"
    username  = "testuser"
    password  = "TestPass123!"
    firstName = "Test"
    lastName  = "User"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-WebRequest -Uri http://localhost:3000/api/auth/register -Method POST -Body $registerBody -ContentType "application/json" -UseBasicParsing
    $registerData = $registerResponse.Content | ConvertFrom-Json
    Write-Host "✅ User Registered: $($registerData.message)" -ForegroundColor Green
    Write-Host "   Access Token: $($registerData.accessToken.Substring(0,30))..." -ForegroundColor Gray
    $global:accessToken = $registerData.accessToken
    $global:refreshToken = $registerData.refreshToken
}
catch {
    Write-Host "❌ Registration Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Login
Write-Host "`nTest 3: Login" -ForegroundColor Yellow
$loginBody = @{
    usernameOrEmail = "testuser"
    password        = "TestPass123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri http://localhost:3000/api/auth/login -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    $loginData = $loginResponse.Content | ConvertFrom-Json
    Write-Host "✅ Login Successful" -ForegroundColor Green
    $global:accessToken = $loginData.accessToken
    $global:refreshToken = $loginData.refreshToken
}
catch {
    Write-Host "❌ Login Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Get Profile
Write-Host "`nTest 4: Get Profile" -ForegroundColor Yellow
try {
    $headers = @{Authorization = "Bearer $global:accessToken" }
    $profileResponse = Invoke-WebRequest -Uri http://localhost:3000/api/auth/me -Headers $headers -UseBasicParsing
    $profileData = $profileResponse.Content | ConvertFrom-Json
    Write-Host "✅ Profile Retrieved" -ForegroundColor Green
    Write-Host "   ID: $($profileData.id)" -ForegroundColor Gray
    Write-Host "   Username: $($profileData.username)" -ForegroundColor Gray
    Write-Host "   Email: $($profileData.email)" -ForegroundColor Gray
    Write-Host "   Roles: $($profileData.roles -join ', ')" -ForegroundColor Gray
}
catch {
    Write-Host "❌ Get Profile Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Refresh Token
Write-Host "`nTest 5: Refresh Token" -ForegroundColor Yellow
$refreshBody = @{
    refreshToken = $global:refreshToken
} | ConvertTo-Json

try {
    $refreshResponse = Invoke-WebRequest -Uri http://localhost:3000/api/auth/refresh -Method POST -Body $refreshBody -ContentType "application/json" -UseBasicParsing
    $refreshData = $refreshResponse.Content | ConvertFrom-Json
    Write-Host "✅ Token Refreshed" -ForegroundColor Green
    $global:newAccessToken = $refreshData.accessToken
}
catch {
    Write-Host "❌ Token Refresh Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Logout
Write-Host "`nTest 6: Logout" -ForegroundColor Yellow
$logoutBody = @{
    refreshToken = $global:refreshToken
} | ConvertTo-Json

try {
    $headers = @{Authorization = "Bearer $global:accessToken" }
    $logoutResponse = Invoke-WebRequest -Uri http://localhost:3000/api/auth/logout -Method POST -Headers $headers -Body $logoutBody -ContentType "application/json" -UseBasicParsing
    $logoutData = $logoutResponse.Content | ConvertFrom-Json
    Write-Host "✅ Logout: $($logoutData.message)" -ForegroundColor Green
}
catch {
    Write-Host "❌ Logout Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Test Suite Complete!`n" -ForegroundColor Cyan
Write-Host "✅ All 6 tests executed" -ForegroundColor Green
Write-Host "`n📊 Next: Check DBeaver to see the data in database tables" -ForegroundColor Yellow
