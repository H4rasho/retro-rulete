"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RetroWheelCollaborative from "@/components/RetroWheelCollaborative";
import { supabase } from "@/lib/supabase";
import type { Session, Participant } from "@/types/database";

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const code = params.code as string;
        const sessionId = localStorage.getItem('sessionId');
        const participantId = localStorage.getItem('participantId');

        if (!sessionId || !participantId) {
          router.push('/');
          return;
        }

        // Cargar sesión
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('code', code.toUpperCase())
          .single();

        if (sessionError) throw new Error('Sesión no encontrada');

        // Cargar participante
        const { data: participantData, error: participantError } = await supabase
          .from('participants')
          .select('*')
          .eq('id', participantId)
          .single();

        if (participantError) throw new Error('Participante no encontrado');

        setSession(sessionData);
        setParticipant(participantData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar la sesión');
        setLoading(false);
      }
    };

    loadSession();
  }, [params.code, router]);

  // Suscribirse a cambios en el estado de la sesión
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${session.id}`
        },
        (payload) => {
          setSession(payload.new as Session);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (error || !session || !participant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'No se pudo cargar la sesión'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  if (session.status === 'finished') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Sesión Finalizada</h2>
          <p className="text-gray-600 mb-6">
            Esta sesión ha sido finalizada por el moderador.
          </p>
          {participant.is_moderator && (
            <button
              onClick={() => router.push(`/moderator/${session.code}`)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 mr-2"
            >
              Ver Resultados
            </button>
          )}
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <RetroWheelCollaborative
      session={session}
      participant={participant}
    />
  );
}
