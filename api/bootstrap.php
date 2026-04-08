<?php

declare(strict_types=1);

use Tradumust\Api\ApiApplication;
use Tradumust\Api\Config\EnvLoader;
use Tradumust\Api\Models\Database;
use Tradumust\Api\Models\HistoryRepository;
use Tradumust\Api\Services\CulturalNotesService;
use Tradumust\Api\Services\LanguageDetector;
use Tradumust\Api\Services\TextToSignService;
use Tradumust\Api\Services\TranslationService;
use Tradumust\Api\Support\HttpException;
use Tradumust\Api\Support\JsonResponse;

spl_autoload_register(static function (string $class): void {
    $prefix = 'Tradumust\\Api\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relativeClass = substr($class, strlen($prefix));
    $file = __DIR__ . '/src/' . str_replace('\\', '/', $relativeClass) . '.php';

    if (is_file($file)) {
        require $file;
    }
});

EnvLoader::load(__DIR__ . '/.env');
date_default_timezone_set($_ENV['APP_TIMEZONE'] ?? 'UTC');

set_error_handler(
    static function (int $severity, string $message, string $file, int $line): void {
        if (!(error_reporting() & $severity)) {
            return;
        }

        throw new ErrorException($message, 0, $severity, $file, $line);
    }
);

$config = [
    'app_env' => $_ENV['APP_ENV'] ?? 'production',
    'app_debug' => filter_var($_ENV['APP_DEBUG'] ?? 'false', FILTER_VALIDATE_BOOL),
    'app_url' => rtrim($_ENV['APP_URL'] ?? 'http://127.0.0.1:8000', '/'),
    'frontend_url' => rtrim($_ENV['FRONTEND_URL'] ?? 'http://localhost:1234', '/'),
    'database_path' => $_ENV['DB_DATABASE'] ?? 'storage/tradumust.sqlite',
    'translation_provider' => strtolower($_ENV['TRANSLATION_PROVIDER'] ?? 'fallback'),
    'libretranslate_url' => $_ENV['LIBRETRANSLATE_URL'] ?? '',
    'libretranslate_api_key' => $_ENV['LIBRETRANSLATE_API_KEY'] ?? '',
    'mymemory_url' => $_ENV['MYMEMORY_URL'] ?? 'https://api.mymemory.translated.net/get',
];

$notesService = new CulturalNotesService();
$historyRepository = new HistoryRepository(Database::connect($config));
$translationService = new TranslationService($config, $notesService, new LanguageDetector());
$textToSignService = new TextToSignService();

set_exception_handler(
    static function (Throwable $exception) use ($config): void {
        $status = $exception instanceof HttpException ? $exception->getStatusCode() : 500;
        $message = $exception instanceof HttpException || $config['app_debug']
            ? $exception->getMessage()
            : 'The API failed to process the request.';

        $payload = [
            'error' => $message,
        ];

        if ($exception instanceof HttpException && $exception->getErrors() !== []) {
            $payload['details'] = $exception->getErrors();
        }

        if ($config['app_debug']) {
            $payload['exception'] = get_class($exception);
            $payload['trace'] = $exception->getTraceAsString();
        }

        JsonResponse::send($payload, $status, $config['frontend_url']);
    }
);

return new ApiApplication(
    $config,
    $historyRepository,
    $translationService,
    $textToSignService,
    $notesService
);
