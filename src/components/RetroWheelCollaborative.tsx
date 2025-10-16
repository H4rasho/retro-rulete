'use client'

import {useState, useRef, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {Button} from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Textarea} from '@/components/ui/textarea'
import {
  RotateCw,
  Save,
  X,
  Clock,
  ListChecks,
  Users,
  Copy,
  Check,
  LogOut,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Plus,
} from 'lucide-react'
import {
  supabase,
  saveAnswer,
  finishSession,
  startTimer,
  stopTimer,
  addTimeToTimer,
  resetTimer,
  addCollectedHeart,
} from '@/lib/supabase'
import type {Session, Participant, Answer} from '@/types/database'
import { toast } from 'sonner'

const RETRO_QUESTIONS = [
  // Preguntas de Retrospectiva Profesional
  '✅ ¿Qué salió bien en este sprint?',
  '🔧 ¿Qué podemos mejorar?',
  '🚧 ¿Qué obstáculos enfrentamos?',
  '💡 ¿Qué aprendimos?',
  '⏰ ¿Qué nos hizo perder tiempo?',
  '🚀 ¿Qué debemos empezar a hacer?',
  '❤️ ¡Corazón de la Suerte!', // Premio especial 1
  '🛑 ¿Qué debemos dejar de hacer?',
  '🎯 ¿Se cumplieron los objetivos del sprint?',
  '⭐ ¿Qué nos sorprendió positivamente?',
  '😮 ¿Qué nos sorprendió negativamente?',
  '🛠️ ¿Qué herramientas nos ayudaron?',
  '⚠️ ¿Qué herramientas nos limitaron?',
  '❤️ ¡Corazón de la Suerte!', // Premio especial 2
  '🎉 ¿Qué celebramos como equipo?',

  // Preguntas Divertidas y Personales
  '🎬 Recomienda una película o serie',
  '🗣️ Cuenta un chisme (sin nombres si es comprometedor)',
  '💭 Responde lo que quieras',
  '😤 ¿Qué o quién te hizo enojar esta semana?',
  '❤️ ¡Corazón de la Suerte!', // Premio especial 3
  '🎵 ¿Qué canción no puedes dejar de escuchar?',
  '🏝️ Si pudieras viajar a cualquier lugar, ¿a dónde irías?',
  '🎯 ¿Cuál es tu superpoder secreto?',
  '🌟 ¿Qué te hace feliz últimamente?',
  '🍿 ¿Cuál es tu guilty pleasure?',
  '🐶 Muestra o describe a tu mascota (o la que te gustaría tener)',
  '🎁 Si ganaras la lotería, ¿qué harías primero?',
]

const COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E2',
  '#F8B195',
  '#F67280',
  '#C06C84',
  '#6C5B7B',
  '#355C7D',
  '#99B898',
  '#FECEAB',
  '#FF847C',
  '#E84A5F',
  '#2A363B',
]

interface Props {
  session: Session
  participant: Participant
}

