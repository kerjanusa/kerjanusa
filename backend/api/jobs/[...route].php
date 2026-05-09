<?php

declare(strict_types=1);

$_SERVER['SCRIPT_FILENAME'] = dirname(__DIR__) . '/index.php';
$_SERVER['SCRIPT_NAME'] = '/api/index.php';
$_SERVER['PHP_SELF'] = '/api/index.php';

require __DIR__ . '/../index.php';
