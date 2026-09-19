FROM apify/actor-node:24 AS builder

RUN npm ls @crawlee/core apify puppeteer playwright

COPY --chown=myuser:myuser package*.json ./

RUN npm install --include=dev --audit=false

COPY --chown=myuser:myuser . ./

RUN npm run build

FROM apify/actor-node:24

RUN npm ls @crawlee/core apify puppeteer playwright

COPY --chown=myuser:myuser package*.json ./

RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version \
    && rm -r ~/.npm

COPY --from=builder --chown=myuser:myuser /usr/src/app/dist ./dist

COPY --chown=myuser:myuser . ./

CMD ["node", "dist/main.js"]
