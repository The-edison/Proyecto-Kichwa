<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CompressJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        if ($response->headers->get('Content-Type') !== 'application/json' || $response->headers->has('Content-Encoding') || strlen($response->getContent()) <= 512 || $request->isMethod('HEAD')) {
            return $response;
        }
        $response->setVary('Accept-Encoding', false);
        $allowsGzip = false;
        foreach (explode(',', strtolower($request->header('Accept-Encoding', ''))) as $option) {
            [$encoding,$parameters] = array_pad(explode(';', trim($option), 2), 2, '');
            if ($encoding === 'gzip') {
                $allowsGzip = ! preg_match('/q=([0-9.]+)/', $parameters, $quality) || (float) $quality[1] > 0;
                break;
            }
        }
        if ($allowsGzip) {
            $response->setContent(gzencode($response->getContent(), 6));
            $response->headers->set('Content-Encoding', 'gzip');
            $response->headers->remove('Content-Length');
        }

        return $response;
    }
}
