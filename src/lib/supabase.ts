import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Funciones auxiliares para la base de datos

export async function createSession(name: string, moderatorName: string) {
  const code = generateSessionCode();
  
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      code,
      name,
      moderator_name: moderatorName,
      status: 'active'
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  // Crear participante moderador
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .insert({
      session_id: session.id,
      name: moderatorName,
      is_moderator: true
    })
    .select()
    .single();

  if (participantError) throw participantError;

  return { session, participant };
}

export async function joinSession(code: string, participantName: string) {
  // Buscar sesión por código
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('status', 'active')
    .single();

  if (sessionError) throw new Error('Sesión no encontrada o finalizada');

  // Crear participante
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .insert({
      session_id: session.id,
      name: participantName,
      is_moderator: false
    })
    .select()
    .single();

  if (participantError) {
    if (participantError.code === '23505') {
      throw new Error('Ya existe un participante con ese nombre en esta sesión');
    }
    throw participantError;
  }

  return { session, participant };
}

export async function getSessionData(sessionId: string) {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError) throw sessionError;

  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('*')
    .eq('session_id', sessionId);

  if (participantsError) throw participantsError;

  const { data: answers, error: answersError } = await supabase
    .from('answers')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (answersError) throw answersError;

  return { session, participants, answers };
}

export async function saveAnswer(
  sessionId: string,
  participantId: string,
  question: string,
  answer: string
) {
  const { data, error } = await supabase
    .from('answers')
    .insert({
      session_id: sessionId,
      participant_id: participantId,
      question,
      answer
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function finishSession(sessionId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .update({ status: 'finished' })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getParticipantCount(sessionId: string) {
  const { count, error } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  if (error) throw error;
  return count || 0;
}

// Funciones de Reacciones
export async function toggleReaction(answerId: string, participantId: string) {
  // Verificar si ya existe la reacción
  const { data: existing, error: checkError } = await supabase
    .from('reactions')
    .select('id')
    .eq('answer_id', answerId)
    .eq('participant_id', participantId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  if (existing) {
    // Si existe, eliminarla
    const { error: deleteError } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existing.id);

    if (deleteError) throw deleteError;
    return { action: 'removed' };
  } else {
    // Si no existe, crearla
    const { data, error: insertError } = await supabase
      .from('reactions')
      .insert({ answer_id: answerId, participant_id: participantId })
      .select()
      .single();

    if (insertError) throw insertError;
    return { action: 'added', data };
  }
}

export async function getReactionsForAnswer(answerId: string) {
  const { data, error } = await supabase
    .from('reactions')
    .select('*')
    .eq('answer_id', answerId);

  if (error) throw error;
  return data || [];
}

export async function getReactionsForSession(sessionId: string) {
  // Obtener todas las reacciones de respuestas en esta sesión
  const { data, error } = await supabase
    .from('reactions')
    .select(`
      *,
      answers!inner(session_id)
    `)
    .eq('answers.session_id', sessionId);

  if (error) throw error;
  return data || [];
}

// Generar código de sesión simple (6 caracteres alfanuméricos)
function generateSessionCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}
