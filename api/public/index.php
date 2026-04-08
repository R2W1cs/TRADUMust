<?php

declare(strict_types=1);

/** @var \Tradumust\Api\ApiApplication $app */
$app = require dirname(__DIR__) . '/bootstrap.php';
$app->handle($_SERVER['REQUEST_METHOD'] ?? 'GET', $_SERVER['REQUEST_URI'] ?? '/');
