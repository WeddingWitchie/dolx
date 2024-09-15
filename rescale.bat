@echo off
setlocal enabledelayedexpansion

REM Paths to Aseprite
set ASEPRITE="F:\Kozatt\Descargas\Misc\Aseprite.v1.2.40\Aseprite.v1.2.40\Aseprite.exe"

:check_aseprite
%ASEPRITE% -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Aseprite is not installed.
    pause
    exit /b
)
goto :start_processing

:start_processing
if "%~1"=="" (
    echo Drag and drop a folder to start.
    pause
    exit /b
)

REM Input folder (same as batch file path)
set "input_folder=%~1"

REM Output folder
for %%f in ("%input_folder%") do set "folder_name=%%~nxf"
set "output_folder=%~dp0%folder_name%_scaled"
if not exist "!output_folder!" (
    mkdir "!output_folder!"
)

set /a folder_count=0
set /a file_count=0

for /r "%input_folder%" %%i in (*.png) do (
    echo Processing %%i

    set "relative_path=%%i:%input_folder%=%%"
    set "relative_path=!relative_path:~1!"

    set "file_dir=%%~dpi"
    set "file_dir=!file_dir:%input_folder%=!"

    REM Create the corresponding subfolder in the output folder if it doesn't exist
    if not exist "!output_folder!!file_dir!" (
        mkdir "!output_folder!!file_dir!"
        set /a folder_count+=1
    )

    REM Convert the image to RGB, then to indexed color mode, and resize
    %ASEPRITE% -b "%%i" --color-mode rgb --save-as "!output_folder!!file_dir!%%~nxi" >nul 2>&1
    %ASEPRITE% -b "!output_folder!!file_dir!%%~nxi" --color-mode indexed --scale 0.5 --save-as "!output_folder!!file_dir!%%~nxi" >nul 2>&1

    set /a file_count+=1
)

echo Conversion completed.
echo Processed %file_count% files in %folder_count% folders.
pause
