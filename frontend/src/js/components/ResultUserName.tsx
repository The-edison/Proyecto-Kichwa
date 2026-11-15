import { useAuth } from '../context/AuthContext';

export function ResultUserName() {
    const { user } = useAuth();
    const parts = user?.name?.trim().split(/\s+/u).filter(Boolean) ?? [];
    if (!parts.length) return null;
    const name = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];

    return <p className="result-user-name">{name}</p>;
}
