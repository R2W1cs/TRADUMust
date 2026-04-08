<?php

declare(strict_types=1);

namespace Tradumust\Api\Support;

final class Id
{
    public static function generate(): string
    {
        return bin2hex(random_bytes(16));
    }
}
