import {
  UserProfile,
  PastSessionItem,
  ScenarioCategory,
  SessionMetadata,
  ConsultationMessage,
  ProgressData,
  EvaluationResult,
  ApplicationMode,
  DifficultyLevel,
} from '../types/api.js';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const role = localStorage.getItem('psysim_user_role') || 'student';
  const userId = localStorage.getItem('psysim_user_id') || 'usr_student_demo';
  const userName = localStorage.getItem('psysim_user_name') || 'Dr. Medical Trainee';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-role': role,
    'x-user-id': userId,
    'x-user-name': userName,
    ...((options?.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.error || 'API request failed');
  }

  return data as T;
}

export const api = {
  getMe: () => request<UserProfile>('/me'),
  getMySessions: () => request<{ sessions: PastSessionItem[] }>('/me/sessions'),
  getCategories: () => request<{ categories: ScenarioCategory[] }>('/scenarios/categories'),

  createSession: (payload: {
    mode: ApplicationMode;
    difficulty: DifficultyLevel;
    categoryId?: string | null;
    language?: string;
  }) => request<{ session: SessionMetadata }>('/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  getSession: (id: string) => request<SessionMetadata>(`/sessions/${id}`),

  getMessages: (id: string) => request<{ messages: ConsultationMessage[] }>(`/sessions/${id}/messages`),

  sendMessage: (id: string, content: string) =>
    request<{
      patient_message: ConsultationMessage;
      progress: {
        interview_complete: boolean;
        completed_mandatory_count: number;
        total_mandatory_count: number;
      };
    }>(`/sessions/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getProgress: (id: string) => request<ProgressData>(`/sessions/${id}/progress`),

  submitDiagnosis: (id: string, diagnosis: string, clinicalReasoning?: string) =>
    request<{ status: string; evaluation_id: string }>(`/sessions/${id}/diagnosis`, {
      method: 'POST',
      body: JSON.stringify({ diagnosis, clinicalReasoning }),
    }),

  getResults: (id: string) => request<EvaluationResult>(`/sessions/${id}/results`),

  getSupervisorScenarios: () => request<{ scenarios: any[] }>('/supervisor/scenarios'),
  approveScenario: (id: string, status: 'APPROVED' | 'REJECTED') =>
    request<{ scenario: any }>(`/supervisor/scenarios/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  getKnowledgeSources: () => request<{ sources: any[] }>('/supervisor/sources'),
};
