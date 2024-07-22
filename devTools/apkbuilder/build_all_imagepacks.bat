setlocal enabledelayedexpansion

set /p version=Enter the version number:

set target[0]=vanilla
set target[1]=beeesss
set target[2]=beeessshikarifemale
set target[3]=beeessshikarimale
set target[4]=beeesssparilhairstyleextended
set target[5]=beeessswax
set target[6]=beeesssokbd
set target[7]=lllysmasc
set target[8]=susato
set target[9]=mizz
set target[10]=mvcr

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

set array_length=10

cd ../../

for /L %%i in (0,1,%array_length%) do (
	powershell -Command "(Get-Content -Path '.\version') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\version'"

	powershell -Command "(Get-Content -Path '.\devTools\androidsdk\image\cordova\config.xml') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\devTools\androidsdk\image\cordova\config.xml'"

	powershell -Command "(Get-Content -Path '.\devTools\apkbuilder\config.xml') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\devTools\apkbuilder\config.xml'"

	powershell -Command "(Get-Content -Path '.\devTools\apkbuilder\config.xml') -replace 'dolp_version', 'dolp_!imagepack[%%i]!' | Set-Content -Path '.\devTools\apkbuilder\config.xml'"

	powershell -Command "(Get-Content -Path '.\devTools\apkbuilder\config.xml') -replace 'DoLP short version', 'DoLP !imagepack[%%i]!' | Set-Content -Path '.\devTools\apkbuilder\config.xml'"

	powershell -Command "(Get-Content -Path '.\devTools\apkbuilder\platforms\android\app\src\main\AndroidManifest.xml') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\devTools\apkbuilder\platforms\android\app\src\main\AndroidManifest.xml'"

	powershell -Command "(Get-Content -Path '.\devTools\apkbuilder\platforms\android\app\src\main\assets\www\index.html') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\devTools\apkbuilder\platforms\android\app\src\main\assets\www\index.html'"

	powershell -Command "(Get-Content -Path '.\devTools\apkbuilder\platforms\android\app\src\main\res\xml\config.xml') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\devTools\apkbuilder\platforms\android\app\src\main\res\xml\config.xml'"

	powershell -Command "(Get-Content -Path '.\game\01-config\sugarcubeConfig.js') -replace 'DoLP version', 'DoLP v0.%version% !imagepack[%%i]!' | Set-Content -Path '.\game\01-config\sugarcubeConfig.js'"

	ren img img1

	ren "!target[%%i]!img" img

	call compile.bat

	cd ./devTools/apkbuilder/

	call build_app_debug.bat

	cd ../../

	git reset --hard

	del "Degrees of Lewdity.html"

	rmdir /S /Q "./img1"
)

endlocal
