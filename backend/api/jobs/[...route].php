<?php

declare(strict_types=1);

if (isset($_GET['__debug_route'])) {
    header('Content-Type: application/json');
    echo json_encode([
        'request_uri' => $_SERVER['REQUEST_URI'] ?? null,
        'script_name' => $_SERVER['SCRIPT_NAME'] ?? null,
        'php_self' => $_SERVER['PHP_SELF'] ?? null,
        'path_info' => $_SERVER['PATH_INFO'] ?? null,
        'query_string' => $_SERVER['QUERY_STRING'] ?? null,
        'vercel_url' => $_SERVER['VERCEL_URL'] ?? null,
    ], JSON_PRETTY_PRINT);
    exit;
}

require __DIR__ . '/../index.php';
