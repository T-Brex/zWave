# Stage 1: build delle estensioni (servono dist/ per i moduli)
FROM node:20-alpine AS extensions-builder

WORKDIR /build

# Copia solo le estensioni (il contesto esclude node_modules e dist via .dockerignore)
COPY extensions ./extensions

# Build di ogni estensione sotto extensions/.registry/
RUN set -e; \
  for dir in extensions/.registry/*/; do \
    if [ -f "${dir}package.json" ]; then \
      echo "Building extension: $dir"; \
      (cd "$dir" && npm install && npm run build && rm -rf node_modules); \ \
    fi; \
  done

# Stage 2: immagine Directus con estensioni già compilate
FROM directus/directus:latest

# Copia le estensioni (con dist/) dallo stage di build
COPY --from=extensions-builder /build/extensions /directus/extensions
