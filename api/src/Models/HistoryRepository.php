<?php

declare(strict_types=1);

namespace Tradumust\Api\Models;

use PDO;
use Tradumust\Api\Support\HttpException;
use Tradumust\Api\Support\Id;

final class HistoryRepository
{
    public function __construct(private readonly PDO $connection)
    {
    }

    /**
     * @param array<string, mixed> $record
     * @return array<string, mixed>
     */
    public function create(array $record): array
    {
        $id = Id::generate();
        $createdAt = gmdate('c');

        $statement = $this->connection->prepare(
            'INSERT INTO history_entries (
                id,
                entry_type,
                source_text,
                translated_text,
                source_lang,
                target_lang,
                sign_language,
                cultural_note,
                formality_level,
                regional_variant,
                sentiment_json,
                metadata_json,
                extra_json,
                is_phrasebook,
                created_at
            ) VALUES (
                :id,
                :entry_type,
                :source_text,
                :translated_text,
                :source_lang,
                :target_lang,
                :sign_language,
                :cultural_note,
                :formality_level,
                :regional_variant,
                :sentiment_json,
                :metadata_json,
                :extra_json,
                :is_phrasebook,
                :created_at
            )'
        );

        $statement->execute([
            'id' => $id,
            'entry_type' => $record['entry_type'],
            'source_text' => $record['source_text'],
            'translated_text' => $record['translated_text'] ?? null,
            'source_lang' => $record['source_lang'] ?? null,
            'target_lang' => $record['target_lang'] ?? null,
            'sign_language' => $record['sign_language'] ?? null,
            'cultural_note' => $record['cultural_note'] ?? null,
            'formality_level' => $record['formality_level'] ?? null,
            'regional_variant' => $record['regional_variant'] ?? null,
            'sentiment_json' => isset($record['sentiment']) ? json_encode($record['sentiment'], JSON_UNESCAPED_UNICODE) : null,
            'metadata_json' => isset($record['metadata']) ? json_encode($record['metadata'], JSON_UNESCAPED_UNICODE) : null,
            'extra_json' => isset($record['extra']) ? json_encode($record['extra'], JSON_UNESCAPED_UNICODE) : null,
            'is_phrasebook' => !empty($record['is_phrasebook']) ? 1 : 0,
            'created_at' => $createdAt,
        ]);

        return $this->require($id);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function list(?string $entryType = null, int $limit = 10): array
    {
        $limit = max(1, min($limit, 100));

        if ($entryType === null) {
            $statement = $this->connection->prepare(
                'SELECT * FROM history_entries ORDER BY datetime(created_at) DESC LIMIT :limit'
            );
            $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
            $statement->execute();
        } else {
            $statement = $this->connection->prepare(
                'SELECT * FROM history_entries WHERE entry_type = :entry_type ORDER BY datetime(created_at) DESC LIMIT :limit'
            );
            $statement->bindValue(':entry_type', $entryType);
            $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
            $statement->execute();
        }

        $rows = $statement->fetchAll();
        return array_map([$this, 'mapRow'], $rows ?: []);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listPhrasebook(int $limit = 100): array
    {
        $limit = max(1, min($limit, 200));
        $statement = $this->connection->prepare(
            'SELECT * FROM history_entries WHERE is_phrasebook = 1 ORDER BY datetime(created_at) DESC LIMIT :limit'
        );
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();

        $rows = $statement->fetchAll();
        return array_map([$this, 'mapRow'], $rows ?: []);
    }

    /**
     * @return array<string, mixed>
     */
    public function markAsPhrasebook(string $id): array
    {
        $statement = $this->connection->prepare(
            'UPDATE history_entries SET is_phrasebook = 1 WHERE id = :id AND entry_type = :entry_type'
        );
        $statement->execute([
            'id' => $id,
            'entry_type' => 'translation',
        ]);

        if ($statement->rowCount() === 0) {
            throw new HttpException(404, 'Translation history entry not found.');
        }

        return $this->require($id);
    }

    public function removeFromPhrasebook(string $id): void
    {
        $statement = $this->connection->prepare(
            'UPDATE history_entries SET is_phrasebook = 0 WHERE id = :id'
        );
        $statement->execute(['id' => $id]);

        if ($statement->rowCount() === 0) {
            throw new HttpException(404, 'Phrasebook entry not found.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function require(string $id): array
    {
        $statement = $this->connection->prepare('SELECT * FROM history_entries WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        if ($row === false) {
            throw new HttpException(404, 'History entry not found.');
        }

        return $this->mapRow($row);
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function mapRow(array $row): array
    {
        $sentiment = $this->decodeJson($row['sentiment_json'] ?? null);
        $metadata = $this->decodeJson($row['metadata_json'] ?? null);
        $extra = $this->decodeJson($row['extra_json'] ?? null);

        return [
            'id' => (string) $row['id'],
            'entry_type' => (string) $row['entry_type'],
            'source' => (string) $row['source_text'],
            'sourceLang' => $row['source_lang'] !== null ? (string) $row['source_lang'] : null,
            'targetLang' => $row['target_lang'] !== null ? (string) $row['target_lang'] : null,
            'signLanguage' => $row['sign_language'] !== null ? (string) $row['sign_language'] : null,
            'timestamp' => (strtotime((string) $row['created_at']) ?: time()) * 1000,
            'created_at' => (string) $row['created_at'],
            'isPhrasebook' => (bool) $row['is_phrasebook'],
            'result' => [
                'translated_text' => (string) ($row['translated_text'] ?? ''),
                'cultural_note' => (string) ($row['cultural_note'] ?? ''),
                'formality_level' => (string) ($row['formality_level'] ?? 'neutral'),
                'regional_variant' => (string) ($row['regional_variant'] ?? ''),
            ],
            'sentiment' => is_array($sentiment) ? $sentiment : null,
            'metadata' => is_array($metadata) ? $metadata : [],
            'wordSequence' => isset($extra['word_sequence']) && is_array($extra['word_sequence']) ? $extra['word_sequence'] : [],
        ];
    }

    /**
     * @return array<string, mixed>|array<int, mixed>|null
     */
    private function decodeJson(?string $value): array|null
    {
        if ($value === null || $value === '') {
            return null;
        }

        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : null;
    }
}
