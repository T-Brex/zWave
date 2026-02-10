# Immagine base Directus
FROM directus/directus:latest

# Copia le estensioni dalla repo nel container
COPY extensions/ /directus/extensions/
