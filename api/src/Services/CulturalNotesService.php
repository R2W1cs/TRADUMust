<?php

declare(strict_types=1);

namespace Tradumust\Api\Services;

use Tradumust\Api\Support\HttpException;

final class CulturalNotesService
{
    /**
     * @var array<string, array<string, string>>
     */
    private array $notes = [
        'fr' => [
            'cultural_note' => "In French, 'vous' is the safe default with strangers, professors, and authority figures. Use 'tu' only in clearly informal settings.",
            'formality_level' => 'formal',
            'regional_variant' => 'France French (Hexagonal)',
            'formality_detail' => "French social tone changes quickly with pronoun choice. In academic and administrative settings, leading with 'vous' avoids sounding overly familiar.",
        ],
        'es' => [
            'cultural_note' => "Spanish formality depends on region. 'Usted' is formal, 'tú' is informal, and some countries also use 'vos' in daily speech.",
            'formality_level' => 'formal',
            'regional_variant' => 'Latin American Spanish',
            'formality_detail' => "When you do not know the relationship boundary yet, 'usted' is the safer register in institutional contexts.",
        ],
        'de' => [
            'cultural_note' => "German uses 'Sie' for formal interactions and 'du' for informal ones. Professors and officials are generally addressed formally.",
            'formality_level' => 'formal',
            'regional_variant' => 'Standard German (Hochdeutsch)',
            'formality_detail' => "Switching from 'Sie' to 'du' is usually explicit. Starting formally is the safer move in public and academic environments.",
        ],
        'ja' => [
            'cultural_note' => "Japanese politeness is carried by sentence endings. The desu/masu register is the default safe option for public, academic, and service settings.",
            'formality_level' => 'formal',
            'regional_variant' => 'Standard Japanese (Hyōjungo)',
            'formality_detail' => "Even when the literal meaning is simple, choosing a polite ending changes how respectful the sentence sounds.",
        ],
        'zh' => [
            'cultural_note' => "Mandarin is less pronoun-formal than French or German, but titles and context matter. Using role titles such as 老师 conveys respect.",
            'formality_level' => 'neutral',
            'regional_variant' => 'Simplified Chinese (Mainland)',
            'formality_detail' => "Respect often comes from titles, phrasing, and indirectness rather than a separate formal pronoun system.",
        ],
        'ar' => [
            'cultural_note' => "Arabic varies heavily by region. Modern Standard Arabic is the formal written register, while everyday speech usually happens in a local dialect.",
            'formality_level' => 'formal',
            'regional_variant' => 'Modern Standard Arabic',
            'formality_detail' => "Formal communication and writing stay closer to MSA, especially in education, government, and cross-country contexts.",
        ],
        'pt' => [
            'cultural_note' => "Portuguese differs significantly between Brazil and Portugal in pronunciation, vocabulary, and tone. Brazil tends to sound more informal in everyday speech.",
            'formality_level' => 'neutral',
            'regional_variant' => 'Brazilian Portuguese',
            'formality_detail' => "In Brazilian Portuguese, 'você' is standard in daily use. In more formal contexts, titles and indirect phrasing do more work.",
        ],
        'ko' => [
            'cultural_note' => "Korean encodes respect through speech levels and honorific markers. Formal polite endings are safest in professional or academic settings.",
            'formality_level' => 'formal',
            'regional_variant' => 'Standard Korean (Seoul dialect)',
            'formality_detail' => "You are often expected to match the listener's status and age with your sentence ending, not just the vocabulary.",
        ],
        'it' => [
            'cultural_note' => "Italian uses 'Lei' formally and 'tu' informally. Formal address remains common in administration, health care, and university settings.",
            'formality_level' => 'formal',
            'regional_variant' => 'Standard Italian',
            'formality_detail' => "Starting with 'Lei' is safer when you do not know the relationship, then relaxing only when invited.",
        ],
        'en' => [
            'cultural_note' => "English formality is driven more by tone and wording than pronouns. Directness is often acceptable, but phrasing still shifts by setting.",
            'formality_level' => 'neutral',
            'regional_variant' => 'International English',
            'formality_detail' => "Politeness in English often comes from modal verbs and softeners such as 'could', 'would', and 'please'.",
        ],
    ];

    /**
     * @return array<string, string>
     */
    public function getNote(string $language): array
    {
        $normalized = strtolower($language);
        return $this->notes[$normalized] ?? $this->notes['en'];
    }

    /**
     * @return array<string, mixed>
     */
    public function getDetailedNote(string $language): array
    {
        $normalized = strtolower($language);
        if (!isset($this->notes[$normalized])) {
            throw new HttpException(404, sprintf('No cultural notes found for "%s".', $language));
        }

        return [
            'lang' => $normalized,
            ...$this->notes[$normalized],
        ];
    }
}
