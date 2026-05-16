@echo off
setlocal EnableDelayedExpansion

REM build.bat — Wrapper pour compiler / packager KyaSmppSimulator
REM
REM Usage:
REM   scripts\build.bat            -- build l'executable
REM   scripts\build.bat package    -- build + genere l'installer NSIS

set "MODE=%~1"
if "%MODE%"=="" set "MODE=build"

if /I not "%MODE%"=="build" if /I not "%MODE%"=="package" (
    echo Mode invalide: %MODE%. Utilise "build" ou "package".
    exit /b 1
)

REM ── Aller a la racine du projet ─────────────────────────────────────────
set "ROOT=%~dp0.."
pushd "%ROOT%" >nul

REM ── Localiser NSIS si on package ────────────────────────────────────────
if /I "%MODE%"=="package" (
    set "NSIS_DIR=C:\Program Files (x86)\NSIS"
    if not exist "!NSIS_DIR!\makensis.exe" set "NSIS_DIR=C:\Program Files\NSIS"
    if not exist "!NSIS_DIR!\makensis.exe" (
        echo NSIS introuvable. Installe-le avec: winget install NSIS.NSIS
        popd >nul
        exit /b 1
    )
    echo !PATH! | find /I "!NSIS_DIR!" >nul
    if errorlevel 1 set "PATH=!NSIS_DIR!;!PATH!"
)

REM ── Localiser wails3 ────────────────────────────────────────────────────
where wails3.exe >nul 2>&1
if errorlevel 1 (
    where wails3 >nul 2>&1
    if errorlevel 1 (
        echo wails3 introuvable dans le PATH.
        popd >nul
        exit /b 1
    )
)

REM ── Lancer ───────────────────────────────────────────────────────────────
echo.
echo ^> wails3 %MODE% (depuis %ROOT%^)
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
echo [OK] Termine

REM ── Afficher la taille du binaire / installer ──────────────────────────
if /I "%MODE%"=="build" (
    set "OUT=%ROOT%\bin\KyaSmppSimulator.exe"
) else (
    set "OUT=%ROOT%\bin\KyaSmppSimulator-amd64-installer.exe"
)

if exist "!OUT!" (
    for %%A in ("!OUT!") do (
        set /a SIZE_MB=%%~zA / 1048576
        echo   !OUT! ^(~!SIZE_MB! MB^)
    )
)

popd >nul
endlocal
