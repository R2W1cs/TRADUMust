<?php

declare(strict_types=1);

namespace Tradumust\Api\Services;

use Tradumust\Api\Support\HttpException;

final class TextToSignService
{
    /**
     * @var array<int, string>
     */
    private array $timeWords = ['today', 'tomorrow', 'yesterday', 'now', 'soon', 'later', 'morning', 'night'];

    /**
     * @var array<int, string>
     */
    private array $subjectWords = ['i', 'you', 'we', 'they', 'he', 'she', 'my', 'your', 'our', 'their'];

    /**
     * @var array<int, string>
     */
    private array $actionWords = ['go', 'need', 'help', 'learn', 'meet', 'repeat', 'understand', 'translate', 'sign', 'study', 'arrive', 'speak', 'thank', 'please'];

    /**
     * @var array<int, string>
     */
    private array $stopWords = ['a', 'an', 'the', 'is', 'are', 'am', 'to', 'of', 'for', 'on', 'at', 'in'];

    /**
     * @var array<int, string>
     */
    private array $knownSigns = ['HELLO', 'THANK', 'YOU', 'PLEASE', 'GO', 'LEARN', 'MEET', 'HELP', 'UNDERSTAND', 'REPEAT', 'LIBRARY', 'NAME', 'NICE'];

    /**
     * @return array<string, mixed>
     */
    public function convert(string $text, string $signLanguage = 'ASL'): array
    {
        $normalized = trim(preg_replace('/\s+/', ' ', $text) ?? $text);
        if ($normalized === '') {
            throw new HttpException(422, 'The text field must not be empty.');
        }

        preg_match_all("/[\p{L}\p{N}']+/u", mb_strtolower($normalized), $matches);
        $tokens = $matches[0] ?? [];

        $metadata = [];
        $seen = [];

        foreach ($tokens as $token) {
            if (in_array($token, $this->stopWords, true)) {
                continue;
            }

            $word = mb_strtoupper($token);
            if (isset($seen[$word])) {
                continue;
            }

            $tag = 'OBJECT';
            if (in_array($token, $this->timeWords, true)) {
                $tag = 'TIME';
            } elseif (in_array($token, $this->subjectWords, true)) {
                $tag = 'SUBJECT';
            } elseif (in_array($token, $this->actionWords, true) || str_ends_with($token, 'ing') || str_ends_with($token, 'ed')) {
                $tag = 'ACTION';
            } elseif (strlen($token) <= 3) {
                $tag = 'MODIFIER';
            }

            $metadata[] = [
                'word' => $word,
                'tag' => $tag,
                'duration_ms' => $this->durationFor($word, $tag),
            ];
            $seen[$word] = true;
        }

        if ($metadata === []) {
            $metadata[] = [
                'word' => mb_strtoupper($normalized),
                'tag' => 'OBJECT',
                'duration_ms' => $this->durationFor($normalized, 'OBJECT'),
            ];
        }

        usort($metadata, static function (array $left, array $right): int {
            $rank = ['TIME' => 0, 'SUBJECT' => 1, 'OBJECT' => 2, 'ACTION' => 3, 'MODIFIER' => 4];
            return ($rank[$left['tag']] ?? 99) <=> ($rank[$right['tag']] ?? 99);
        });

        $wordSequence = array_map(static fn (array $item): string => $item['word'], $metadata);
        $fingerspellFallback = array_values(array_filter(
            $wordSequence,
            fn (string $word): bool => !in_array($word, $this->knownSigns, true) || strlen($word) > 7
        ));

        return [
            'sign_language' => strtoupper($signLanguage),
            'word_sequence' => $wordSequence,
            'fingerspell_fallback' => $fingerspellFallback,
            'animation_clips' => array_map(
                static fn (array $item): array => [
                    'word' => $item['word'],
                    'clip_url' => sprintf('/clips/asl/%s.glb', strtolower($item['word'])),
                    'fingerspell' => strlen($item['word']) > 7,
                    'duration_ms' => $item['duration_ms'],
                    'tag' => $item['tag'],
                ],
                $metadata
            ),
            'sentiment' => $this->sentiment($tokens),
            'syntactic_metadata' => $metadata,
        ];
    }

    private function durationFor(string $word, string $tag): int
    {
        $base = match ($tag) {
            'TIME' => 900,
            'SUBJECT' => 950,
            'ACTION' => 1250,
            'MODIFIER' => 800,
            default => 1050,
        };

        return $base + (min(strlen($word), 10) * 35);
    }

    /**
     * @param array<int, string> $tokens
     * @return array<string, float>
     */
    private function sentiment(array $tokens): array
    {
        $positive = ['good', 'great', 'love', 'thanks', 'thank', 'hello', 'nice', 'happy'];
        $negative = ['bad', 'sorry', 'lost', 'confused', 'late', 'wrong', 'problem'];

        $positiveHits = count(array_intersect($tokens, $positive));
        $negativeHits = count(array_intersect($tokens, $negative));
        $total = max(count($tokens), 1);

        $polarity = ($positiveHits - $negativeHits) / $total;
        $subjectivity = min(1, ($positiveHits + $negativeHits + 1) / $total);

        return [
            'polarity' => round($polarity, 2),
            'subjectivity' => round($subjectivity, 2),
        ];
    }
}
