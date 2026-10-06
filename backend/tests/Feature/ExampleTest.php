<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_public_api_config_is_available_without_the_frontend(): void
    {
        $response = $this->getJson('/api/config');

        $response->assertOk()->assertJsonStructure(['google' => ['enabled']]);
    }
}
