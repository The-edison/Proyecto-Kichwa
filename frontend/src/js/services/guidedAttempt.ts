import type { ExerciseAnswer, ExerciseFeedback } from '../types';

export interface GuidedResult { xp_earned?: number; xp_total?: number; score: number; max_score: number; correct_count: number; total_items: number; passed: boolean; next_unit_id: number | null; details: Array<{ exercise_id: number; title: string; correct: number; total: number }>; }
export interface GuidedAttempt {
    step: number;
    answers: Record<number, ExerciseAnswer>;
    feedback: Record<number, ExerciseFeedback | undefined>;
    xpEarned: number;
    summary: GuidedResult | null;
    selectedOrigin: string;
    practiceAttemptId: string | null;
    submissions: Record<number, string | undefined>;
    catalog: string;
}

const drafts = new Map<string, GuidedAttempt>();
const listeners = new Map<string, Set<() => void>>();
export const emptyGuidedAttempt = (catalog = ''): GuidedAttempt => ({ step: 0, answers: {}, feedback: {}, xpEarned: 0, summary: null, selectedOrigin: '', practiceAttemptId: null, submissions: {}, catalog });
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));

function valid(value: unknown): value is GuidedAttempt {
    if (!record(value) || !Number.isSafeInteger(value.step) || Number(value.step) < 0 || !Number.isFinite(value.xpEarned) || Number(value.xpEarned) < 0
        || typeof value.catalog !== 'string' || typeof value.selectedOrigin !== 'string' || (value.practiceAttemptId !== null && typeof value.practiceAttemptId !== 'string')
        || !record(value.answers) || !record(value.feedback) || !record(value.submissions)) return false;
    if (!Object.values(value.answers).every(record) || !Object.values(value.feedback).every(item => record(item) && typeof item.is_correct === 'boolean')
        || !Object.values(value.submissions).every(item => typeof item === 'string')) return false;
    return value.summary === null || (record(value.summary) && Number.isFinite(value.summary.score) && Number.isFinite(value.summary.max_score)
        && typeof value.summary.passed === 'boolean' && Array.isArray(value.summary.details) && value.summary.details.every(item => record(item) && typeof item.title === 'string'));
}

export function readGuidedAttempt(key: string): GuidedAttempt {
    const cached = drafts.get(key);
    if (cached) return cached;
    let draft = emptyGuidedAttempt();
    try {
        const saved: unknown = JSON.parse(window.sessionStorage.getItem(key) ?? 'null');
        if (valid(saved)) draft = saved;
    } catch { /* Keep an in-memory draft when browser storage is unavailable. */ }
    drafts.set(key, draft);
    return draft;
}

export function writeGuidedAttempt(key: string, draft: GuidedAttempt): void {
    drafts.set(key, draft);
    try { window.sessionStorage.setItem(key, JSON.stringify(draft)); } catch { /* Navigation still preserves the in-memory draft. */ }
    listeners.get(key)?.forEach(listener => listener());
}

export function subscribeGuidedAttempt(key: string, listener: () => void): () => void {
    const subscribers = listeners.get(key) ?? new Set<() => void>();
    subscribers.add(listener);
    listeners.set(key, subscribers);
    return () => { subscribers.delete(listener); if (!subscribers.size) listeners.delete(key); };
}
