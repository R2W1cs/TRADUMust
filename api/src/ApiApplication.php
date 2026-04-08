<?php

declare(strict_types=1);

namespace Tradumust\Api;

use Tradumust\Api\Models\HistoryRepository;
use Tradumust\Api\Services\CulturalNotesService;
use Tradumust\Api\Services\TextToSignService;
use Tradumust\Api\Services\TranslationService;
use Tradumust\Api\Support\HttpException;
use Tradumust\Api\Support\JsonResponse;

final class ApiApplication
{
    /**
     * @param array<string, mixed> $config
     */
    public function __construct(
        private readonly array $config,
        private readonly HistoryRepository $historyRepository,
        private readonly TranslationService $translationService,
        private readonly TextToSignService $textToSignService,
        private readonly CulturalNotesService $notesService
    ) {
    }

    public function handle(string $method, string $requestUri): never
    {
        $path = parse_url($requestUri, PHP_URL_PATH) ?: '/';
        $method = strtoupper($method);

        if ($method === 'OPTIONS') {
            JsonResponse::empty(204, (string) $this->config['frontend_url']);
        }

        if ($method === 'GET' && $path === '/api/health') {
            JsonResponse::send([
                'status' => 'ok',
                'service' => 'TRADUMUST PHP API',
                'timestamp' => time(),
                'mode' => 'php/sqlite',
            ], 200, (string) $this->config['frontend_url']);
        }

        if ($method === 'POST' && $path === '/api/translate') {
            $payload = $this->readJsonBody();
            $translation = $this->translationService->translate(
                (string) ($payload['text'] ?? ''),
                (string) ($payload['source_lang'] ?? 'auto'),
                (string) ($payload['target_lang'] ?? 'fr')
            );

            $entry = $this->historyRepository->create([
                'entry_type' => 'translation',
                'source_text' => (string) ($payload['text'] ?? ''),
                'translated_text' => $translation['translated_text'],
                'source_lang' => $translation['source_lang_detected'],
                'target_lang' => (string) ($payload['target_lang'] ?? 'fr'),
                'cultural_note' => $translation['cultural_note'],
                'formality_level' => $translation['formality_level'],
                'regional_variant' => $translation['regional_variant'],
            ]);

            JsonResponse::send([
                ...$translation,
                'history_entry' => $entry,
            ], 200, (string) $this->config['frontend_url']);
        }

        if ($method === 'POST' && $path === '/api/text-to-sign') {
            $payload = $this->readJsonBody();
            $signData = $this->textToSignService->convert(
                (string) ($payload['text'] ?? ''),
                (string) ($payload['sign_language'] ?? 'ASL')
            );

            $entry = $this->historyRepository->create([
                'entry_type' => 'sign_expression',
                'source_text' => (string) ($payload['text'] ?? ''),
                'translated_text' => implode(' ', $signData['word_sequence']),
                'sign_language' => $signData['sign_language'],
                'sentiment' => $signData['sentiment'],
                'metadata' => $signData['syntactic_metadata'],
                'extra' => [
                    'word_sequence' => $signData['word_sequence'],
                ],
            ]);

            JsonResponse::send([
                ...$signData,
                'history_entry' => $entry,
            ], 200, (string) $this->config['frontend_url']);
        }

        if ($method === 'GET' && $path === '/api/history') {
            $entryType = isset($_GET['entry_type']) ? (string) $_GET['entry_type'] : null;
            $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 10;

            JsonResponse::send([
                'data' => $this->historyRepository->list($entryType, $limit),
            ], 200, (string) $this->config['frontend_url']);
        }

        if ($method === 'GET' && $path === '/api/phrasebook') {
            $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 100;

            JsonResponse::send([
                'data' => $this->historyRepository->listPhrasebook($limit),
            ], 200, (string) $this->config['frontend_url']);
        }

        if ($method === 'POST' && $path === '/api/phrasebook') {
            $payload = $this->readJsonBody();
            $historyId = trim((string) ($payload['history_id'] ?? ''));
            if ($historyId === '') {
                throw new HttpException(422, 'A history_id is required to save a phrase.');
            }

            JsonResponse::send([
                'entry' => $this->historyRepository->markAsPhrasebook($historyId),
            ], 200, (string) $this->config['frontend_url']);
        }

        if ($method === 'DELETE' && preg_match('#^/api/phrasebook/([a-f0-9]{32})$#', $path, $matches) === 1) {
            $this->historyRepository->removeFromPhrasebook($matches[1]);
            JsonResponse::send([
                'deleted' => true,
            ], 200, (string) $this->config['frontend_url']);
        }

        if ($method === 'GET' && preg_match('#^/api/cultural-notes/([a-z]{2})$#', $path, $matches) === 1) {
            JsonResponse::send(
                $this->notesService->getDetailedNote($matches[1]),
                200,
                (string) $this->config['frontend_url']
            );
        }

        throw new HttpException(404, sprintf('Route not found: %s %s', $method, $path));
    }

    /**
     * @return array<string, mixed>
     */
    private function readJsonBody(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new HttpException(400, 'Invalid JSON payload.');
        }

        return $decoded;
    }
}
