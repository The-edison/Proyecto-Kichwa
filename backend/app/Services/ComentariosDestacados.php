<?php

namespace App\Services;

use App\Models\Testimonial;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class ComentariosDestacados
{
    public const CACHE_KEY = 'comentarios:destacados:v2';

    private const FALLBACK_CACHE_KEY = 'comentarios:destacados:respaldo:v2';

    private function available(): Builder
    {
        return Testimonial::query()->where('excluido', false)
            ->whereRaw('char_length(trim(body)) > 0')->where('created_at', '<=', now())
            ->where(function (Builder $query): void {
                $query->whereHas('usuario', fn (Builder $user) => $user->where('rol_usuario', 'estudiante')->where('estado_usuario', 'activo'))
                    ->orWhere(fn (Builder $legacy) => $legacy->whereNull('usuario_id')->whereHas('user'));
            });
    }

    private function eligible(): Builder
    {
        return $this->available()->where('puntaje', '>', 0)
            ->whereRaw('char_length(body) >= ?', [30])
            ->where('created_at', '>=', now()->subDays(30))
            ->orderByDesc('puntaje')->orderByDesc('created_at')->orderByDesc('id');
    }

    public function selected(): Collection
    {
        $ids = Cache::remember(self::CACHE_KEY, now()->addWeek(), fn (): array => $this->eligible()->limit(6)->pluck('id')->all());

        $selected = $this->eligible()->whereIn('id', $ids)
            ->with(['user:id,name', 'usuario:id_usuario,nombre_usuario'])->get();

        if ($selected->isNotEmpty()) {
            return $selected;
        }

        $fallbackIds = Cache::remember(self::FALLBACK_CACHE_KEY, now()->addWeek(), fn (): array => $this->available()
            ->latest('created_at')->orderByDesc('id')->limit(6)->pluck('id')->all());

        return $this->available()->whereIn('id', $fallbackIds)->latest('created_at')->orderByDesc('id')
            ->with(['user:id,name', 'usuario:id_usuario,nombre_usuario'])->get();
    }

    public function refresh(): Collection
    {
        Cache::forget(self::CACHE_KEY);
        Cache::forget(self::FALLBACK_CACHE_KEY);

        return $this->selected();
    }
}
