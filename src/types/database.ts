// Tipos para la base de datos de Supabase

export interface Session {
  id: string;
  code: string;
  name: string;
  moderator_name: string;
  status: 'active' | 'finished';
  created_at: string;
  finished_at: string | null;
}

export interface Participant {
  id: string;
  session_id: string;
  name: string;
  is_moderator: boolean;
  joined_at: string;
}

export interface Answer {
  id: string;
  session_id: string;
  participant_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface ParticipantWithAnswers extends Participant {
  answers: Answer[];
}

export interface SessionData extends Session {
  participants: ParticipantWithAnswers[];
}
