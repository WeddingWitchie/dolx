setlocal enabledelayedexpansion

set /p version=Enter the version number:

set target[0]=vanilla
set target[1]=b3s
set target[2]=b3s_hikfem
@REM set target[3]=b3s_hikmale
@REM set target[4]=b3s_paril
set target[3]=b3s_wax
@REM set target[6]=b3s_lllysmasc
set target[4]=susato
set target[5]=mizz
set target[6]=kitmint
set target[7]=b3s_mys
set target[8]=b3s_hikfem_mys
set target[9]=goosefem
set target[10]=goosefem_mys
set target[11]=gooseandro
set target[12]=mikili

set imagepack[0]=vanilla
set imagepack[1]=beeesss
set imagepack[2]=hikfem
@REM set imagepack[3]=hikmale
@REM set imagepack[4]=paril
set imagepack[3]=wax
@REM set imagepack[6]=lllysmasc
set imagepack[4]=susato
set imagepack[5]=mizzfem
set imagepack[6]=kitmint
set imagepack[7]=b3s_mys
set imagepack[8]=hikfem_mys
set imagepack[9]=goosefem
set imagepack[10]=goosefem_mys
set imagepack[11]=gooseandro
set imagepack[12]=mikili

set array_length=12

del ..\..\dist\*.apk

cd ..\..\

for /L %%i in (0,1,%array_length%) do (
	powershell -Command "(Get-Content -Path '.\version') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\version'"

	powershell -Command "(Get-Content -Path '.\devTools\androidsdk\image\cordova\config.xml') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\devTools\androidsdk\image\cordova\config.xml'"

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

	ren "DoLP-v0.%version%-!imagepack[%%i]!-0.5.4.5 DoLP v0.%version% !imagepack[%%i]!-debug.apk" "0.5.4.5 DoLP v0.%version% !imagepack[%%i]!-debug.apk"

	cd ..\
)

endlocal
