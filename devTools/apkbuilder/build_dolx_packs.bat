
cd ../..
$VERSION=$(cat version)
echo "Building vanilla APK release $VERSION"
cp -Recurse -Force "./imagepacks/vanilla/*" -Destination "./img"
call ./compile.bat
cd devTools/apkbuilder
call ./setup_deps.bat
call ./build_app_debug.bat

cd ../..
$VERSION=$(cat version)
echo "Building mysterious APK release $VERSION"
cp -Recurse -Force "./imagepacks/vanilla/*" -Destination "./img"
cp -Recurse -Force "./imagepacks/mysterious/*" -Destination "./img"
call ./compile.bat
cd devTools/apkbuilder
call ./setup_deps.bat
call ./build_app_debug.bat

cd ../..
$VERSION=$(cat version)
echo "Restoring default imagepack"
rm -Recurse -Force "./img/sex"
mkdir -p "./img/sex"
cp -Recurse -Force "./imagepacks/vanilla/sex/*" -Destination "./img/sex"