<?php

declare(strict_types=1);

namespace Tradumust\Api\Services;

final class LanguageDetector
{
    /**
     * @var array<string, array<int, string>>
     */
    private array $keywords = [
        'fr' => ['bonjour', 'merci', 'comment', 'vous', 'allez', 'oui', 'excusez'],
        'es' => ['hola', 'gracias', 'usted', 'como', 'estas', 'por', 'favor'],
        'de' => ['hallo', 'danke', 'bitte', 'wie', 'geht', 'ihnen', 'sie'],
        'it' => ['ciao', 'grazie', 'come', 'stai', 'lei', 'buongiorno'],
        'pt' => ['ola', 'obrigado', 'voce', 'como', 'esta', 'bom', 'dia'],
        'en' => ['hello', 'thank', 'you', 'how', 'are', 'please'],
    ];

    public function detect(string $text): string
    {
        if (preg_match('/\p{Arabic}/u', $text) === 1) {
            return 'ar';
        }

        if (preg_match('/\p{Hangul}/u', $text) === 1) {
            return 'ko';
        }

        if (preg_match('/[\p{Hiragana}\p{Katakana}]/u', $text) === 1) {
            return 'ja';
        }

        if (preg_match('/\p{Han}/u', $text) === 1) {
            return 'zh';
        }

        $normalized = mb_strtolower($text);
        $scores = array_fill_keys(array_keys($this->keywords), 0);

        foreach ($this->keywords as $language => $terms) {
            foreach ($terms as $term) {
                if (str_contains($normalized, $term)) {
                    $scores[$language]++;
                }
            }
        }

        arsort($scores);
        $topLanguage = array_key_first($scores);
        return $scores[$topLanguage] > 0 ? (string) $topLanguage : 'en';
    }
}
