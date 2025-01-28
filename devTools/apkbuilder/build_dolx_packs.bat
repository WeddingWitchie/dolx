@echo off

cd ../..
del /s /q ".\dist"
del /q ".\Degrees of Lewdity.html"
mkdir "dist"

@REM set VERSION
setlocal enableextensions
for /f "delims=" %%a in (version) do (
    set version=%%a
)
echo "Building vanilla APK release %version%"
xcopy /s /e /i /q /y ".\imagepacks\vanilla\*" ".\img"
call ./compile.bat
cd devTools/apkbuilder
call ./setup_deps.bat
call ./build_app_debug.bat
cd ../..
cd dist 
rename "Degrees-of-Lewdity-X-Change-%version%-debug.apk" "DoLX-%version%-vanilla.apk"
cd ../devTools/apkbuilder

@echo off
cd ../..
echo "Building mysterious APK release %version%"
xcopy /s /e /i /q /y ".\imagepacks\vanilla\*" ".\img"
xcopy /s /e /i /q /y ".\imagepacks\mysterious\*" ".\img"
call ./compile.bat
cd devTools/apkbuilder
call ./setup_deps.bat
call ./build_app_debug.bat
cd ../..
cd dist 
rename "Degrees-of-Lewdity-X-Change-%version%-debug.apk" "DoLX-%version%-mysterious.apk"
cd ../devTools/apkbuilder

@echo off
cd ../..
echo "Restoring default imagepack"
del /s /q ".\img\sex"
mkdir ".\img\sex"
xcopy /s /e /i /q /y ".\imagepacks\vanilla\sex\*" ".\img\sex"