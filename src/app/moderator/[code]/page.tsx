"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Users, MessageSquare, Download, Home } from "lucide-react";
import type { Session, Participant, Answer } from "@/types/database";

interface ParticipantWithAnswers extends Participant {
  answers: Answer[];
}

export default function ModeratorPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithAnswers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const code = params.code as string;
        const isModerator = localStorage.getItem('isModerator') === 'true';

        if (!isModerator) {
          setError('Solo el moderador puede acceder a esta página');
          return;
        }

        // Cargar sesión
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('code', code.toUpperCase())
          .single();

        if (sessionError) throw new Error('Sesión no encontrada');

        // Cargar participantes
        const { data: participantsData, error: participantsError } = await supabase
          .from('participants')
          .select('*')
          .eq('session_id', sessionData.id);

        if (participantsError) throw participantsError;

        // Cargar todas las respuestas
        const { data: answersData, error: answersError } = await supabase
          .from('answers')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('created_at', { ascending: false });

        if (answersError) throw answersError;

        // Agrupar respuestas por participante
        const participantsWithAnswers: ParticipantWithAnswers[] = participantsData.map(p => ({
          ...p,
          answers: answersData.filter(a => a.participant_id === p.id)
        }));

        setSession(sessionData);
        setParticipants(participantsWithAnswers);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar los datos');
        setLoading(false);
      }
    };

    loadSessionData();
  }, [params.code]);

  // Suscribirse a nuevas respuestas en tiempo real
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`session-${session.id}-all-answers`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'answers',
          filter: `session_id=eq.${session.id}`
        },
        (payload) => {
          const newAnswer = payload.new as Answer;
          setParticipants(prev => prev.map(p => {
            if (p.id === newAnswer.participant_id) {
              return { ...p, answers: [newAnswer, ...p.answers] };
            }
            return p;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  const exportToText = () => {
    if (!session) return;

    let text = `RETROSPECTIVA: ${session.name}\n`;
    text += `Código de Sesión: ${session.code}\n`;
    text += `Moderador: ${session.moderator_name}\n`;
    text += `Fecha: ${new Date(session.created_at).toLocaleString('es-ES')}\n`;
    text += `\n${'='.repeat(60)}\n\n`;

    participants.forEach(participant => {
      text += `PARTICIPANTE: ${participant.name}\n`;
      text += `${'-'.repeat(60)}\n`;
      
      if (participant.answers.length === 0) {
        text += `  (Sin respuestas)\n\n`;
      } else {
        participant.answers.forEach((answer, idx) => {
          text += `\n${idx + 1}. ${answer.question}\n`;
          text += `   Respuesta: ${answer.answer}\n`;
          text += `   Hora: ${new Date(answer.created_at).toLocaleTimeString('es-ES')}\n`;
        });
        text += `\n`;
      }
      text += `\n`;
    });

    // Crear y descargar archivo
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retro-${session.code}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando resultados...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'No se pudieron cargar los resultados'}</p>
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

  const totalAnswers = participants.reduce((sum, p) => sum + p.answers.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 py-8">
      <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
        {/* Header */}
        <Card className="border-2 border-purple-300 bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Resultados: {session.name}
                </h1>
                <p className="text-gray-600 mt-1">
                  Sesión finalizada · Código: <span className="font-bold">{session.code}</span>
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={exportToText}
                  variant="outline"
                  className="bg-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="bg-white"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Inicio
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Participantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{participants.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Respuestas Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{totalAnswers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Promedio por Participante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {participants.length > 0 ? (totalAnswers / participants.length).toFixed(1) : 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Participants and their answers */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Respuestas por Participante</h2>
          
          {participants.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No hay participantes en esta sesión
              </CardContent>
            </Card>
          ) : (
            participants.map((participant) => (
              <Card key={participant.id} className="border-2 border-gray-200">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {participant.name}
                      {participant.is_moderator && (
                        <Badge className="bg-purple-600">Moderador</Badge>
                      )}
                    </CardTitle>
                    <Badge variant="outline" className="text-lg">
                      {participant.answers.length} respuesta{participant.answers.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <CardDescription>
                    Se unió: {new Date(participant.joined_at).toLocaleString('es-ES')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {participant.answers.length === 0 ? (
                    <p className="text-gray-500 italic">Este participante no envió respuestas</p>
                  ) : (
                    <div className="space-y-4">
                      {participant.answers.map((answer) => (
                        <div
                          key={answer.id}
                          className="p-4 rounded-lg bg-white border-2 border-gray-200 hover:border-purple-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-semibold text-purple-900">
                              {answer.question}
                            </p>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {new Date(answer.created_at).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Badge>
                          </div>
                          <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <p className="text-gray-700">{answer.answer}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
