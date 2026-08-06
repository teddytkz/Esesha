@echo off
echo Building Esesha SSH Manager...
echo.

REM Backup connections.json if it exists
set "CONN_FILE=build\bin\connections.json"
set "BACKUP_FILE=connections.json.bak"
if exist "%CONN_FILE%" (
    echo Backing up connections.json...
    copy /Y "%CONN_FILE%" "%BACKUP_FILE%" >nul
)

REM Clean previous builds
if exist build\bin rmdir /s /q build\bin
echo Cleaned previous builds

REM Build for Windows AMD64
echo Building Windows binary...
wails build -platform windows/amd64 -ldflags "-s -w"

if %errorlevel% neq 0 (
    if exist "%BACKUP_FILE%" (
        echo Build failed. Backup kept at %BACKUP_FILE% for manual restore.
    )
    echo Build failed!
    exit /b %errorlevel%
)

REM Restore connections.json if backup exists
if exist "%BACKUP_FILE%" (
    echo Restoring connections.json...
    copy /Y "%BACKUP_FILE%" "%CONN_FILE%" >nul
    del "%BACKUP_FILE%"
)

echo.
echo Build complete!
echo Binary location: build\bin\esesha.exe
echo.

REM Show file size
if exist build\bin\esesha.exe (
    for %%A in (build\bin\esesha.exe) do (
        set size=%%~zA
        set /a sizeMB=%%~zA/1048576
    )
    echo File size: !sizeMB! MB
) else (
    echo Warning: Binary not found at expected location
)
