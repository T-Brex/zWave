# Stage 1: build tutte le estensioni in .registry che hanno script "build"
FROM node:20-alpine AS extension-builder
WORKDIR /build
COPY extensions/ /build/extensions/

# find + exec gestisce correttamente i nomi cartelle con spazi (es. "Chiamate Outbound")
RUN find /build/extensions/.registry -maxdepth 1 -mindepth 1 -type d -exec sh -c '\
  dir="$1"; \
  if [ -f "$dir/package.json" ] && grep -q "\"build\"" "$dir/package.json" 2>/dev/null; then \
    echo "Building extension in $dir..." && (cd "$dir" && npm ci && npm run build); \
  fi \
' _ {} \;

# Stage 2: immagine Directus con estensioni già compilate
FROM directus/directus:latest
COPY --from=extension-builder /build/extensions/ /directus/extensions/
