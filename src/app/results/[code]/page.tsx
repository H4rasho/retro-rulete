"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase, toggleReaction, voteForParticipant, getVotesForSession, getMyVote, getCollectedHearts } from "@/lib/supabase";
import { Users, MessageSquare, Home, Heart, Trophy, Star } from "lucide-react";
import type { Session, Participant, Answer, Reaction, Vote } from "@/types/database";

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
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVote, setMyVote] = useState<Vote | null>(null);
  const [collectedHearts, setCollectedHearts] = useState<any[]>([]);

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

        // Cargar votos
        const votesData = await getVotesForSession(sessionData.id);
        setVotes(votesData);

        // Cargar mi voto si existe
        if (currentParticipantId) {
          const myVoteData = await getMyVote(sessionData.id, currentParticipantId);
          setMyVote(myVoteData);
        }

        // Cargar corazones coleccionados
        const heartsData = await getCollectedHearts(sessionData.id);
        setCollectedHearts(heartsData);

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

    // Optimistic UI: Actualizar inmediatamente antes de la petición
    setParticipants(prev => prev.map(participant => ({
      ...participant,
      answers: participant.answers.map(answer => {
        if (answer.id === answerId) {
          const hasReacted = answer.has_reacted;
          const newReactions = hasReacted
            ? answer.reactions.filter(r => r.participant_id !== currentParticipantId)
            : [...answer.reactions, {
                id: 'temp-' + Date.now(),
                answer_id: answerId,
                participant_id: currentParticipantId,
                created_at: new Date().toISOString()
              }];

          return {
            ...answer,
            reactions: newReactions,
            has_reacted: !hasReacted
          };
        }
        return answer;
      })
    })));

    try {
      await toggleReaction(answerId, currentParticipantId);
      // La sincronización en tiempo real confirmará o corregirá el estado
    } catch (error) {
      console.error('Error toggling reaction:', error);
      
      // Revertir el cambio optimista en caso de error
      setParticipants(prev => prev.map(participant => ({
        ...participant,
        answers: participant.answers.map(answer => {
          if (answer.id === answerId) {
            const hasReacted = answer.has_reacted;
            const newReactions = !hasReacted
              ? answer.reactions.filter(r => r.participant_id !== currentParticipantId)
              : [...answer.reactions, {
                  id: 'temp-' + Date.now(),
                  answer_id: answerId,
                  participant_id: currentParticipantId,
                  created_at: new Date().toISOString()
                }];

            return {
              ...answer,
              reactions: newReactions,
              has_reacted: !hasReacted
            };
          }
          return answer;
        })
      })));
      
      alert('Error al reaccionar. Intenta de nuevo.');
    }
  };

  const handleVote = async (participantId: string) => {
    if (!currentParticipantId || !session) return;

    // No permitir votar por uno mismo
    if (participantId === currentParticipantId) {
      alert('No puedes votar por ti mismo');
      return;
    }

    // Guardar estado anterior para rollback
    const previousVotes = [...votes];
    const previousMyVote = myVote ? { ...myVote } : null;

    // Optimistic UI: Actualizar inmediatamente
    if (myVote) {
      // Actualizar voto existente
      setVotes(prev => prev.map(v => 
        v.voter_id === currentParticipantId 
          ? { ...v, voted_for_id: participantId }
          : v
      ));
      setMyVote({ ...myVote, voted_for_id: participantId });
    } else {
      // Crear nuevo voto
      const newVote = {
        id: 'temp-' + Date.now(),
        session_id: session.id,
        voter_id: currentParticipantId,
        voted_for_id: participantId,
        created_at: new Date().toISOString()
      };
      setVotes(prev => [...prev, newVote]);
      setMyVote(newVote);
    }

    try {
      await voteForParticipant(session.id, currentParticipantId, participantId);
      // La sincronización en tiempo real confirmará el estado
    } catch (error) {
      console.error('Error voting:', error);
      
      // Revertir cambios en caso de error
      setVotes(previousVotes);
      setMyVote(previousMyVote);
      
      alert('Error al votar. Intenta de nuevo.');
    }
  };

  // Suscribirse a cambios en votos en tiempo real
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`session-${session.id}-votes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
        },
        async () => {
          // Recargar votos
          const votesData = await getVotesForSession(session.id);
          setVotes(votesData);

          // Actualizar mi voto
          if (currentParticipantId) {
            const myVoteData = await getMyVote(session.id, currentParticipantId);
            setMyVote(myVoteData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, currentParticipantId]);

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
        <Card className="border-2 border-purple-300 bg-white/80 backdrop-blur shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Title */}
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  📊 Resultados: {session.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-green-600 text-white text-xs">Sesión Finalizada</Badge>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-600">Código: <span className="font-bold text-purple-600">{session.code}</span></span>
                </div>
              </div>

              {/* Stats Inline */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                  <Users className="h-5 w-5 text-purple-600" />
                  <div className="flex flex-col">
                    <span className="text-xs text-purple-600">Participantes</span>
                    <span className="text-xl font-bold text-purple-700">{participants.length}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <div className="flex flex-col">
                    <span className="text-xs text-blue-600">Respuestas</span>
                    <span className="text-xl font-bold text-blue-700">{totalAnswers}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                  <Heart className="h-5 w-5 text-red-600" />
                  <div className="flex flex-col">
                    <span className="text-xs text-red-600">Reacciones</span>
                    <span className="text-xl font-bold text-red-700">{totalReactions}</span>
                  </div>
                </div>

                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  size="sm"
                  className="text-sm"
                >
                  <Home className="mr-1.5 h-4 w-4" />
                  Inicio
                </Button>
              </div>
            </div>

            {/* Participants List */}
            {participants.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium">Participantes:</span>
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                    >
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className="font-medium">{p.name}</span>
                      {p.is_moderator && (
                        <Badge className="bg-purple-600 text-white text-[10px] px-1 py-0 h-4">M</Badge>
                      )}
                      <span className="text-gray-500">({p.answers.length})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-purple-100 to-blue-100 border-purple-300">
          <CardContent className="p-4">
            <p className="text-center text-purple-900">
              <Heart className="inline h-4 w-4 mr-2" />
              Haz clic en el corazón para reaccionar a las respuestas que te gusten
            </p>
          </CardContent>
        </Card>

        {/* All Answers in Grid */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Respuestas del Equipo</h2>
          
          {(() => {
            // Aplanar todas las respuestas de todos los participantes
            const allAnswers = participants.flatMap(participant => 
              participant.answers.map(answer => ({
                ...answer,
                participant_name: participant.name,
                is_moderator: participant.is_moderator
              }))
            );

            if (allAnswers.length === 0) {
              return (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    No hay respuestas en esta sesión
                  </CardContent>
                </Card>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allAnswers.map((answer) => (
                  <Card
                    key={answer.id}
                    className="border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300 flex flex-col"
                  >
                    <CardHeader className="pb-3 bg-gradient-to-br from-purple-50 to-blue-50">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👤</span>
                          <span className="font-semibold text-sm text-gray-800">
                            {answer.participant_name}
                          </span>
                        </div>
                        {answer.is_moderator && (
                          <Badge className="bg-purple-600 text-xs h-5">Mod</Badge>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-purple-900 text-sm leading-tight flex-1">
                          {answer.question}
                        </p>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {new Date(answer.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <div className="bg-white p-3 rounded-lg border border-gray-200 mb-3 flex-1">
                        <p className="text-gray-700 text-sm">{answer.answer}</p>
                      </div>
                      
                      {/* Reactions */}
                      <div className="flex items-center pt-2 border-t border-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleReaction(answer.id)}
                          className={`gap-1.5 hover:bg-red-50 ${
                            answer.has_reacted 
                              ? 'text-red-500 hover:text-red-600' 
                              : 'text-gray-500 hover:text-red-500'
                          }`}
                        >
                          <Heart 
                            className={`h-4 w-4 transition-all ${
                              answer.has_reacted ? 'fill-current scale-110' : ''
                            }`} 
                          />
                          <span className="text-sm font-medium">
                            {answer.reactions.length > 0 ? answer.reactions.length : 'Me gusta'}
                          </span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Hearts Leaderboard */}
        {collectedHearts.length > 0 && (
          <div className="space-y-6 mt-12">
            <Card className="border-2 border-pink-300 bg-gradient-to-r from-pink-50 to-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  ❤️ Leaderboard de Corazones
                </CardTitle>
                <p className="text-gray-700 mt-2">
                  Participantes que tuvieron la suerte de conseguir corazones durante la sesión
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {collectedHearts.map((heart: any, index: number) => (
                    <div
                      key={heart.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        index === 0
                          ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-400'
                          : index === 1
                          ? 'bg-gradient-to-r from-gray-100 to-slate-100 border-gray-400'
                          : index === 2
                          ? 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-400'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-lg">{heart.participants?.name}</p>
                            {heart.participants?.is_moderator && (
                              <Badge className="bg-purple-600 text-white text-xs">Mod</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {heart.hearts_count} {heart.hearts_count === 1 ? 'corazón' : 'corazones'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(heart.hearts_count, 10) }).map((_, i) => (
                          <span key={i} className="text-2xl">❤️</span>
                        ))}
                        {heart.hearts_count > 10 && (
                          <span className="text-lg font-bold text-red-600">+{heart.hearts_count - 10}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Voting Section */}
        <div className="space-y-6 mt-12">
          <Card className="border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Trophy className="h-6 w-6 text-yellow-600" />
                Destacado del Sprint
              </CardTitle>
              <p className="text-gray-700 mt-2">
                Vota por el participante que consideres destacado en este sprint. Solo puedes votar por una persona.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {participants.map((participant) => {
                  const voteCount = votes.filter(v => v.voted_for_id === participant.id).length;
                  const hasVoted = myVote?.voted_for_id === participant.id;
                  const isCurrentUser = participant.id === currentParticipantId;

                  return (
                    <Card 
                      key={participant.id}
                      className={`transition-all ${
                        hasVoted 
                          ? 'border-2 border-yellow-500 bg-yellow-50' 
                          : isCurrentUser
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:border-yellow-300 hover:shadow-lg cursor-pointer'
                      }`}
                      onClick={() => !isCurrentUser && handleVote(participant.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="text-2xl">
                              {hasVoted ? '⭐' : '👤'}
                            </div>
                            <div>
                              <p className="font-semibold">{participant.name}</p>
                              {isCurrentUser && (
                                <p className="text-xs text-gray-500">(Tú)</p>
                              )}
                            </div>
                          </div>
                          {participant.is_moderator && (
                            <Badge className="bg-purple-600 text-xs">Mod</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <Star className={`h-4 w-4 ${voteCount > 0 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                          <span className="text-sm font-semibold">
                            {voteCount} {voteCount === 1 ? 'voto' : 'votos'}
                          </span>
                        </div>

                        {hasVoted && (
                          <div className="mt-2 text-xs text-yellow-700 font-medium">
                            ✓ Tu voto
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {myVote && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-center">
                  <p className="text-sm text-yellow-800">
                    Ya votaste. Haz clic en otro participante para cambiar tu voto.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Winner Display */}
          {votes.length > 0 && (() => {
            const voteCounts = participants.map(p => ({
              participant: p,
              votes: votes.filter(v => v.voted_for_id === p.id).length
            }));
            const maxVotes = Math.max(...voteCounts.map(vc => vc.votes));
            const winners = voteCounts.filter(vc => vc.votes === maxVotes && vc.votes > 0);

            if (winners.length > 0) {
              return (
                <Card className="border-2 border-yellow-400 bg-gradient-to-r from-yellow-100 to-amber-100">
                  <CardContent className="p-6 text-center">
                    <Trophy className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {winners.length === 1 ? '🏆 Destacado del Sprint' : '🏆 Empate'}
                    </h3>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      {winners.map(w => (
                        <div key={w.participant.id} className="text-xl font-semibold text-yellow-700">
                          {w.participant.name} ({w.votes} {w.votes === 1 ? 'voto' : 'votos'})
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            }
          })()}
        </div>
      </div>
    </div>
  );
}
