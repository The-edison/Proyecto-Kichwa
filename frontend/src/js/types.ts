export type Role = 'admin' | 'student';
export interface AuthUser {
    id: number; name: string; email: string; cedula: string | null; role: Role;
    google_connected: boolean; debe_cambiar_contrasena: boolean; email_verified: boolean;
}
export interface Paginated<T> { data: T[]; total: number; current_page: number; last_page: number; per_page: number; }
export interface Level { id: number; code: string; name: string; sort_order: number; available?: boolean; children_count?: number; }
export interface LearningModule { id: number; level_id: number; title: string; description: string; sort_order: number; percentage?: number; }
export interface Unit { id: number; module_id: number; title: string; description: string; sort_order: number; percentage?: number; }
export interface Content { id: number; unit_id: number; kind: 'vocabulary' | 'grammar' | 'culture'; title: string; body?: string; sort_order: number; percentage?: number; }
export interface ExerciseElement { id: string; texto: string; grupo?: 'origen' | 'destino'; imagen?: string; opciones?: string[]; }
export interface ExerciseZone { id: string; texto: string; x: number; y: number; imagen?: string; }
export interface ExerciseAnswer { seleccion?: string[]; textos?: Record<string, string>; pares?: Array<{ origen: string; destino: string }>; }
export interface ExerciseSolution { seleccion?: string[]; textos?: Record<string, string[]>; pares?: Array<{ origen: string; destino: string }>; }
export interface Exercise {
    id: number; unit_id?: number; topic_id?: number | null; type: 'seleccion_multiple' | 'completar' | 'relacionar' | 'arrastrar';
    prompt: string; elements: ExerciseElement[]; zones: ExerciseZone[]; resource?: string | null; sort_order: number;
}
export interface ExerciseFeedback { is_correct: boolean; feedback: string; }
export interface EvaluationQuestion extends Exercise { evaluation_id: number; score: string | number; }
export interface Evaluation { id: number; level_id: number; unit_id: number | null; type: 'unidad' | 'diagnostica'; title: string; description: string; questions: EvaluationQuestion[]; }
export interface EvaluationResult { attempt_id: number; score: number; puntaje_obtenido: number; puntaje_maximo: number; correct_count: number; total_questions: number; results: Array<{ question_id: number; is_correct: boolean; feedback: string }>; }
export interface ProgressSummary { level: { id: number; name: string }; completed_activities: number; total_activities: number; percentage: number; evaluation_results: Array<{ evaluation_id: number; best_score: string; completed_at: string }>; }
export interface GlossaryTerm { id: number; spanish: string; kichwa: string; meaning: string; synonyms?: string | null; notes?: string | null; example_spanish: string | null; example_kichwa: string | null; }
export interface Student { id: number; name: string; cedula: string | null; email: string; state: 'activo' | 'bloqueado'; }
