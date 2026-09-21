#!/bin/sh
set -eu
P="$PWD/artifacts/private/audio-asr-20260921"
python3 - "$P" <<'PY'
import pathlib,hashlib,sys,tarfile
p=pathlib.Path(sys.argv[1]);f=p/'cmake.tar.gz'
assert hashlib.sha256(f.read_bytes()).hexdigest()=='0c5d65251c14cc884bfa16bdbed3c263ce5bffe2e21c0d0d00962cb0610464fa'
with tarfile.open(f) as t:t.extractall(p/'cmake',filter='data')
PY
C="$P/cmake/cmake-4.4.3-macos-universal/CMake.app/Contents/bin/cmake"
"$C" --version
"$C" -S "$P/source/ggml-org-whisper.cpp-927cfce" -B "$P/build" -DCMAKE_BUILD_TYPE=Release -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF -DWHISPER_CURL=OFF -DWHISPER_SDL2=OFF -DWHISPER_COREML=OFF -DGGML_METAL=OFF -DBUILD_SHARED_LIBS=OFF
"$C" --build "$P/build" --target whisper-cli -j 2
