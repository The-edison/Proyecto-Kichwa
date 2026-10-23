<?php

namespace Tests\Feature;

use Tests\TestCase;

class PrivacyInformationTest extends TestCase
{
    public function test_privacy_information_is_public_and_uses_actual_cookie_settings_without_revealing_credentials(): void
    {
        config()->set('session.cookie', 'test-session');
        config()->set('session.lifetime', 45);
        config()->set('session.secure', true);
        config()->set('session.expire_on_close', false);
        config()->set('services.google.client_id', 'private-client-id');
        config()->set('services.google.client_secret', 'private-client-secret');
        config()->set('mail.mailers.smtp.password', 'private-mail-password');

        $this->getJson('/api/privacy')->assertOk()
            ->assertJsonPath('contact.email', 'kichwa.soporte@gmail.com')
            ->assertJsonPath('session.cookie', 'test-session')->assertJsonPath('session.lifetime_minutes', 45)
            ->assertJsonPath('session.secure', true)->assertJsonPath('session.expires_on_close', false)
            ->assertJsonPath('google_enabled', true)
            ->assertDontSee('private-client-id')->assertDontSee('private-client-secret')->assertDontSee('private-mail-password');
    }

    public function test_only_confirmed_responsible_information_is_returned_and_provider_flags_follow_configuration(): void
    {
        config()->set('kichwa.privacy.responsible_name', null);
        config()->set('kichwa.privacy.address', null);
        config()->set('kichwa.privacy.phone', null);
        config()->set('services.google.client_secret', null);
        config()->set('kichwa.check_breached_passwords', false);
        config()->set('mail.default', 'log');
        $this->getJson('/api/privacy')->assertOk()->assertJsonPath('contact.responsible_name', null)
            ->assertJsonPath('contact.address', null)->assertJsonPath('contact.phone', null)
            ->assertJsonPath('google_enabled', false)->assertJsonPath('password_breach_check', false)->assertJsonPath('gmail_smtp', false);

        config()->set('kichwa.privacy.responsible_name', 'Responsable de prueba');
        config()->set('kichwa.privacy.phone', '012345678');
        config()->set('mail.default', 'smtp');
        config()->set('mail.mailers.smtp.host', 'smtp.gmail.com');
        $this->getJson('/api/privacy')->assertOk()->assertJsonPath('contact.responsible_name', 'Responsable de prueba')
            ->assertJsonPath('contact.phone', '012345678')->assertJsonPath('gmail_smtp', true);
    }
}
