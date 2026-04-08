<?php

declare(strict_types=1);

namespace Tradumust\Api\Support;

use RuntimeException;

final class HttpException extends RuntimeException
{
    /**
     * @param array<string, mixed> $errors
     */
    public function __construct(
        private readonly int $statusCode,
        string $message,
        private readonly array $errors = []
    ) {
        parent::__construct($message);
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /**
     * @return array<string, mixed>
     */
    public function getErrors(): array
    {
        return $this->errors;
    }
}
