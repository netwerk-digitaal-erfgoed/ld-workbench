FROM node:lts-alpine AS build

RUN npm install -g @netwerk-digitaal-erfgoed/ld-workbench@latest \
    && npm cache clean --force

COPY docker/entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
USER node
