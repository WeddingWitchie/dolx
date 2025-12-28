@echo off
setlocal EnableDelayedExpansion

set /p version=Enter the version number:

set target[0]=vanilla
set target[1]=b3s_hikfem
set target[2]=kitmint
set target[3]=b3s_mys
set target[4]=b3s_hikfem_mys
set target[5]=goosefem
set target[6]=goosefem_mys
set target[7]=gooseandro
set target[8]=goosemasc
set target[9]=mikili
set target[10]=au
set target[11]=au_mys
set target[12]=aumasc

set imagepack[0]=vanilla
set imagepack[1]=hikfem
set imagepack[2]=kitmint
set imagepack[3]=b3s_mys
set imagepack[4]=hikfem_mys
set imagepack[5]=goosefem
set imagepack[6]=goosefem_mys
set imagepack[7]=gooseandro
set imagepack[8]=goosemasc
set imagepack[9]=mikili
set imagepack[10]=aokiutage
set imagepack[11]=aokiutage_mys
set imagepack[12]=aokiutagemasc

set array_length=12

rem Clean old zips
del /q ..\..\dist\*.zip 2>nul

cd /d ..\..\

for /L %%i in (0,1,%array_length%) do (
	echo.
	echo ===============================
	echo Building ZIP for !imagepack[%%i]!
	echo ===============================

	rem Update displayed version strings (keep only what matters for HTML output)
	powershell -NoProfile -Command "(Get-Content -Path '.\version') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\version'"
	powershell -NoProfile -Command "(Get-Content -Path '.\game\01-config\sugarcubeConfig.js') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\game\01-config\sugarcubeConfig.js'"

	rem Build the imagepack
	cd .\devTools\apkbuilder\imagepack_builds\
	call "!target[%%i]!.bat"
	cd ..\..\..\

	rem Preserve your special-case behavior (but restore so the ZIP includes style.css)
	if %%i==6 (
		if exist ".\img\style.css" (
			copy /y ".\img\style.css" ".\_style_backup.css" >nul
			del /q ".\img\style.css"
		)
	)

	rem Compile HTML
	call compile.bat

	rem Restore style.css (so it ends up inside the ZIP img\ folder)
	if exist ".\_style_backup.css" (
		move /y ".\_style_backup.css" ".\img\style.css" >nul
	)

	rem Stage files for zipping
	set "displayVersion=v0.%version% !imagepack[%%i]!"
	set "stage=dist\_zip_tmp_!imagepack[%%i]!"
	set "zipOut=Degrees of Lewdity !displayVersion!.zip"

	if exist "!stage!" rmdir /s /q "!stage!"
	mkdir "!stage!\img" >nul

	copy /y "Degrees of Lewdity VERSION.html" "!stage!\Degrees of Lewdity.html" >nul
	xcopy /e /i /y "img" "!stage!\img" >nul

	rem Create zip in dist\
	powershell -NoProfile -Command "Compress-Archive -Path '!stage!\*' -DestinationPath 'dist\!zipOut!' -Force"

	rem Cleanup staging
	rmdir /s /q "!stage!"

	rem Reset imagepack changes
	cd .\devTools\apkbuilder\imagepack_builds\
	call .\reset.bat
	cd ..\..\..\

	git reset --hard

	del /q "Degrees of Lewdity.html"
)

endlocal
