@echo off

echo Choose an image pack:
echo 1. Vanilla
echo 2. BEEESSS
echo 3. BEEESSS + Hikari Female
echo 4. BEEESSS + Hikari Male
echo 5. BEEESSS + Paril + Hairstyle Extended
echo 6. BEEESSS + WAX
echo 7. BEEESSS + Okbd
echo 8. BEEESSS + Hikari Female + WIP Reworked Animations

set /p choice=Enter the number of your choice:

set "destinationFolder=img"

if not exist "%destinationFolder%" (
    mkdir "%destinationFolder%"
)

if "%choice%"=="1" (
    echo You chose Vanilla.
	xcopy /E /Y vanillaimg\* "%destinationFolder%\"
) else if "%choice%"=="2" (
    echo You chose BEEESSS.
	xcopy /E /Y beeesssimg\* "%destinationFolder%\"
) else if "%choice%"=="3" (
    echo You chose BEEESSS + Hikari Female.
	xcopy /E /Y beeessshikarifemaleimg\* "%destinationFolder%\"
) else if "%choice%"=="4" (
    echo You chose BEEESSS + Hikari Male.
	xcopy /E /Y beeessshikarimaleimg\* "%destinationFolder%\"
) else if "%choice%"=="5" (
    echo You chose BEEESSS + Paril + Hairstyle Extended.
	xcopy /E /Y beeesssparilhairstyleextendedimg\* "%destinationFolder%\"
) else if "%choice%"=="6" (
    echo You chose BEEESSS + WAX.
	xcopy /E /Y beeessswaximg\* "%destinationFolder%\"
) else if "%choice%"=="7" (
    echo You chose BEEESSS + Okbd.
	xcopy /E /Y beeesssokbdimg\* "%destinationFolder%\"
) else if "%choice%"=="8" (
    echo You chose BEEESSS + Hikari Female + WIP Reworked Animations.
	xcopy /E /Y beeessshfreworkedanimationsimg\* "%destinationFolder%\"
) else (
    echo Invalid choice. Please enter a number from the list.
    exit /b 1
)

echo Contents of "%sourceFolder%" have been successfully copied to "%destinationFolder%".
exit /b 0
