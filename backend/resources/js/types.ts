export type Role = 'admin' | 'student';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    cedula: string | null;
    role: Role;
    google_connected: boolean;
}

export interface SharedProps {
    auth: { user: AuthUser | null };
    google: { enabled: boolean };
    status?: string | null;
    errors: Record<string, string>;
}

export interface Paginated<T> {
    data: T[];
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
}

export interface Level {
    id: number;
    code: string;
    name: string;
    sort_order: number;
}

export interface LearningModule {
    id: number;
    level_id: number;
    title: string;
    description: string | null;
    sort_order: number;
    is_published?: boolean;
}

export interface Unit {
    id: number;
    module_id: number;
    title: string;
    description: string | null;
    sort_order: number;
    is_published?: boolean;
}

export interface Content {
    id: number;
    unit_id: number;
    kind: 'vocabulary' | 'grammar';
    title: string;
    body: string;
    sort_order: number;
    is_published?: boolean;
}

export interface Exercise {
    id: number;
    content_id: number;
    type: 'multiple_choice' | 'complete' | 'select';
    prompt: string;
    options: string[] | null;
    sort_order: number;
}

export interface ExerciseFeedback {
    is_correct: boolean;
    submitted_answer: string;
    correct_answer: string;
    feedback: string;
}

export interface EvaluationQuestion {
    id: number;
    evaluation_id: number;
    type: Exercise['type'];
    prompt: string;
    options: string[] | null;
    sort_order: number;
}

export interface Evaluation {
    id: number;
    level_id: number;
    title: string;
    description: string | null;
    passing_score: number;
    questions: EvaluationQuestion[];
}

export interface EvaluationResult {
    attempt_id: number;
    score: number;
    passed: boolean;
    correct_count: number;
    total_questions: number;
    results: Array<{
        question_id: number;
        submitted_answer: string;
        is_correct: boolean;
        correct_answer: string;
        feedback: string;
    }>;
}

export interface ProgressSummary {
    level: { id: number; name: string };
    completed_activities: number;
    total_activities: number;
    percentage: number;
    evaluation_results: Array<{
        evaluation_id: number;
        best_score: string;
        completed_at: string;
    }>;
}

export interface GlossaryTerm {
    id: number;
    spanish: string;
    kichwa: string;
    meaning: string;
    example_spanish: string | null;
    example_kichwa: string | null;
}

export interface Student {
    id: number;
    name: string;
    cedula: string | null;
    email: string;
    created_at: string;
}
