setlocal enabledelayedexpansion

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

del ..\..\dist\*.apk

cd ..\..\

for /L %%i in (0,1,%array_length%) do (
	powershell -Command "(Get-Content -Path '.\version') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\version'"

	powershell -Command "(Get-Content -Path '.\devTools\apkbuilder\config.xml') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\devTools\apkbuilder\config.xml'"

	powershell -Command "(Get-Content -Path '.\devTools\apkbuilder\config.xml') -replace 'dolp_version', 'dolp_!imagepack[%%i]!' | Set-Content -Path '.\devTools\apkbuilder\config.xml'"

	powershell -Command "(Get-Content -Path '.\devTools\apkbuilder\config.xml') -replace 'DoLP short version', 'DoLP !imagepack[%%i]!' | Set-Content -Path '.\devTools\apkbuilder\config.xml'"

	@REM powershell -Command "(Get-Content -Path '.\devTools\apkbuilder\platforms\android\app\src\main\AndroidManifest.xml') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\devTools\apkbuilder\platforms\android\app\src\main\AndroidManifest.xml'"

	@REM powershell -Command "(Get-Content -Path '.\devTools\apkbuilder\platforms\android\app\src\main\assets\www\index.html') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\devTools\apkbuilder\platforms\android\app\src\main\assets\www\index.html'"

	@REM powershell -Command "(Get-Content -Path '.\devTools\apkbuilder\platforms\android\app\src\main\res\xml\config.xml') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\devTools\apkbuilder\platforms\android\app\src\main\res\xml\config.xml'"

	powershell -Command "(Get-Content -Path '.\game\01-config\sugarcubeConfig.js') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\game\01-config\sugarcubeConfig.js'"

	cd .\devTools\apkbuilder\imagepack_builds\

	call "!target[%%i]!.bat"

	cd ..\..\..\

	if %%i==6 (
		move .\img\style.css ..\
	)

	call compile.bat

	cd .\devTools\apkbuilder\

	call .\build_app_debug.bat

	cd .\imagepack_builds\

	call .\reset.bat

	cd ..\..\..\

	git reset --hard

	del "Degrees of Lewdity.html"

	cd .\dist\

	ren "DoLP-v0.%version%-!imagepack[%%i]!-0.5.6.8 DoLP v0.%version% !imagepack[%%i]!-debug.apk" "DoLP v0.%version% !imagepack[%%i]! 0.5.6.8 .apk"

	cd ..\
)

endlocal
