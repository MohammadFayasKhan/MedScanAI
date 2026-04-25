FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN if [ -f public/db/medscan.db.gz ]; then cp public/db/medscan.db.gz /tmp/db.gz && gunzip public/db/medscan.db.gz && mv /tmp/db.gz public/db/medscan.db.gz; fi
RUN npm run build
FROM nginx:1.27-alpine

# Set up permissions for Hugging Face Spaces (non-root user id 1000)
RUN chown -R 1000:1000 /usr/share/nginx/html && \
    chown -R 1000:1000 /var/cache/nginx && \
    chown -R 1000:1000 /var/log/nginx && \
    chown -R 1000:1000 /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R 1000:1000 /var/run/nginx.pid

# Copy built assets and configuration
COPY --from=builder --chown=1000:1000 /app/dist /usr/share/nginx/html
COPY --chown=1000:1000 nginx.conf /etc/nginx/conf.d/default.conf

# Expose Hugging Face Spaces port
EXPOSE 7860

# Switch to non-root user
USER 1000

CMD ["nginx", "-g", "daemon off;"]
