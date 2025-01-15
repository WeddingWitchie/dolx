setlocal enabledelayedexpansion

set /p version=Enter the version number:

set target[0]=vanilla
set target[1]=b3s
set target[2]=b3s_hikfem
@REM set target[3]=b3s_hikmale
@REM set target[4]=b3s_paril
@REM set target[5]=b3s_wax
@REM set target[6]=b3s_lllysmasc
@REM set target[7]=susato
set target[3]=mizz
@REM set target[9]=kitmint
set target[4]=b3s_mys
set target[5]=b3s_hikfem_mys
set target[6]=goosefem
set target[7]=goosefem_mys

set imagepack[0]=vanilla
set imagepack[1]=beeesss
set imagepack[2]=hikfem
@REM set imagepack[3]=hikmale
@REM set imagepack[4]=paril
@REM set imagepack[5]=wax
@REM set imagepack[6]=lllysmasc
@REM set imagepack[7]=susato
set imagepack[3]=mizzfem
@REM set imagepack[9]=kitmint
set imagepack[4]=b3s_mys
set imagepack[5]=hikfem_mys
set imagepack[6]=goosefem
set imagepack[7]=goosefem_mys

set array_length=7

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

	if %%i==9 (
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

	ren "DoLP-v0.%version%-!imagepack[%%i]!-0.5.3.6 DoLP v0.%version% !imagepack[%%i]!-debug.apk" "0.5.3.6 DoLP v0.%version% !imagepack[%%i]!-debug.apk"

	cd ..\
)

endlocal
