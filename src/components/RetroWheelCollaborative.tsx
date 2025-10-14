"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RotateCw, Save, X, Clock, ListChecks, Users, Copy, Check, LogOut } from "lucide-react";
import { supabase, saveAnswer, finishSession, getParticipantCount } from "@/lib/supabase";
import type { Session, Participant, Answer } from "@/types/database";

const RETRO_QUESTIONS = [
  "¿Qué salió bien en este sprint?",
  "¿Qué podemos mejorar?",
  "¿Qué obstáculos enfrentamos?",
  "¿Qué aprendimos?",
  "¿Qué nos hizo perder tiempo?",
  "¿Qué debemos empezar a hacer?",
  "¿Qué debemos dejar de hacer?",
  "¿Qué debemos continuar haciendo?",
  "¿Cómo fue la comunicación del equipo?",
  "¿Se cumplieron los objetivos del sprint?",
  "¿Qué nos sorprendió positivamente?",
  "¿Qué nos sorprendió negativamente?",
  "¿Cómo podemos ser más eficientes?",
  "¿Qué herramientas nos ayudaron?",
  "¿Qué herramientas nos limitaron?",
  "¿Hubo buena colaboración?",
  "¿Las estimaciones fueron precisas?",
  "¿Qué celebramos como equipo?",
];

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B195", "#F67280",
  "#C06C84", "#6C5B7B", "#355C7D", "#99B898", "#FECEAB",
  "#FF847C", "#E84A5F", "#2A363B"
];

interface Props {
  session: Session;
  participant: Participant;
}

