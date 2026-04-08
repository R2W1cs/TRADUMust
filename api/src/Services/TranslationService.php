<?php

declare(strict_types=1);

namespace Tradumust\Api\Services;

use Tradumust\Api\Support\HttpException;

final class TranslationService
{
    /**
     * @var array<string, array<string, string>>
     */
    private array $offlinePhrasebook = [
        'hello, how are you?' => [
            'fr' => 'Bonjour, comment allez-vous ?',
            'es' => 'Hola, ¿cómo está usted?',
            'de' => 'Hallo, wie geht es Ihnen?',
            'it' => 'Buongiorno, come sta?',
            'pt' => 'Olá, como você está?',
            'ja' => 'こんにちは、お元気ですか？',
            'zh' => '你好，你好吗？',
            'ar' => 'مرحبًا، كيف حالك؟',
            'ko' => '안녕하세요, 잘 지내세요?',
        ],
        'thank you' => [
            'fr' => 'Merci',
            'es' => 'Gracias',
            'de' => 'Danke',
            'it' => 'Grazie',
            'pt' => 'Obrigado',
            'ja' => 'ありがとうございます',
            'zh' => '谢谢',
            'ar' => 'شكرًا',
            'ko' => '감사합니다',
        ],
        'please' => [
            'fr' => "S'il vous plaît",
            'es' => 'Por favor',
            'de' => 'Bitte',
            'it' => 'Per favore',
            'pt' => 'Por favor',
            'ja' => 'お願いします',
            'zh' => '请',
            'ar' => 'من فضلك',
            'ko' => '부탁합니다',
        ],
        'where is the library?' => [
            'fr' => 'Où est la bibliothèque ?',
            'es' => '¿Dónde está la biblioteca?',
            'de' => 'Wo ist die Bibliothek?',
            'it' => 'Dov’è la biblioteca?',
            'pt' => 'Onde fica a biblioteca?',
            'ja' => '図書館はどこですか？',
            'zh' => '图书馆在哪里？',
            'ar' => 'أين تقع المكتبة؟',
            'ko' => '도서관이 어디에 있나요?',
        ],
        "i don't understand." => [
            'fr' => 'Je ne comprends pas.',
            'es' => 'No entiendo.',
            'de' => 'Ich verstehe nicht.',
            'it' => 'Non capisco.',
            'pt' => 'Não entendo.',
            'ja' => 'わかりません。',
            'zh' => '我不明白。',
            'ar' => 'أنا لا أفهم.',
            'ko' => '이해하지 못했습니다.',
        ],
    ];

    /**
     * @param array<string, mixed> $config
     */
    public function __construct(
        private readonly array $config,
        private readonly CulturalNotesService $notesService,
        private readonly LanguageDetector $detector
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function translate(string $text, string $sourceLanguage, string $targetLanguage): array
    {
        $normalizedText = trim(preg_replace('/\s+/', ' ', $text) ?? $text);
        if ($normalizedText === '') {
            throw new HttpException(422, 'The text field must not be empty.');
        }

        $targetLanguage = strtolower(trim($targetLanguage));
        if ($targetLanguage === '' || $targetLanguage === 'auto') {
            throw new HttpException(422, 'A concrete target language is required.');
        }

        $sourceLanguage = strtolower(trim($sourceLanguage));
        $detectedSource = $sourceLanguage === '' || $sourceLanguage === 'auto'
            ? $this->detector->detect($normalizedText)
            : $sourceLanguage;

        $translatedText = $detectedSource === $targetLanguage
            ? $normalizedText
            : $this->translateViaConfiguredProvider($normalizedText, $detectedSource, $targetLanguage);

        $note = $this->notesService->getNote($targetLanguage);

        return [
            'translated_text' => $translatedText,
            'cultural_note' => $note['cultural_note'],
            'formality_level' => $note['formality_level'],
            'regional_variant' => $note['regional_variant'],
            'formality_detail' => $note['formality_detail'],
            'source_lang_detected' => $detectedSource,
        ];
    }

    private function translateViaConfiguredProvider(string $text, string $sourceLanguage, string $targetLanguage): string
    {
        $provider = (string) ($this->config['translation_provider'] ?? 'fallback');

        $translatedText = null;

        if ($provider === 'libretranslate') {
            $translatedText = $this->translateWithLibreTranslate($text, $sourceLanguage, $targetLanguage);
        } elseif ($provider === 'mymemory') {
            $translatedText = $this->translateWithMyMemory($text, $sourceLanguage, $targetLanguage);
        }

        if ($translatedText === null || trim($translatedText) === '') {
            $translatedText = $this->translateOffline($text, $targetLanguage);
        }

        return $translatedText;
    }

    private function translateWithLibreTranslate(string $text, string $sourceLanguage, string $targetLanguage): ?string
    {
        $url = trim((string) ($this->config['libretranslate_url'] ?? ''));
        if ($url === '') {
            return null;
        }

        $payload = [
            'q' => $text,
            'source' => $sourceLanguage,
            'target' => $targetLanguage,
            'format' => 'text',
        ];

        $apiKey = trim((string) ($this->config['libretranslate_api_key'] ?? ''));
        if ($apiKey !== '') {
            $payload['api_key'] = $apiKey;
        }

        $response = $this->requestJson(
            $url,
            [
                'method' => 'POST',
                'headers' => [
                    'Content-Type: application/json',
                    'Accept: application/json',
                ],
                'body' => json_encode($payload, JSON_UNESCAPED_UNICODE),
            ]
        );

        return isset($response['translatedText']) ? (string) $response['translatedText'] : null;
    }

    private function translateWithMyMemory(string $text, string $sourceLanguage, string $targetLanguage): ?string
    {
        $baseUrl = trim((string) ($this->config['mymemory_url'] ?? ''));
        if ($baseUrl === '') {
            return null;
        }

        $query = http_build_query([
            'q' => $text,
            'langpair' => sprintf('%s|%s', $sourceLanguage, $targetLanguage),
        ]);

        $response = $this->requestJson(
            $baseUrl . '?' . $query,
            [
                'method' => 'GET',
                'headers' => [
                    'Accept: application/json',
                ],
            ]
        );

        return isset($response['responseData']['translatedText'])
            ? (string) $response['responseData']['translatedText']
            : null;
    }

    private function translateOffline(string $text, string $targetLanguage): string
    {
        $normalizedText = mb_strtolower(trim($text));
        if (isset($this->offlinePhrasebook[$normalizedText][$targetLanguage])) {
            return $this->offlinePhrasebook[$normalizedText][$targetLanguage];
        }

        return $text;
    }

    /**
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    private function requestJson(string $url, array $options): array
    {
        $method = strtoupper((string) ($options['method'] ?? 'GET'));
        $headers = $options['headers'] ?? [];
        $body = $options['body'] ?? null;

        $context = stream_context_create([
            'http' => [
                'method' => $method,
                'timeout' => 5,
                'ignore_errors' => true,
                'header' => implode("\r\n", $headers),
                'content' => is_string($body) ? $body : '',
            ],
        ]);

        $raw = @file_get_contents($url, false, $context);
        if ($raw === false || $raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }
}
