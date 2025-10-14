"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Plus, LogIn } from "lucide-react";
import { createSession, joinSession } from "@/lib/supabase";

export default function SessionLobby() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para crear sesión
  const [sessionName, setSessionName] = useState("");
  const [moderatorName, setModeratorName] = useState("");

  // Estado para unirse a sesión
  const [sessionCode, setSessionCode] = useState("");
  const [participantName, setParticipantName] = useState("");

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { session, participant } = await createSession(sessionName, moderatorName);
      
      // Guardar en localStorage
      localStorage.setItem('sessionId', session.id);
      localStorage.setItem('participantId', participant.id);
      localStorage.setItem('participantName', participant.name);
      localStorage.setItem('isModerator', 'true');
      
      // Redirigir a la sesión
      router.push(`/session/${session.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { session, participant } = await joinSession(sessionCode, participantName);
      
      // Guardar en localStorage
      localStorage.setItem('sessionId', session.id);
      localStorage.setItem('participantId', participant.id);
      localStorage.setItem('participantName', participant.name);
      localStorage.setItem('isModerator', 'false');
      
      // Redirigir a la sesión
      router.push(`/session/${session.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al unirse a la sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 py-16 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Ruleta de Retrospectiva
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Colabora en tiempo real con tu equipo. Crea una sesión o únete a una existente.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Create Session Card */}
          <Card className="border-2 border-purple-200 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Plus className="h-6 w-6 text-purple-600" />
                Crear Nueva Sesión
              </CardTitle>
              <CardDescription className="text-base">
                Inicia una nueva retrospectiva como moderador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="sessionName" className="text-sm font-medium">
                    Nombre de la Sesión
                  </label>
                  <Input
                    id="sessionName"
                    placeholder="Sprint 15 - Retrospectiva"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="moderatorName" className="text-sm font-medium">
                    Tu Nombre
                  </label>
                  <Input
                    id="moderatorName"
                    placeholder="Juan Pérez"
                    value={moderatorName}
                    onChange={(e) => setModeratorName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-6"
                  disabled={loading}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {loading ? 'Creando...' : 'Crear Sesión'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Join Session Card */}
          <Card className="border-2 border-blue-200 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <LogIn className="h-6 w-6 text-blue-600" />
                Unirse a Sesión
              </CardTitle>
              <CardDescription className="text-base">
                Únete a una retrospectiva existente con un código
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinSession} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="sessionCode" className="text-sm font-medium">
                    Código de Sesión
                  </label>
                  <Input
                    id="sessionCode"
                    placeholder="ABC123"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    required
                    disabled={loading}
                    className="text-center text-2xl font-bold tracking-wider"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="participantName" className="text-sm font-medium">
                    Tu Nombre
                  </label>
                  <Input
                    id="participantName"
                    placeholder="María García"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-lg py-6"
                  disabled={loading}
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  {loading ? 'Uniéndose...' : 'Unirse a Sesión'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white rounded-lg shadow-md">
              <Users className="h-10 w-10 mx-auto mb-3 text-purple-600" />
              <h3 className="font-semibold mb-2">Colaboración Real</h3>
              <p className="text-sm text-gray-600">
                Todos los participantes trabajan simultáneamente
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-md">
              <div className="text-4xl mb-3">🎡</div>
              <h3 className="font-semibold mb-2">Ruleta Individual</h3>
              <p className="text-sm text-gray-600">
                Cada participante tiene su propia ruleta
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-md">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-semibold mb-2">Vista de Moderador</h3>
              <p className="text-sm text-gray-600">
                El moderador ve todas las respuestas en tiempo real
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