export default function RetroWheelCollaborative({ session, participant }: Props) {
  const router = useRouter();
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [myAnswers, setMyAnswers] = useState<Answer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [participantCount, setParticipantCount] = useState(1);
  const [copied, setCopied] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Cargar respuestas del participante actual
  useEffect(() => {
    const loadAnswers = async () => {
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .eq('participant_id', participant.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMyAnswers(data);
      }
    };

    loadAnswers();
  }, [participant.id]);

  // Suscribirse a nuevas respuestas del participante
  useEffect(() => {
    const channel = supabase
      .channel(`participant-${participant.id}-answers`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'answers',
          filter: `participant_id=eq.${participant.id}`
        },
        (payload) => {
          setMyAnswers((prev) => [payload.new as Answer, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [participant.id]);

  // Contar participantes
  useEffect(() => {
    const loadCount = async () => {
      const count = await getParticipantCount(session.id);
      setParticipantCount(count);
    };

    loadCount();

    // Suscribirse a cambios en participantes
    const channel = supabase
      .channel(`session-${session.id}-participants`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${session.id}`
        },
        () => {
          loadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.id]);

  const spinWheel = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setSelectedQuestion(null);
    setCurrentAnswer("");

    const minSpins = 5;
    const maxSpins = 10;
    const spins = Math.random() * (maxSpins - minSpins) + minSpins;
    const randomAngle = Math.random() * 360;
    const totalRotation = rotation + (spins * 360) + randomAngle;

    setRotation(totalRotation);

    setTimeout(() => {
      const normalizedRotation = totalRotation % 360;
      const segmentAngle = 360 / RETRO_QUESTIONS.length;
      const selectedIndex = Math.floor((360 - normalizedRotation + segmentAngle / 2) / segmentAngle) % RETRO_QUESTIONS.length;
      const question = RETRO_QUESTIONS[selectedIndex];
      
      setSelectedQuestion(question);
      setIsSpinning(false);
    }, 4000);
  };

  const handleSaveAnswer = async () => {
    if (!selectedQuestion || !currentAnswer.trim()) return;

    try {
      await saveAnswer(session.id, participant.id, selectedQuestion, currentAnswer.trim());
      setCurrentAnswer("");
      setSelectedQuestion(null);
    } catch (error) {
      console.error('Error saving answer:', error);
      alert('Error al guardar la respuesta');
    }
  };

  const handleFinishSession = async () => {
    if (!confirm('¿Estás seguro de que quieres finalizar la sesión? Todos los participantes perderán acceso.')) {
      return;
    }

    try {
      await finishSession(session.id);
      router.push(`/moderator/${session.code}`);
    } catch (error) {
      console.error('Error finishing session:', error);
      alert('Error al finalizar la sesión');
    }
  };

  const copySessionCode = () => {
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveSession = () => {
    if (confirm('¿Estás seguro de que quieres salir de la sesión?')) {
      localStorage.removeItem('sessionId');
      localStorage.removeItem('participantId');
      localStorage.removeItem('participantName');
      localStorage.removeItem('isModerator');
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 py-8">
      <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
        {/* Header with Session Info */}
        <Card className="border-2 border-purple-300 bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {session.name}
                </h1>
                <p className="text-gray-600 mt-1">
                  Participante: <span className="font-semibold">{participant.name}</span>
                  {participant.is_moderator && <Badge className="ml-2 bg-purple-600">Moderador</Badge>}
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                  <Users className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">{participantCount} participantes</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="bg-purple-100 px-4 py-2 rounded-lg">
                    <span className="text-xs text-gray-600">Código:</span>
                    <span className="ml-2 text-lg font-bold text-purple-700">{session.code}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copySessionCode}
                    className="h-10"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                {participant.is_moderator && (
                  <Button
                    onClick={handleFinishSession}
                    variant="destructive"
                    size="sm"
                  >
                    Finalizar Sesión
                  </Button>
                )}

                <Button
                  onClick={handleLeaveSession}
                  variant="outline"
                  size="sm"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Salir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Wheel Section */}
          <div className="lg:col-span-2 flex flex-col items-center space-y-6">
            <div className="relative">
              {/* Arrow Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-10">
                <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-red-500 drop-shadow-lg" />
              </div>

              {/* Wheel Container */}
              <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] lg:w-[500px] lg:h-[500px]">
                <div
                  ref={wheelRef}
                  className="absolute inset-0 rounded-full border-8 border-gray-800 shadow-2xl overflow-hidden"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                  }}
                >
                  {RETRO_QUESTIONS.map((_, index) => {
                    const angle = (360 / RETRO_QUESTIONS.length) * index;
                    const segmentAngle = 360 / RETRO_QUESTIONS.length;
                    
                    return (
                      <div
                        key={index}
                        className="absolute inset-0 origin-center"
                        style={{
                          transform: `rotate(${angle}deg)`,
                          clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((segmentAngle * Math.PI) / 180)}% ${50 - 50 * Math.cos((segmentAngle * Math.PI) / 180)}%)`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      >
                        <div
                          className="absolute top-[15%] left-1/2 -translate-x-1/2 text-center text-white font-semibold text-xs md:text-sm px-2"
                          style={{
                            transform: `rotate(${segmentAngle / 2}deg)`,
                            width: "80%",
                          }}
                        >
                          {index + 1}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Center Circle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 bg-gray-800 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                    <div className="text-white font-bold text-xl md:text-2xl">?</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={spinWheel}
                disabled={isSpinning}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold px-8 py-6 text-lg"
              >
                <RotateCw className={`mr-2 h-5 w-5 ${isSpinning ? 'animate-spin' : ''}`} />
                {isSpinning ? "Girando..." : "Girar la Ruleta"}
              </Button>
            </div>

            {/* Selected Question Display */}
            {selectedQuestion && (
              <Card className="w-full border-2 border-purple-500 shadow-lg animate-in fade-in slide-in-from-bottom-4">
                <CardHeader>
                  <CardTitle className="text-2xl text-purple-600">Pregunta Seleccionada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xl font-semibold mb-4">{selectedQuestion}</p>
                  
                  <div className="space-y-3">
                    <label htmlFor="answer" className="text-sm font-medium text-gray-700">
                      Escribe tu respuesta:
                    </label>
                    <Textarea
                      id="answer"
                      placeholder="Comparte tus pensamientos con el equipo..."
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      rows={4}
                      className="w-full resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveAnswer}
                        disabled={!currentAnswer.trim()}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Respuesta
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedQuestion(null);
                          setCurrentAnswer("");
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Omitir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Question List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Preguntas Disponibles
                </CardTitle>
                <CardDescription>
                  {RETRO_QUESTIONS.length} preguntas de retrospectiva
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto space-y-2">
                {RETRO_QUESTIONS.map((question, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-start gap-2"
                  >
                    <Badge
                      className="shrink-0 mt-0.5"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    >
                      {index + 1}
                    </Badge>
                    <span className="text-sm">{question}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* My Answers History */}
            {myAnswers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Mis Respuestas
                  </CardTitle>
                  <CardDescription>
                    {myAnswers.length} {myAnswers.length === 1 ? 'respuesta guardada' : 'respuestas guardadas'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                  {myAnswers.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-purple-900 text-sm">
                          {item.question}
                        </p>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {new Date(item.created_at).toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Badge>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-sm text-gray-700">{item.answer}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
