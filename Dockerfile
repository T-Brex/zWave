FROM directus/directus:11.14.1

# Copia le estensioni dalla repo nel container (va fatto build locale e commit di dist/ se servono moduli compilati)
COPY extensions/ /directus/extensions/
