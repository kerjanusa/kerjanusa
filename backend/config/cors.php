<?php

return [

    // This backend is deployed as a dedicated API project on Vercel. The
    // runtime catch-all function forwards requests without the public `/api`
    // prefix, so CORS must apply to every path the app can see internally.
    'paths' => ['*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', env('CORS_ALLOWED_ORIGINS', '*'))
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
