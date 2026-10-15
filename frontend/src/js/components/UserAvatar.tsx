import { Flower2, MoonStar, Sun, type LucideIcon } from 'lucide-react';
import cometa from '../../images/cuy-companion.webp';
import guide from '../../images/cometa-teaching.webp';
import encouragingCometa from '../../images/cuy-companion-encourage.webp';
import { apiBaseUrl } from '../services/api';
import '../../css/avatar-picker.css';

export const avatarOptions: Array<{ id: string; label: string; image?: string; Icon?: LucideIcon }> = [
    { id: 'cometa', label: 'Cometa', image: cometa },
    { id: 'cometa-guia', label: 'Cometa guía', image: guide },
    { id: 'cometa-animo', label: 'Cometa te anima', image: encouragingCometa },
    { id: 'sol', label: 'Sol andino', Icon: Sun },
    { id: 'luna', label: 'Luna', Icon: MoonStar },
    { id: 'flor', label: 'Sisa · Flor', Icon: Flower2 },
];

export function UserAvatar({ name = '', avatar, className = 'user-avatar' }: { name?: string; avatar?: string | null; className?: string }) {
    const preset = avatarOptions.find(option => option.id === avatar);
    const uploaded = /^avatars\/[a-f0-9]{40}\.webp$/.test(avatar ?? '');
    const src = preset?.image ?? (uploaded ? `${apiBaseUrl}/api/${avatar}` : undefined);
    const Icon = preset?.Icon;
    return <span className={`${className} system-avatar${preset || uploaded ? ' has-avatar' : ''}${uploaded ? ' is-uploaded' : ''}`} aria-hidden="true">
        {src ? <img src={src} alt="" width={128} height={128} decoding="async" /> : Icon ? <Icon strokeWidth={1.6} /> : name.slice(0, 1).toUpperCase()}
    </span>;
}
