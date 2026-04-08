<?php

declare(strict_types=1);

namespace Tradumust\Api\Models;

use PDO;
use RuntimeException;

final class Database
{
    private static ?PDO $connection = null;

    /**
     * @param array<string, mixed> $config
     */
    public static function connect(array $config): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $databasePath = (string) ($config['database_path'] ?? 'storage/tradumust.sqlite');
        if (!str_starts_with($databasePath, DIRECTORY_SEPARATOR)) {
            $databasePath = dirname(__DIR__, 2) . '/' . ltrim($databasePath, '/');
        }

        $directory = dirname($databasePath);
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new RuntimeException('Unable to create the database directory.');
        }

        self::$connection = new PDO('sqlite:' . $databasePath, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        self::$connection->exec('PRAGMA journal_mode = WAL;');
        self::$connection->exec('PRAGMA foreign_keys = ON;');
        self::$connection->exec('PRAGMA synchronous = NORMAL;');

        $schemaPath = dirname(__DIR__, 2) . '/database/schema.sql';
        $schema = file_get_contents($schemaPath);
        if ($schema === false) {
            throw new RuntimeException('Unable to load the database schema.');
        }

        self::$connection->exec($schema);

        return self::$connection;
    }
}
