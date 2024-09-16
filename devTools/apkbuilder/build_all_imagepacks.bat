setlocal enabledelayedexpansion

set /p version=Enter the version number:

set target[0]=vanilla
set target[1]=b3s
set target[2]=b3s_hikfem
set target[3]=b3s_hikmale
set target[4]=b3s_paril
set target[5]=b3s_wax
set target[6]=b3s_okbd
set target[7]=b3s_lllysmasc
set target[8]=susato
set target[9]=b3s_mizz
set target[10]=b3s_mvcr
set target[11]=kitmint
set target[12]=b3s_mys
set target[13]=b3s_hikfem_mys

set imagepack[0]=vanilla
set imagepack[1]=beeesss
set imagepack[2]=hikfem
set imagepack[3]=hikmale
set imagepack[4]=paril
set imagepack[5]=wax
set imagepack[6]=okbd
set imagepack[7]=lllysmasc
set imagepack[8]=susato
set imagepack[9]=mizz
set imagepack[10]=mvcr
set imagepack[11]=kitmint
set imagepack[12]=b3s_mys
set imagepack[13]=hikfem_mys

set array_length=13

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

	call ".\devTools\apkbuilder\imagepack_builds\!target[%%i]!.bat"

	if %%i==11 (
		move .\img\style.css ..\
	)

	call compile.bat

	call .\devTools\apkbuilder\build_app_debug.bat

	call .\devTools\apkbuilder\imagepack_builds\reset.bat

	git reset --hard

	del "Degrees of Lewdity.html"

	cd .\dist\

	ren "DoLP-v0.%version%-!imagepack[%%i]!-0.5.2.8 DoLP v0.%version% !imagepack[%%i]!-debug.apk" "0.5.2.8 DoLP v0.%version% !imagepack[%%i]!-debug.apk"

	cd ..\
)

endlocal
