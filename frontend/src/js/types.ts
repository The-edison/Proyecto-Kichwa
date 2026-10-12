export type Role = 'admin' | 'student';
export interface AuthUser {
    id: number; name: string; email: string; cedula: string | null; role: Role;
    google_connected: boolean; debe_cambiar_contrasena: boolean; email_verified: boolean;
}
export interface Paginated<T> { data: T[]; total: number; current_page: number; last_page: number; per_page: number; }
export interface Level { id: number; code: string; name: string; sort_order: number; available?: boolean; children_count?: number; }
export interface LearningModule { id: number; level_id: number; title: string; description: string; sort_order: number; percentage?: number; }
export interface Unit { config?: ExerciseConfig; id: number; module_id: number; title: string; description: string; sort_order: number; percentage?: number; }
export interface Content { sequence_mode?: boolean; exercise_count?: number; evaluation_id?: number | null; evaluation_question_count?: number; evaluation_final?: boolean; evaluation_locked?: boolean; mastery?: {best_score: number; stars: number; attempt_count: number} | null; lesson_key?: string | null; id: number; unit_id: number; kind: 'vocabulary' | 'grammar' | 'culture'; title: string; body?: string; sort_order: number; percentage?: number; }
export interface ModuleContent extends Content { unit_title: string; unit_objective: string; unit_order: number; exercise_count: number; }
export interface ExerciseElement { id: string; texto: string; grupo?: 'origen' | 'destino'; imagen?: string; opciones?: string[]; }
export interface ExerciseZone { id: string; texto: string; x: number; y: number; imagen?: string; }
export interface ExerciseAnswer { orden?: string[]; seleccion?: string[]; textos?: Record<string, string>; pares?: Array<{ origen: string; destino: string }>; }
export interface ExerciseSolution { orden?: string[]; seleccion?: string[]; textos?: Record<string, string[]>; pares?: Array<{ origen: string; destino: string }>; }
export interface ExerciseConfig { learning_mode?: 'classic' | 'sequence'; presentation?: 'buttons' | 'visual' | 'letter' | 'tiles' | 'writing'; word_target?: string; missing_index?: number; context_text?: string; context_meaning?: string; reveal_highlight?: string; sequence_mode?: boolean; fixed_order?: boolean; required_correct?: number; prerequisite_activities?: number[]; managed?: boolean; reviewed?: boolean; requires_audio?: boolean; requires_images?: boolean; max_selections?: number; exact_selections?: boolean; ignore_accents?: boolean; explanation?: string; correct_feedback?: string; incorrect_feedback?: string; title?: string; difficulty?: string; question_count?: number; pass_percentage?: number; final?: boolean; }
export interface Exercise {
    config?: ExerciseConfig; published?: boolean;
    id: number; unit_id?: number; topic_id?: number | null; type: 'seleccion_multiple' | 'completar' | 'relacionar' | 'arrastrar' | 'ordenar';
    prompt: string; elements: ExerciseElement[]; zones: ExerciseZone[]; resource?: string | null; sort_order: number;
}
export interface ExerciseFeedback { highlight?: string | null; xp_earned?: number; xp_total?: number; is_correct: boolean; feedback: string; }
export interface EvaluationQuestion extends Exercise { evaluation_id: number; score: string | number; }
export interface Evaluation { prerequisite_topic_ids?: number[]; history?: Array<{id: number; number: number; state: string; result: EvaluationResult | null}>; config?: ExerciseConfig; topic_id?: number; id: number; level_id: number; unit_id: number | null; type: 'unidad' | 'diagnostica'; title: string; description: string; questions: EvaluationQuestion[]; }
export interface EvaluationResult { passed?: boolean; stars?: number; xp_earned?: number; xp_total?: number; attempt_id: number; score: number; puntaje_obtenido: number; puntaje_maximo: number; correct_count: number; total_questions: number; results: Array<{ question_id: number; is_correct: boolean; feedback: string }>; }
export interface ProgressSummary { level: { id: number; name: string }; completed_activities: number; total_activities: number; percentage: number; evaluation_results: Array<{ evaluation_id: number; best_score: string; completed_at: string }>; }
export interface DictionaryTerm { id: number; kichwa: string; español: string; }
export interface Student { id: number; name: string; cedula: string | null; email: string; state: 'activo' | 'bloqueado'; }

export interface Mastery { xp: number; medals: string[]; mastered_topics: number[]; completed_units: number[]; lessons: Array<{topic_id: number; unit_id: number; name: string; attempt_count: number; best_score: number; latest_score: number | null; stars: number}>; }
