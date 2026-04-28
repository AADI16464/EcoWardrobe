# EcoWardrobe – Full Stack Setup Script
# Run this from the project root: c:\Users\ASUS\Desktop\WebPage

Write-Host "🌿 EcoWardrobe Setup Script" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# ── Check for Node ──────────────────────────────────────────────────
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js not found. Please install it from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green

# ── Reinstall npm if broken ──────────────────────────────────────────
Write-Host "`n📦 Checking npm..." -ForegroundColor Yellow
$npmOk = $false
try {
    $npmVer = & npm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ npm $npmVer found" -ForegroundColor Green
        $npmOk = $true
    }
} catch {}

if (-not $npmOk) {
    Write-Host "⚠️  npm is broken. Attempting repair via corepack/bundled npm..." -ForegroundColor Yellow
    # Try to use the bundled npm from Node
    $nodePath = Split-Path (Get-Command node).Source
    $bundledNpm = Join-Path $nodePath "node_modules\npm\bin\npm-cli.js"
    if (Test-Path $bundledNpm) {
        Write-Host "Found bundled npm. Reinstalling npm globally..." -ForegroundColor Cyan
        node $bundledNpm install -g npm@latest
    } else {
        Write-Host "❌ Cannot auto-repair npm. Please reinstall Node.js from https://nodejs.org/en/download" -ForegroundColor Red
        Write-Host "   Or run: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
        exit 1
    }
}

# ── Backend ──────────────────────────────────────────────────────────
Write-Host "`n🔧 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend install failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Set-Location ..

# ── Frontend ─────────────────────────────────────────────────────────
Write-Host "`n⚛️  Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend install failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Set-Location ..

Write-Host "`n🎉 Setup complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the app:" -ForegroundColor Cyan
Write-Host "  Terminal 1 (Backend):  cd backend && npm run dev" -ForegroundColor White
Write-Host "  Terminal 2 (Frontend): cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Make sure MongoDB is running locally (mongod)" -ForegroundColor Yellow
Write-Host "   Or update backend/.env with your MongoDB Atlas URI" -ForegroundColor Yellow
