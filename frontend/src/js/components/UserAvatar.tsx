import presets from '../../../../backend/resources/avatar-presets.json';
import { AvatarIllustration } from './AvatarIllustration';
import '../../css/avatar-picker.css';

export const avatarOptions = presets;
const previousAvatars: Record<string, string> = { cometa: 'llama', 'cometa-guia': 'condor', 'cometa-animo': 'colibri', sol: 'jaguar', luna: 'oso', flor: 'mariposa' };

export function resolveAvatarId(avatar?: string | null): string | undefined {
    const id = avatar ? previousAvatars[avatar] ?? avatar : undefined;
    return avatarOptions.find(option => option.id === id)?.id;
}

export function UserAvatar({ name = '', avatar, className = 'user-avatar' }: { name?: string; avatar?: string | null; className?: string }) {
    const preset = avatarOptions.find(option => option.id === resolveAvatarId(avatar));
    return <span className={`${className} system-avatar${preset ? ' has-avatar' : ''}`} aria-hidden="true">
        {preset ? <AvatarIllustration id={preset.id} background={preset.background} /> : name.slice(0, 1).toUpperCase()}
    </span>;
}