export default function RetroWheelCollaborative({session, participant}: Props) {
  const router = useRouter()
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [myAnswers, setMyAnswers] = useState<Answer[]>([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [participantCount, setParticipantCount] = useState(1)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [copied, setCopied] = useState(false)
  const wheelRef = useRef<HTMLDivElement>(null)
  
  // Timer states
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [timerInputMinutes, setTimerInputMinutes] = useState(5)
  const [showTimerConfig, setShowTimerConfig] = useState(false)
  const timerSoundRef = useRef<HTMLAudioElement | null>(null)
  
  // Preguntas desordenadas para la vista (solo se calcula una vez)
  const [shuffledQuestions] = useState(() => {
    return [...RETRO_QUESTIONS].sort(() => Math.random() - 0.5)
  })

  // Cargar respuestas del participante actual
  useEffect(() => {
    const loadAnswers = async () => {
      const {data, error} = await supabase
        .from('answers')
        .select('*')
        .eq('participant_id', participant.id)
        .order('created_at', {ascending: false})

      if (!error && data) {
        setMyAnswers(data)
      }
    }

    loadAnswers()
  }, [participant.id])

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
          filter: `participant_id=eq.${participant.id}`,
        },
        payload => {
          setMyAnswers(prev => [payload.new as Answer, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [participant.id])

  // Cargar participantes
  useEffect(() => {
    const loadParticipants = async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', session.id)
        .order('joined_at', { ascending: true })

      if (!error && data) {
        setParticipants(data)
        setParticipantCount(data.length)
      }
    }

    loadParticipants()

    // Suscribirse a cambios en participantes
    const channel = supabase
      .channel(`session-${session.id}-participants`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${session.id}`,
        },
        loadParticipants
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id])

  const spinWheel = () => {
    if (isSpinning) return

    setIsSpinning(true)
    setSelectedQuestion(null)
    setCurrentAnswer('')

    const minSpins = 5
    const maxSpins = 10
    const spins = Math.random() * (maxSpins - minSpins) + minSpins
    const randomAngle = Math.random() * 360
    const totalRotation = rotation + spins * 360 + randomAngle

    setRotation(totalRotation)

    setTimeout(async () => {
      const normalizedRotation = totalRotation % 360
      const segmentAngle = 360 / RETRO_QUESTIONS.length
      const selectedIndex =
        Math.floor(
          (360 - normalizedRotation + segmentAngle / 2) / segmentAngle
        ) % RETRO_QUESTIONS.length
      const question = RETRO_QUESTIONS[selectedIndex]

      // Verificar si es un corazón de la suerte
      if (question.includes('❤️') || question.includes('Corazón')) {
        try {
          await addCollectedHeart(session.id, participant.id)
          toast.success('❤️ ¡Ganaste un Corazón de la Suerte!', {
            description: 'Se sumó a tu colección. ¡Sigue girando!',
            duration: 5000,
          })
          setIsSpinning(false)
          setSelectedQuestion(null)
        } catch (error) {
          console.error('Error adding heart:', error)
          toast.error('Error al agregar el corazón')
          setIsSpinning(false)
        }
      } else {
        setSelectedQuestion(question)
        setIsSpinning(false)
      }
    }, 4000)
  }

  const handleSaveAnswer = async () => {
    if (!selectedQuestion || !currentAnswer.trim()) return

    try {
      await saveAnswer(
        session.id,
        participant.id,
        selectedQuestion,
        currentAnswer.trim()
      )
      setCurrentAnswer('')
      setSelectedQuestion(null)
    } catch (error) {
      console.error('Error saving answer:', error)
      alert('Error al guardar la respuesta')
    }
  }

  const handleFinishSession = async () => {
    if (
      !confirm(
        '¿Estás seguro de que quieres finalizar la sesión? Todos verán los resultados.'
      )
    )
      return

    try {
      await finishSession(session.id)
      router.push(`/results/${session.code}`)
    } catch (error) {
      console.error('Error finishing session:', error)
      alert('Error al finalizar la sesión')
    }
  }

  const handleStartTimer = async () => {
    try {
      const durationInSeconds = timerInputMinutes * 60
      await startTimer(session.id, durationInSeconds)
      setShowTimerConfig(false)
      toast.success(`Timer iniciado: ${timerInputMinutes} minutos`)
    } catch (error) {
      console.error('Error starting timer:', error)
      toast.error('Error al iniciar el timer')
    }
  }

  const handleStopTimer = async () => {
    try {
      await stopTimer(session.id)
      toast.info('Timer pausado')
    } catch (error) {
      console.error('Error stopping timer:', error)
      toast.error('Error al pausar el timer')
    }
  }

  const handleAddTime = async (minutes: number) => {
    try {
      await addTimeToTimer(session.id, minutes * 60)
      toast.success(`+${minutes} minutos agregados`)
    } catch (error) {
      console.error('Error adding time:', error)
      toast.error('Error al agregar tiempo')
    }
  }

  const handleResetTimer = async () => {
    try {
      await resetTimer(session.id)
      toast.info('Timer reiniciado')
    } catch (error) {
      console.error('Error resetting timer:', error)
      toast.error('Error al reiniciar el timer')
    }
  }

  // Calculate remaining time
  useEffect(() => {
    if (!session.timer_is_active || !session.timer_started_at) {
      if (session.timer_duration > 0 && !session.timer_is_active) {
        setTimeRemaining(session.timer_duration)
      } else {
        setTimeRemaining(0)
      }
      return
    }

    const calculateTimeRemaining = () => {
      const startTime = new Date(session.timer_started_at!).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      const remaining = Math.max(0, session.timer_duration - elapsed)
      setTimeRemaining(remaining)

      // Timer finished
      if (remaining === 0 && session.timer_is_active) {
        // Play sound
        if (timerSoundRef.current) {
          timerSoundRef.current.play().catch(() => {})
        }
        
        // Show toast
        toast.error('⏰ ¡Tiempo terminado!', {
          duration: 5000,
          description: 'El tiempo de la sesión ha finalizado',
        })

        // Stop timer in database
        stopTimer(session.id).catch(console.error)
      }
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [session.timer_is_active, session.timer_started_at, session.timer_duration, session.id])

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const copySessionCode = () => {
    navigator.clipboard.writeText(session.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeaveSession = () => {
    if (confirm('¿Estás seguro de que quieres salir de la sesión?')) {
      localStorage.removeItem('sessionId')
      localStorage.removeItem('participantId')
      localStorage.removeItem('participantName')
      localStorage.removeItem('isModerator')
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 py-8">
      <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
        {/* Header with Session Info */}
        <Card className="border-2 border-purple-300 bg-white/80 backdrop-blur shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Title and User */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {session.name}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{participant.name}</span>
                    {participant.is_moderator && (
                      <Badge className="bg-purple-600 text-white text-xs px-2 py-0">Mod</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Center: Stats */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Participants */}
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="text-base font-semibold text-blue-700">{participantCount}</span>
                </div>

                {/* Code */}
                <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                  <span className="text-sm text-purple-600">Código:</span>
                  <span className="text-base font-bold text-purple-700">{session.code}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copySessionCode}
                    className="h-7 w-7 p-0 hover:bg-purple-100"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-purple-600" />
                    )}
                  </Button>
                </div>

                {/* Timer */}
                {timeRemaining > 0 && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-semibold text-base ${
                    timeRemaining <= 60 && session.timer_is_active
                      ? 'bg-red-50 border-red-300 text-red-700 animate-pulse'
                      : session.timer_is_active
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-yellow-50 border-yellow-300 text-yellow-700'
                  }`}>
                    <Timer className="h-5 w-5" />
                    {formatTime(timeRemaining)}
                  </div>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex flex-wrap gap-2">
                {participant.is_moderator && (
                  <>
                    <Button
                      onClick={() => setShowTimerConfig(!showTimerConfig)}
                      variant="outline"
                      size="sm"
                      className="text-sm"
                    >
                      <Timer className="h-4 w-4 mr-1.5" />
                      Timer
                    </Button>
                    <Button
                      onClick={handleFinishSession}
                      variant="destructive"
                      size="sm"
                      className="text-sm"
                    >
                      Finalizar
                    </Button>
                  </>
                )}
                <Button
                  onClick={handleLeaveSession}
                  variant="outline"
                  size="sm"
                  className="text-sm"
                >
                  <LogOut className="h-4 w-4 mr-1.5" />
                  Salir
                </Button>
              </div>
            </div>

            {/* Participants List */}
            {participants.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium">En línea:</span>
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                        p.id === participant.id
                          ? 'bg-purple-100 text-purple-700 border border-purple-300'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        p.id === participant.id ? 'bg-purple-500' : 'bg-gray-400'
                      }`} />
                      <span className="font-medium">{p.name}</span>
                      {p.is_moderator && (
                        <Badge className="bg-purple-600 text-white text-[10px] px-1 py-0 h-4">M</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timer Configuration Panel (Moderator Only) */}
        {participant.is_moderator && showTimerConfig && (
          <Card className="border-2 border-blue-300 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Configuración del Timer
              </CardTitle>
              <CardDescription>
                Controla el tiempo de la sesión. Todos los participantes verán el timer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Start Timer */}
              {!session.timer_is_active && timeRemaining === 0 && (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Duración (minutos)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={timerInputMinutes}
                      onChange={(e) => setTimerInputMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <Button onClick={handleStartTimer} className="bg-green-600 hover:bg-green-700">
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar
                  </Button>
                </div>
              )}

              {/* Timer Controls */}
              {(session.timer_is_active || timeRemaining > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
                    <div>
                      <p className="text-sm text-gray-600">Tiempo restante</p>
                      <p className="text-3xl font-bold text-gray-800">{formatTime(timeRemaining)}</p>
                    </div>
                    <div className="flex gap-2">
                      {session.timer_is_active ? (
                        <Button onClick={handleStopTimer} variant="outline" size="sm">
                          <Pause className="h-4 w-4 mr-1" />
                          Pausar
                        </Button>
                      ) : (
                        <Button onClick={() => startTimer(session.id, timeRemaining)} className="bg-green-600 hover:bg-green-700" size="sm">
                          <Play className="h-4 w-4 mr-1" />
                          Reanudar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Add Time Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => handleAddTime(1)} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      +1 min
                    </Button>
                    <Button onClick={() => handleAddTime(5)} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      +5 min
                    </Button>
                    <Button onClick={() => handleAddTime(10)} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      +10 min
                    </Button>
                    <Button onClick={handleResetTimer} variant="destructive" size="sm">
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reiniciar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                    transition: isSpinning
                      ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                      : 'none',
                  }}
                >
                  {RETRO_QUESTIONS.map((_, index) => {
                    const angle = (360 / RETRO_QUESTIONS.length) * index
                    const segmentAngle = 360 / RETRO_QUESTIONS.length

                    return (
                      <div
                        key={index}
                        className="absolute inset-0 origin-center"
                        style={{
                          transform: `rotate(${angle}deg)`,
                          clipPath: `polygon(50% 50%, 50% 0%, ${
                            50 + 50 * Math.sin((segmentAngle * Math.PI) / 180)
                          }% ${
                            50 - 50 * Math.cos((segmentAngle * Math.PI) / 180)
                          }%)`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      >
                        <div
                          className="absolute w-full text-center"
                          style={{
                            top: '25%',
                            left: '50%',
                            transform: `translateX(-50%) rotate(${
                              segmentAngle / 2
                            }deg)`,
                          }}
                        >
                          <span className="inline-block text-white font-semibold text-xs md:text-sm drop-shadow-lg bg-black/20 px-2 py-0.5 rounded">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Center Circle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 bg-gray-800 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                    <div className="text-white font-bold text-xl md:text-2xl">
                      ?
                    </div>
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
                <RotateCw
                  className={`mr-2 h-5 w-5 ${isSpinning ? 'animate-spin' : ''}`}
                />
                {isSpinning ? 'Girando...' : 'Girar la Ruleta'}
              </Button>
            </div>

            {/* Selected Question Display */}
            {selectedQuestion && (
              <Card className="w-full border-2 border-purple-500 shadow-lg animate-in fade-in slide-in-from-bottom-4">
                <CardHeader>
                  <CardTitle className="text-2xl text-purple-600">
                    Pregunta Seleccionada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xl font-semibold mb-4">
                    {selectedQuestion}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="answer"
                        className="text-sm font-medium text-gray-700"
                      >
                        Escribe tu respuesta:
                      </label>
                      <span className={`text-sm font-medium ${
                        currentAnswer.length > 750 
                          ? 'text-red-600' 
                          : currentAnswer.length > 600 
                          ? 'text-orange-600' 
                          : 'text-gray-500'
                      }`}>
                        {currentAnswer.length}/800
                      </span>
                    </div>
                    <Textarea
                      id="answer"
                      placeholder="Comparte tus pensamientos con el equipo..."
                      value={currentAnswer}
                      onChange={e => setCurrentAnswer(e.target.value)}
                      maxLength={800}
                      rows={8}
                      className="w-full resize-none text-base"
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
                          setSelectedQuestion(null)
                          setCurrentAnswer('')
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
                {shuffledQuestions.map((question, index) => {
                  // Encontrar el índice original para obtener el color correcto
                  const originalIndex = RETRO_QUESTIONS.indexOf(question)
                  
                  return (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-start gap-2"
                    >
                      <Badge
                        className="shrink-0 mt-0.5"
                        style={{backgroundColor: COLORS[originalIndex % COLORS.length]}}
                      >
                        {originalIndex + 1}
                      </Badge>
                      <span className="text-sm">{question}</span>
                    </div>
                  )
                })}
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
                    {myAnswers.length}{' '}
                    {myAnswers.length === 1
                      ? 'respuesta guardada'
                      : 'respuestas guardadas'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                  {myAnswers.map(item => (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-purple-900 text-sm">
                          {item.question}
                        </p>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {new Date(item.created_at).toLocaleTimeString(
                            'es-ES',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
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
      {/* Hidden audio for timer alert */}
      <audio ref={timerSoundRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuFzvLZijoIHWm98OWhUBEPVqzn77BgGQk8j" preload="auto" />
    </div>
  )
}
