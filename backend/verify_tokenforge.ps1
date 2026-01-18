
$baseUrl = "http://localhost:3000/api"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testUser = "testuser_$timestamp"
$testEmail = "$testUser@example.com"
$testPassword = "SecurePassword123!"
$newPassword = "NewSecurePassword456!"

Write-Host "`n--- 🛡️ TokenForge ULTIMATE System Verification ---" -ForegroundColor Cyan

# Helper function to print status
function Print-Status ($step, $msg, $success) {
    if ($success) {
        Write-Host "[$step] $msg..." -NoNewline
        Write-Host " ✅ OK" -ForegroundColor Green
    } else {
        Write-Host "[$step] $msg..." -NoNewline
        Write-Host " ❌ FAILED" -ForegroundColor Red
    }
}

# 1. Health Check
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/auth/health" -Method Get
    Print-Status "01/12" "Checking Health" ($health.status -eq "ok")
} catch { 
    if ($_.Exception.Message -match "429") {
         Print-Status "01/12" "Checking Health (Rate Limited but Alive)" $true
    } else {
         Print-Status "01/12" "Checking Health (Error: $_)" $false 
    }
}

# 2. OIDC Discovery
try {
    $oidc = Invoke-RestMethod -Uri "$baseUrl/.well-known/openid-configuration" -Method Get
    Print-Status "02/12" "Checking OIDC Config" ($oidc.issuer -match "http://localhost:3000/api")
} catch { Print-Status "02/12" "Checking OIDC (Error: $_)" $false }

# 3. JWKS Keys
try {
    $jwks = Invoke-RestMethod -Uri "$baseUrl/.well-known/jwks.json" -Method Get
    Print-Status "03/12" "Checking JWKS Keys" ($jwks.keys.Count -gt 0)
} catch { Print-Status "03/12" "Checking JWKS (Error: $_)" $false }

# 4. Registration
$regAccessToken = ""
try {
    $regBody = @{ email = $testEmail; username = $testUser; password = $testPassword; firstName = "Test"; lastName = "User" } | ConvertTo-Json
    $regResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regBody -ContentType "application/json"
    $regAccessToken = $regResponse.accessToken
    Print-Status "04/12" "Registering User" ($regResponse.message -match "successfully")
} catch { Print-Status "04/12" "Registering User (Error: $_)" $false }

# 4b. Immediate Logout (to clear session for Login test)
try {
    if ($regAccessToken) {
        $logoutParams = @{ Authorization = "Bearer $regAccessToken" }
        # Note: Register response might not create a refresh token depending on implementation, 
        # but if it does, we should ideally use it. However, if session is IP/UserAgent based, even just invalidating might help.
        # But wait, we need refresh token for logout body.
        $rTok = $regResponse.refreshToken
        $lBody = @{ refreshToken = $rTok } | ConvertTo-Json
        $lRes = Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Headers $logoutParams -Method Post -Body $lBody -ContentType "application/json"
        Print-Status "04b/12" "Intermediate Logout" ($lRes.message -match "successfully")
    }
} catch { Print-Status "04b/12" "Intermediate Logout (Error: $_)" $false }

# 5. Login
$accessToken = ""
$refreshToken = ""
try {
    $loginBody = @{ usernameOrEmail = $testUser; password = $testPassword } | ConvertTo-Json
    $tokens = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $accessToken = $tokens.accessToken
    $refreshToken = $tokens.refreshToken
    Print-Status "05/12" "Logging In" ($accessToken.Length -gt 20)
} catch { Print-Status "05/12" "Logging In (Error: $_)" $false }

# Headers for authorized requests
$authHeader = @{ Authorization = "Bearer $accessToken" }

# 6. Get Profile
try {
    $profile = Invoke-RestMethod -Uri "$baseUrl/users/me" -Headers $authHeader -Method Get
    Print-Status "06/12" "Fetching Profile" ($profile.username -eq $testUser)
} catch { Print-Status "06/12" "Fetching Profile (Error: $_)" $false }

# 7. Update Profile
try {
    $updateBody = @{ firstName = "UpdatedName" } | ConvertTo-Json
    $updated = Invoke-RestMethod -Uri "$baseUrl/users/me" -Headers $authHeader -Method Patch -Body $updateBody -ContentType "application/json"
    Print-Status "07/12" "Updating Profile" ($updated.firstName -eq "UpdatedName")
} catch { Print-Status "07/12" "Updating Profile (Error: $_)" $false }

# 8. MFA Generation (Check only)
try {
    $mfaRes = Invoke-RestMethod -Uri "$baseUrl/mfa/setup" -Headers $authHeader -Method Post
    Print-Status "08/12" "Generating MFA Secret" ($mfaRes.secret -ne $null)
} catch { Print-Status "08/12" "Generating MFA (Error: $_)" $false }

# 9. Refresh Token
try {
    $refreshBody = @{ refreshToken = $refreshToken } | ConvertTo-Json
    $newTokens = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" -Method Post -Body $refreshBody -ContentType "application/json"
    if ($newTokens.accessToken) {
        $accessToken = $newTokens.accessToken
        Print-Status "09/12" "Refreshing Token" ($newTokens.accessToken.Length -gt 20)
    } else {
        Print-Status "09/12" "Refreshing Token (No Access Token in response)" $false
    }
} catch { Print-Status "09/12" "Refreshing Token (Error: $_)" $false }

# 10. Change Password
try {
    $pwdBody = @{ currentPassword = $testPassword; newPassword = $newPassword } | ConvertTo-Json
    $pwdParams = @{ Authorization = "Bearer $accessToken" }
    $pwdRes = Invoke-RestMethod -Uri "$baseUrl/users/me/password" -Headers $pwdParams -Method Post -Body $pwdBody -ContentType "application/json"
    Print-Status "10/12" "Changing Password" ($pwdRes.message -match "successfully")
} catch { Print-Status "10/12" "Changing Password (Error: $_)" $false }

# 10b. Re-Login (Since password changed)
try {
    $loginBody = @{ usernameOrEmail = $testUser; password = $newPassword } | ConvertTo-Json
    $tokens = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $accessToken = $tokens.accessToken
    $refreshToken = $tokens.refreshToken
    Print-Status "10b/12" "Re-Login with New Password" ($accessToken.Length -gt 20)
} catch { Print-Status "10b/12" "Re-Login (Error: $_)" $false }

# 11. Logout
try {
    $logoutBody = @{ refreshToken = $refreshToken } | ConvertTo-Json
    $logoutParams = @{ Authorization = "Bearer $accessToken" }
    $logoutRes = Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Headers $logoutParams -Method Post -Body $logoutBody -ContentType "application/json"
    Print-Status "11/12" "Logging Out" ($logoutRes.message -match "successfully")
} catch { Print-Status "11/12" "Logging Out (Error: $_)" $false }

# 12. Rate Limit Check (Final Stress Test)
Write-Host -NoNewline "[12/12] Testing Rate Limits..."
$triggered = $false
for ($i = 1; $i -le 15; $i++) {
    try { 
        # Use BasicParsing to avoid IE initialization error on some servers
        $res = Invoke-WebRequest -Uri "$baseUrl/auth/health" -Method Get -ErrorAction SilentlyContinue -UseBasicParsing
    }
    catch { 
        if ($_.Exception.Message -match "429") { 
            $triggered = $true; 
            break 
        } 
    }
}
if ($triggered) { Write-Host " ✅ OK (Throttled)" -ForegroundColor Green }
else { Write-Host " ❌ FAILED" -ForegroundColor Yellow }

Write-Host "`n--- ✅ Ultimate Verification Complete ---`n" -ForegroundColor Cyan
