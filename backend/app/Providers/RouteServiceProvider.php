<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for your application.
     *
     * @var string
     */
    public const HOME = '/';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        $this->routes(function () {
            Route::prefix('api')
                ->middleware('api')
                ->group(base_path('routes/api.php'));

            // Some Vercel PHP entrypoints arrive at Laravel with PATH_INFO stripped of the
            // public /api prefix (for example /api/login can reach Laravel as /login).
            // Registering a second, unprefixed copy keeps those routes resolvable while the
            // explicit /api-prefixed group continues to serve exact wrapper routes.
            Route::middleware('api')
                ->group(base_path('routes/api.php'));
        });
    }
}
