"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase, toggleReaction } from "@/lib/supabase";
import { Users, MessageSquare, Home, Heart } from "lucide-react";
import type { Session, Participant, Answer, Reaction } from "@/types/database";

interface AnswerWithReactions extends Answer {
  participant_name: string;
  reactions: Reaction[];
  has_reacted: boolean;
}

interface ParticipantData extends Participant {
  answers: AnswerWithReactions[];
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const participantId = localStorage.getItem('participantId');
    setCurrentParticipantId(participantId);
  }, []);

  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const code = params.code as string;

        // Cargar sesión
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('code', code.toUpperCase())
          .single();

        if (sessionError) throw new Error('Sesión no encontrada');

        // Verificar que la sesión esté finalizada
        if (sessionData.status !== 'finished') {
          throw new Error('La sesión aún no ha finalizado');
        }

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

        // Cargar todas las reacciones
        const { data: reactionsData, error: reactionsError } = await supabase
          .from('reactions')
          .select('*');

        if (reactionsError) throw reactionsError;

        // Agrupar respuestas por participante con reacciones
        const participantsWithAnswers: ParticipantData[] = participantsData.map(participant => {
          const participantAnswers = answersData
            .filter(a => a.participant_id === participant.id)
            .map(answer => {
              const answerReactions = reactionsData.filter(r => r.answer_id === answer.id);
              const hasReacted = answerReactions.some(r => r.participant_id === currentParticipantId);

              return {
                ...answer,
                participant_name: participant.name,
                reactions: answerReactions,
                has_reacted: hasReacted
              };
            });

          return {
            ...participant,
            answers: participantAnswers
          };
        });

        setSession(sessionData);
        setParticipants(participantsWithAnswers);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar los resultados');
        setLoading(false);
      }
    };

    loadSessionData();
  }, [params.code, currentParticipantId]);

  // Suscribirse a cambios en reacciones en tiempo real
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`session-${session.id}-reactions`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions'
        },
        async () => {
          // Recargar reacciones
          const { data: reactionsData } = await supabase
            .from('reactions')
            .select('*');

          if (reactionsData) {
            setParticipants(prev => prev.map(participant => ({
              ...participant,
              answers: participant.answers.map(answer => {
                const answerReactions = reactionsData.filter(r => r.answer_id === answer.id);
                const hasReacted = answerReactions.some(r => r.participant_id === currentParticipantId);
                
                return {
                  ...answer,
                  reactions: answerReactions,
                  has_reacted: hasReacted
                };
              })
            })));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, currentParticipantId]);

  const handleToggleReaction = async (answerId: string) => {
    if (!currentParticipantId) return;

    try {
      await toggleReaction(answerId, currentParticipantId);
      // Las actualizaciones llegarán vía Realtime
    } catch (error) {
      console.error('Error toggling reaction:', error);
      alert('Error al reaccionar');
    }
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
  const totalReactions = participants.reduce((sum, p) => 
    sum + p.answers.reduce((aSum, a) => aSum + a.reactions.length, 0), 0
  );

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
              
              <div className="flex items-center gap-3">
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
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Reacciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">{totalReactions}</p>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-purple-100 to-blue-100 border-purple-300">
          <CardContent className="p-4">
            <p className="text-center text-purple-900">
              <Heart className="inline h-4 w-4 mr-2" />
              Haz clic en el corazón para reaccionar a las respuestas que te gusten
            </p>
          </CardContent>
        </Card>

        {/* Participants and their answers */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Respuestas del Equipo</h2>
          
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
                            <p className="font-semibold text-purple-900 flex-1">
                              {answer.question}
                            </p>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {new Date(answer.created_at).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Badge>
                          </div>
                          <div className="bg-gray-50 p-3 rounded border border-gray-200 mb-3">
                            <p className="text-gray-700">{answer.answer}</p>
                          </div>
                          
                          {/* Reactions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant={answer.has_reacted ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleToggleReaction(answer.id)}
                              className={answer.has_reacted ? "bg-red-500 hover:bg-red-600" : ""}
                            >
                              <Heart 
                                className={`h-4 w-4 mr-1 ${answer.has_reacted ? 'fill-current' : ''}`} 
                              />
                              {answer.reactions.length > 0 && (
                                <span className="font-semibold">{answer.reactions.length}</span>
                              )}
                            </Button>
                            {answer.reactions.length > 0 && (
                              <span className="text-sm text-gray-500">
                                {answer.reactions.length} {answer.reactions.length === 1 ? 'persona' : 'personas'} reaccionó
                              </span>
                            )}
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
