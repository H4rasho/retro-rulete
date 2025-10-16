// Tipos para la base de datos de Supabase

export interface Session {
  id: string;
  code: string;
  name: string;
  moderator_name: string;
  status: 'active' | 'finished';
  created_at: string;
  finished_at: string | null;
  timer_duration: number;
  timer_started_at: string | null;
  timer_is_active: boolean;
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

export interface Reaction {
  id: string;
  answer_id: string;
  participant_id: string;
  created_at: string;
}

export interface Vote {
  id: string;
  session_id: string;
  voter_id: string;
  voted_for_id: string;
  created_at: string;
}

export interface AnswerWithReactions extends Answer {
  reactions: Reaction[];
  reaction_count: number;
  has_reacted: boolean;
}

export interface ParticipantWithAnswers extends Participant {
  answers: AnswerWithReactions[];
}

export interface SessionData extends Session {
  participants: ParticipantWithAnswers[];
}
