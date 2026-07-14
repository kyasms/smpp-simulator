@echo off
setlocal EnableDelayedExpansion

REM build.bat - Wrapper pour compiler / packager KyaSmppSimulator
REM
REM Usage:
REM   scripts\build.bat            -- build l'executable
REM   scripts\build.bat package    -- build + genere l'installer NSIS
REM   scripts\build.bat dev        -- lance en mode developpement
REM
REM Recommandation: Utiliser Task pour un controle plus fin
REM   task build        -- compile avec optimisations
REM   task package      -- build + package
REM   task dev          -- developpement

set "MODE=%~1"
if "%MODE%"=="" set "MODE=build"

if /I not "%MODE%"=="build" if /I not "%MODE%"=="package" if /I not "%MODE%"=="dev" (
    echo.
    echo Mode invalide: %MODE%
    echo Utilise: build, package, ou dev
    echo.
    echo Note: Il est recommande d'utiliser Task pour plus de flexibilite:
    echo   task --list    -- liste toutes les taches disponibles
    exit /b 1
)

REM Aller a la racine du projet
set "ROOT=%~dp0.."
pushd "%ROOT%" >nul

REM Verifier les prerequis
echo Verification des prerequis...

REM Verifier Go
where go.exe >nul 2>&1
if errorlevel 1 (
    echo [!] Go n'est pas installe ou introuvable dans le PATH.
    echo     Telecharge depuis: https://golang.org/dl
    popd >nul
    exit /b 1
)
for /f "tokens=3" %%i in ('go version') do set "GO_VERSION=%%i"
echo   [OK] Go %GO_VERSION%

REM Verifier wails3
where wails3.exe >nul 2>&1
if errorlevel 1 (
    where wails3 >nul 2>&1
    if errorlevel 1 (
        echo [!] wails3 introuvable dans le PATH.
        echo     Installe avec: go install github.com/wailsapp/wails/v3/cmd/wails3@latest
        popd >nul
        exit /b 1
    )
)
for /f "tokens=3" %%i in ('wails3 version') do set "WAILS_VERSION=%%i"
echo   [OK] Wails %WAILS_VERSION%

REM Verifier Node.js
where node.exe >nul 2>&1
if errorlevel 1 (
    echo [!] Node.js n'est pas installe ou introuvable dans le PATH.
    echo     Telecharge depuis: https://nodejs.org
    popd >nul
    exit /b 1
)
for /f "tokens=1" %%i in ('node --version') do set "NODE_VERSION=%%i"
echo   [OK] Node %NODE_VERSION%

REM Verifier NSIS si on package
if /I "%MODE%"=="package" (
    set "NSIS_DIR=C:\Program Files (x86)\NSIS"
    if not exist "!NSIS_DIR!\makensis.exe" set "NSIS_DIR=C:\Program Files\NSIS"
    if not exist "!NSIS_DIR!\makensis.exe" (
        echo [!] NSIS introuvable. Installe avec: winget install NSIS.NSIS
        popd >nul
        exit /b 1
    )
    echo   [OK] NSIS installe
    set "PATH=!NSIS_DIR!;!PATH!"
)

REM Lancer
echo.
echo ^> wails3 %MODE% ^(depuis %ROOT%^)
echo.

set "START=%TIME%"
call wails3.exe %MODE%
set "EXITCODE=%ERRORLEVEL%"
set "END=%TIME%"

if %EXITCODE% NEQ 0 (
    echo.
    echo [X] Echec ^(exit %EXITCODE%^)
    popd >nul
    exit /b %EXITCODE%
)

echo.
echo [OK] Compilation terminee

REM Afficher la taille du binaire / installer
if /I "%MODE%"=="build" (
    set "OUT=%ROOT%\bin\KyaSmppSimulator.exe"
) else if /I "%MODE%"=="package" (
    set "OUT=%ROOT%\bin\KyaSmppSimulator-amd64-installer.exe"
) else if /I "%MODE%"=="dev" (
    REM Pas de fichier de sortie en mode dev
    popd >nul
    endlocal
    exit /b 0
)

if exist "!OUT!" (
    for %%A in ("!OUT!") do (
        set /a SIZE_MB=%%~zA / 1048576
        if !SIZE_MB! LSS 1 (
            set /a SIZE_KB=%%~zA / 1024
            echo   !OUT! ^(~!SIZE_KB! KB^)
        ) else (
            echo   !OUT! ^(~!SIZE_MB! MB^)
        )
    )
) else (
    echo   [Warning] Fichier de sortie introuvable: !OUT!
)

popd >nul
endlocal
