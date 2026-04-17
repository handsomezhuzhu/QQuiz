param(
    [string]$FrontendBase = "http://127.0.0.1:3000",
    [string]$AdminUsername = "admin",
    [string]$AdminPassword = "AdminTest2026!",
    [string]$ProviderBaseUrl = "https://api.openai.com/v1",
    [string]$ProviderApiKey = "sk-your-openai-api-key",
    [string]$ProviderModel = "gpt-5.4",
    [string]$SamplePath = "E:\QQuiz\test_data\sample_questions.txt"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Invoke-WebRequest -UseBasicParsing `
    -Uri "$FrontendBase/api/auth/login" `
    -Method POST `
    -WebSession $session `
    -ContentType "application/json" `
    -Body (@{
        username = $AdminUsername
        password = $AdminPassword
    } | ConvertTo-Json) | Out-Null

Invoke-WebRequest -UseBasicParsing `
    -Uri "$FrontendBase/api/proxy/admin/config" `
    -Method PUT `
    -WebSession $session `
    -ContentType "application/json" `
    -Body (@{
        ai_provider = "openai"
        openai_base_url = $ProviderBaseUrl
        openai_api_key = $ProviderApiKey
        openai_model = $ProviderModel
    } | ConvertTo-Json) | Out-Null

$testUsername = "e2e_user"
$testPassword = "E2ETest2026!"
$resetPassword = "E2EPassword2026!"

try {
    Invoke-WebRequest -UseBasicParsing `
        -Uri "$FrontendBase/api/proxy/admin/users" `
        -Method POST `
        -WebSession $session `
        -ContentType "application/json" `
        -Body (@{
            username = $testUsername
            password = $testPassword
            is_admin = $false
        } | ConvertTo-Json) | Out-Null
} catch {
    if (-not $_.Exception.Response -or $_.Exception.Response.StatusCode.value__ -ne 400) {
        throw
    }
}

$usersPayload = (
    Invoke-WebRequest -UseBasicParsing `
        -Uri "$FrontendBase/api/proxy/admin/users?skip=0&limit=100" `
        -WebSession $session
).Content | ConvertFrom-Json

$testUser = $usersPayload.users | Where-Object { $_.username -eq $testUsername } | Select-Object -First 1
if (-not $testUser) {
    throw "Failed to find $testUsername."
}

Invoke-WebRequest -UseBasicParsing `
    -Uri "$FrontendBase/api/proxy/admin/users/$($testUser.id)" `
    -Method PUT `
    -WebSession $session `
    -ContentType "application/json" `
    -Body (@{
        username = $testUsername
        is_admin = $false
    } | ConvertTo-Json) | Out-Null

Invoke-WebRequest -UseBasicParsing `
    -Uri "$FrontendBase/api/proxy/admin/users/$($testUser.id)/reset-password" `
    -Method POST `
    -WebSession $session `
    -ContentType "application/json" `
    -Body (@{
        new_password = $resetPassword
    } | ConvertTo-Json) | Out-Null

$client = [System.Net.Http.HttpClient]::new()
$tokenCookie = $session.Cookies.GetCookies($FrontendBase) | Where-Object { $_.Name -eq "access_token" } | Select-Object -First 1
if (-not $tokenCookie) {
    throw "Login cookie not found."
}
$client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $tokenCookie.Value)
$apiHeaders = @{
    Authorization = "Bearer $($tokenCookie.Value)"
}

$multipart = [System.Net.Http.MultipartFormDataContent]::new()
$multipart.Add([System.Net.Http.StringContent]::new("E2E Full Flow Exam"), "title")
$multipart.Add([System.Net.Http.StringContent]::new("false"), "is_random")
$bytes = [System.IO.File]::ReadAllBytes($SamplePath)
$fileContent = [System.Net.Http.ByteArrayContent]::new($bytes)
$fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("text/plain")
$multipart.Add($fileContent, "file", [System.IO.Path]::GetFileName($SamplePath))

$createResponse = $client.PostAsync("http://127.0.0.1:8000/api/exams/create", $multipart).Result
$createBody = $createResponse.Content.ReadAsStringAsync().Result
if ($createResponse.StatusCode.value__ -ne 201) {
    throw "Exam create failed: $createBody"
}

$createPayload = $createBody | ConvertFrom-Json
$examId = $createPayload.exam_id

$deadline = (Get-Date).AddMinutes(4)
$exam = $null
while ((Get-Date) -lt $deadline) {
    $exam = (
        Invoke-WebRequest -UseBasicParsing `
            -Uri "http://127.0.0.1:8000/api/exams/$examId" `
            -Headers $apiHeaders
    ).Content | ConvertFrom-Json

    if ($exam.status -eq "ready" -or $exam.status -eq "failed") {
        break
    }

    Start-Sleep -Seconds 5
}

if (-not $exam) {
    throw "Exam polling returned no data."
}

if ($exam.status -ne "ready") {
    throw "Exam parsing failed or timed out. Final status: $($exam.status)"
}

$questionsPayload = (
    Invoke-WebRequest -UseBasicParsing `
        -Uri "http://127.0.0.1:8000/api/questions/?exam_id=$examId&skip=0&limit=10" `
        -Headers $apiHeaders
).Content | ConvertFrom-Json

if ($questionsPayload.total -lt 1) {
    throw "Question list returned no questions."
}

$currentQuestion = (
    Invoke-WebRequest -UseBasicParsing `
        -Uri "http://127.0.0.1:8000/api/questions/exam/$examId/current" `
        -Headers $apiHeaders
).Content | ConvertFrom-Json

$checkPayload = (
    Invoke-WebRequest -UseBasicParsing `
        -Uri "http://127.0.0.1:8000/api/questions/check" `
        -Method POST `
        -Headers $apiHeaders `
        -ContentType "application/json" `
        -Body (@{
            question_id = $currentQuestion.id
            user_answer = "Z"
        } | ConvertTo-Json)
).Content | ConvertFrom-Json

if ($checkPayload.correct -eq $true) {
    throw "Expected the forced wrong answer to be incorrect."
}

$mistakesPayload = (
    Invoke-WebRequest -UseBasicParsing `
        -Uri "http://127.0.0.1:8000/api/mistakes/?skip=0&limit=50" `
        -Headers $apiHeaders
).Content | ConvertFrom-Json

if ($mistakesPayload.total -lt 1) {
    throw "Mistake list did not record the wrong answer."
}

Invoke-WebRequest -UseBasicParsing `
    -Uri "http://127.0.0.1:8000/api/exams/$examId/progress" `
    -Method PUT `
    -Headers $apiHeaders `
    -ContentType "application/json" `
    -Body '{"current_index":1}' | Out-Null

$summaryPayload = (
    Invoke-WebRequest -UseBasicParsing `
        -Uri "http://127.0.0.1:8000/api/exams/summary" `
        -Headers $apiHeaders
).Content | ConvertFrom-Json

if ($summaryPayload.total_exams -lt 1) {
    throw "Exam summary endpoint returned invalid totals."
}

$testSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-WebRequest -UseBasicParsing `
    -Uri "$FrontendBase/api/auth/login" `
    -Method POST `
    -WebSession $testSession `
    -ContentType "application/json" `
    -Body (@{
        username = $testUsername
        password = $resetPassword
    } | ConvertTo-Json) | Out-Null

$me = (
    Invoke-WebRequest -UseBasicParsing `
        -Uri "$FrontendBase/api/auth/me" `
        -WebSession $testSession
).Content | ConvertFrom-Json

[pscustomobject]@{
    exam_id = $examId
    exam_status = $exam.status
    total_questions = $exam.total_questions
    users_total = $usersPayload.total
    mistakes_total = $mistakesPayload.total
    summary_total_exams = $summaryPayload.total_exams
    test_user = $me.username
    test_user_is_admin = $me.is_admin
} | ConvertTo-Json -Depth 4
