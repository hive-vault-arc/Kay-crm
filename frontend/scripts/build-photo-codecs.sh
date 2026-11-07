#!/bin/bash
# Mount reviewed sources and this script read-only; expose only /output for writes.
# Source libraries are unmodified. Only exported methods/build settings differ.
set -euo pipefail
mkdir -p /build/output
cd /build
cp /sources/*.tar.gz .
echo 'f7483e818503ea6224c8863e4a56ac02c7089021a98472c811c12aa19faf2475  libheif-1.23.7.tar.gz' | sha256sum --check
echo '554228bd17788c99a7e63b37ab5634722190e6e2bf60c1dcb01cef328e133905  libde265-1.1.3.tar.gz' | sha256sum --check
echo 'e4ab7009bf0629fd11982d4c2aa83964cf244cffba7347ecd39019a9e38c4564  libwebp-1.6.0.tar.gz' | sha256sum --check
tar xf libheif-1.23.7.tar.gz
tar xf libde265-1.1.3.tar.gz
tar xf libwebp-1.6.0.tar.gz

emcmake cmake -S libde265-1.1.3 -B de265-build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DENABLE_SIMD=OFF -DENABLE_SDL=OFF -DENABLE_DECODER=OFF -DCMAKE_INSTALL_PREFIX=/build/de265-install
cmake --build de265-build -j4
cmake --install de265-build
emcmake cmake -S libheif-1.23.7 -B heif-build -DCMAKE_BUILD_TYPE=Release -DENABLE_MULTITHREADING_SUPPORT=OFF -DWITH_GDK_PIXBUF=OFF -DWITH_EXAMPLES=OFF -DBUILD_SHARED_LIBS=OFF -DENABLE_PLUGIN_LOADING=OFF -DBUILD_TESTING=OFF -DWITH_LIBDE265=ON -DLIBDE265_INCLUDE_DIR=/build/de265-install/include -DLIBDE265_LIBRARY=/build/de265-install/lib/libde265.a -DCMAKE_EXE_LINKER_FLAGS=-lembind
cmake --build heif-build -j4
LIBHEIFA=heif-build/libheif/libheif.a
EXPORTED_FUNCTIONS=$($EMSDK/upstream/bin/llvm-nm "$LIBHEIFA" --format=just-symbols | grep '^heif_\|^de265_' | grep '[^:]$' | sed 's/^/_/' | paste -sd ',' -)
emcc -Wl,--whole-archive "$LIBHEIFA" -Wl,--no-whole-archive -Lde265-install/lib -lde265 -lembind -o output/libheif.js --post-js libheif-1.23.7/post.js -sWASM=0 -sDYNAMIC_EXECUTION=0 -sEXPORT_ES6 -sEXPORTED_FUNCTIONS="$EXPORTED_FUNCTIONS,_de265_get_version,_free,_malloc,_memcpy" -sEXPORTED_RUNTIME_METHODS=UTF8ToString -sMODULARIZE -sEXPORT_NAME=libheif -sWASM_ASYNC_COMPILATION=0 -sALLOW_MEMORY_GROWTH -sMAXIMUM_MEMORY=536870912 -std=c++17 -O3

emcmake cmake -S libwebp-1.6.0 -B webp-build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DWEBP_BUILD_ANIM_UTILS=OFF -DWEBP_BUILD_CWEBP=OFF -DWEBP_BUILD_DWEBP=OFF -DWEBP_BUILD_GIF2WEBP=OFF -DWEBP_BUILD_IMG2WEBP=OFF -DWEBP_BUILD_VWEBP=OFF -DWEBP_BUILD_WEBPINFO=OFF -DWEBP_BUILD_WEBPMUX=OFF -DWEBP_BUILD_EXTRAS=OFF -DWEBP_USE_THREAD=OFF -DWEBP_ENABLE_SIMD=OFF
cmake --build webp-build --target webp -j2
printf '%s\n' 'Module.kayHeap = () => HEAPU8;' > webp-post.js
emcc webp-build/libwebp.a webp-build/libsharpyuv.a -o output/webp.js --post-js webp-post.js -sEXPORTED_FUNCTIONS=_WebPEncodeRGBA,_WebPFree,_WebPGetEncoderVersion,_malloc,_free -sEXPORTED_RUNTIME_METHODS=getValue -sMODULARIZE -sEXPORT_NAME=webp -sEXPORT_ES6 -sDYNAMIC_EXECUTION=0 -sALLOW_MEMORY_GROWTH -sMAXIMUM_MEMORY=268435456 -O3

destination=/output
mkdir -p "$destination"
cp output/libheif.js "$destination/libheif-1.23.7-de265-1.1.3.js"
cp output/webp.js "$destination/libwebp-1.6.0.js"
cp output/webp.wasm "$destination/libwebp-1.6.0.wasm"
sha256sum "$destination"/*
