<?php

declare(strict_types=1);

namespace Tradumust\Api\Support;

final class JsonResponse
{
    /**
     * @param array<string, mixed> $payload
     */
    public static function send(array $payload, int $statusCode, string $frontendUrl): never
    {
        self::applyCors($frontendUrl);
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function empty(int $statusCode, string $frontendUrl): never
    {
        self::applyCors($frontendUrl);
        http_response_code($statusCode);
        exit;
    }

    private static function applyCors(string $frontendUrl): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? $frontendUrl;
        $allowedOrigin = $origin === $frontendUrl ? $origin : $frontendUrl;

        header('Access-Control-Allow-Origin: ' . $allowedOrigin);
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
        header('Vary: Origin');
    }
}
