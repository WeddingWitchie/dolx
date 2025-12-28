setlocal enabledelayedexpansion

set /p version=Enter the version number:

set target[0]=vanilla
set target[1]=b3s_hikfem
set target[2]=b3s_mys
set target[3]=b3s_hikfem_mys
set target[4]=goosefem
set target[5]=goosefem_mys
set target[6]=goosemasc
set target[7]=mikili
set target[8]=au
set target[9]=au_mys
set target[10]=aumasc
set target[11]=rotting

set imagepack[0]=vanilla
set imagepack[1]=hikfem
set imagepack[2]=b3s_mys
set imagepack[3]=hikfem_mys
set imagepack[4]=goosefem
set imagepack[5]=goosefem_mys
set imagepack[6]=goosemasc
set imagepack[7]=mikili
set imagepack[8]=aokiutage
set imagepack[9]=aokiutage_mys
set imagepack[10]=aokiutagemasc
set imagepack[11]=rotting

set array_length=11

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

	call compile.bat

	cd .\devTools\apkbuilder\

	call .\build_app_debug.bat

	cd .\imagepack_builds\

	call .\reset.bat

	cd ..\..\..\

	git reset --hard

	del "Degrees of Lewdity.html"

	cd .\dist\

	ren "DoLP-v0.%version%-!imagepack[%%i]!-0.5.7.7 DoLP v0.%version% !imagepack[%%i]!-debug.apk" "DoLP v0.%version% !imagepack[%%i]! 0.5.7.7 .apk"

	cd ..\
)

endlocal
