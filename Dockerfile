# Stage 1: build estensioni che hanno "build" in package.json (es. modulo vincenzo)
FROM node:20-alpine AS extension-builder
WORKDIR /build
COPY extensions/ /build/extensions/

# Compila ogni estensione in .registry che ha script "build" (genera dist/)
RUN for dir in /build/extensions/.registry/*/; do \
  if [ -f "$$dir/package.json" ] && grep -q '"build"' "$$dir/package.json" 2>/dev/null; then \
    (cd "$$dir" && npm ci && npm run build); \
  fi; \
done

# Stage 2: immagine Directus con estensioni già compilate
FROM directus/directus:latest
COPY --from=extension-builder /build/extensions/ /directus/extensions/
