import type { ModuleLock } from '../types';

export function showModuleLock(lock: ModuleLock) {
    window.dispatchEvent(new CustomEvent<ModuleLock>('yachay:module-locked', { detail: lock }));
}

export function moduleResumeHref(lock: ModuleLock): string {
    const section = lock.resume.kind === 'unit' ? 'unidad' : lock.resume.kind === 'module_final' ? 'evaluacion' : 'modulo';
    return `/aprender/${section}/${lock.resume.id}`;
}
