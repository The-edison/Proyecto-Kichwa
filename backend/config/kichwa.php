<?php

return [
    'admin_nombre' => env('KICHWA_ADMIN_NOMBRE', 'Administrador Yachay'),
    'admin_email' => env('KICHWA_ADMIN_EMAIL', 'admin@yachay.test'),
    'admin_password' => env('KICHWA_ADMIN_PASSWORD'),
    'check_dns' => env('KICHWA_CHECK_EMAIL_DNS', true),
    'check_breached_passwords' => env('KICHWA_CHECK_BREACHED_PASSWORDS', true),
];
