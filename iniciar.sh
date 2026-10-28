#!/bin/sh
cd "$(dirname "$0")"
[ -d node_modules ] || npm install --omit=dev
[ -f config.json ] || cp config.exemplo.json config.json
node server.js
