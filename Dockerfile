FROM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
COPY backend/resources/ ./backend/resources/
ARG PUBLIC_URL=https://yachay-kichwa.devs-ueb.tech
RUN cd frontend && VITE_API_URL="$PUBLIC_URL" npm run typecheck && VITE_API_URL="$PUBLIC_URL" npm run build

FROM php:8.4-apache-bookworm AS php-base
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev libicu-dev libzip-dev libpng-dev libjpeg62-turbo-dev libwebp-dev libonig-dev unzip \
    && docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) pdo_pgsql pgsql intl zip gd mbstring bcmath opcache \
    && a2enmod rewrite headers remoteip \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www/backend

FROM php-base AS backend
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist --no-interaction --no-progress
COPY backend/ ./
RUN mkdir -p storage/app/public storage/app/private storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && composer dump-autoload --no-dev --classmap-authoritative --no-interaction \
    && composer check-platform-reqs --no-dev

FROM php-base AS production
COPY --from=backend --chown=www-data:www-data /var/www/backend /var/www/backend
COPY --from=frontend /build/frontend/dist/ /var/www/backend/public/
COPY deployment/apache.conf /etc/apache2/sites-available/000-default.conf
COPY deployment/public.htaccess /var/www/backend/public/.htaccess
COPY deployment/php-production.ini /usr/local/etc/php/conf.d/zz-yachay.ini
COPY deployment/entrypoint.sh /usr/local/bin/yachay-entrypoint
RUN chmod +x /usr/local/bin/yachay-entrypoint
EXPOSE 80
ENTRYPOINT ["yachay-entrypoint"]
CMD ["apache2-foreground"]
