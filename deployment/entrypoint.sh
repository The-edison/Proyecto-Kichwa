#!/bin/sh
set -eu
cd /var/www/backend
if [ -z "${APP_KEY:-}" ]; then
    echo 'Falta APP_KEY: configura una clave estable en Dokploy.' >&2
    exit 1
fi
mkdir -p resources/views storage/app/public storage/app/private storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
php artisan config:clear --no-interaction
php artisan migrate --force --no-interaction
php artisan db:seed --class=IntermedioModuloDosEjerciciosSeeder --force --no-interaction
if [ ! -L public/storage ]; then
    php artisan storage:link --no-interaction
fi
php artisan config:cache --no-interaction
php artisan route:cache --no-interaction
php artisan view:cache --no-interaction
chown -R www-data:www-data storage/framework/cache bootstrap/cache
exec "$@"
