import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Jornada, 
  Categoria, 
  ArbitroId, 
  CATEGORIAS, 
  JORNADAS, 
  CompetitionResult, 
  PuntosResult, 
  FutbolResult, 
  VelocitasResult 
} from '@/types/competition';
import { Plus, Send, Users, Trophy } from 'lucide-react';

interface ArbitroInterfaceProps {
  arbitroId: ArbitroId;
  publishRoster: (jornada: Jornada, categoria: Categoria, equipos: { equipo_id: string; equipo_nombre: string }[]) => void;
  publishResult: (result: CompetitionResult) => void;
}

const ArbitroInterface = ({ arbitroId, publishRoster, publishResult }: ArbitroInterfaceProps) => {
  const [jornada, setJornada] = useState<Jornada>('manana');
  const [categoria, setCategoria] = useState<Categoria>('zumo_rc');
  const [equipos, setEquipos] = useState<{ equipo_id: string; equipo_nombre: string }[]>([]);
  const [newTeamId, setNewTeamId] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  
  // Result form states
  const [puntos, setPuntos] = useState('');
  const [victorias, setVictorias] = useState('');
  const [empates, setEmpates] = useState('');
  const [derrotas, setDerrotas] = useState('');
  const [golesFavor, setGolesFavor] = useState('');
  const [golesContra, setGolesContra] = useState('');
  const [tiempoS, setTiempoS] = useState('');

  const { toast } = useToast();

  const addTeam = () => {
    if (!newTeamId.trim() || !newTeamName.trim()) {
      toast({
        title: "Error",
        description: "ID y nombre del equipo son obligatorios",
        variant: "destructive"
      });
      return;
    }

    if (equipos.some(e => e.equipo_id === newTeamId.trim())) {
      toast({
        title: "Error",
        description: "Ya existe un equipo con ese ID",
        variant: "destructive"
      });
      return;
    }

    const newTeam = {
      equipo_id: newTeamId.trim(),
      equipo_nombre: newTeamName.trim()
    };

    const updatedEquipos = [...equipos, newTeam];
    setEquipos(updatedEquipos);
    
    // Publish roster immediately
    publishRoster(jornada, categoria, updatedEquipos);
    
    setNewTeamId('');
    setNewTeamName('');
    
    toast({
      title: "Equipo agregado",
      description: `${newTeam.equipo_nombre} agregado exitosamente`
    });
  };

  const submitResult = () => {
    if (!selectedTeam) {
      toast({
        title: "Error",
        description: "Selecciona un equipo",
        variant: "destructive"
      });
      return;
    }

    let result: CompetitionResult;

    try {
      if (categoria === 'futbol_rc') {
        if (!victorias || !empates || !derrotas || !golesFavor || !golesContra) {
          throw new Error("Todos los campos de fútbol son obligatorios");
        }
        
        result = {
          jornada,
          categoria,
          arbitro_id: arbitroId,
          equipo_id: selectedTeam,
          victorias: parseInt(victorias),
          empates: parseInt(empates),
          derrotas: parseInt(derrotas),
          goles_favor: parseInt(golesFavor),
          goles_contra: parseInt(golesContra)
        } as FutbolResult;
      } else if (categoria === 'velocitas') {
        if (!tiempoS) {
          throw new Error("El tiempo es obligatorio");
        }
        
        result = {
          jornada,
          categoria,
          arbitro_id: arbitroId,
          equipo_id: selectedTeam,
          tiempo_s: parseFloat(tiempoS)
        } as VelocitasResult;
      } else {
        if (!puntos) {
          throw new Error("Los puntos son obligatorios");
        }
        
        result = {
          jornada,
          categoria,
          arbitro_id: arbitroId,
          equipo_id: selectedTeam,
          puntos: parseInt(puntos)
        } as PuntosResult;
      }

      publishResult(result);
      
      // Clear form
      setPuntos('');
      setVictorias('');
      setEmpates('');
      setDerrotas('');
      setGolesFavor('');
      setGolesContra('');
      setTiempoS('');
      setSelectedTeam('');
      
      toast({
        title: "Resultado enviado",
        description: "El resultado se ha registrado exitosamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al enviar resultado",
        variant: "destructive"
      });
    }
  };

  // Clear teams when changing jornada or categoria
  useEffect(() => {
    setEquipos([]);
  }, [jornada, categoria]);

  const renderResultForm = () => {
    switch (categoria) {
      case 'futbol_rc':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="victorias">Victorias</Label>
              <Input
                id="victorias"
                type="number"
                min="0"
                value={victorias}
                onChange={(e) => setVictorias(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="empates">Empates</Label>
              <Input
                id="empates"
                type="number"
                min="0"
                value={empates}
                onChange={(e) => setEmpates(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="derrotas">Derrotas</Label>
              <Input
                id="derrotas"
                type="number"
                min="0"
                value={derrotas}
                onChange={(e) => setDerrotas(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="goles-favor">Goles a Favor</Label>
              <Input
                id="goles-favor"
                type="number"
                min="0"
                value={golesFavor}
                onChange={(e) => setGolesFavor(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="goles-contra">Goles en Contra</Label>
              <Input
                id="goles-contra"
                type="number"
                min="0"
                value={golesContra}
                onChange={(e) => setGolesContra(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        );
      
      case 'velocitas':
        return (
          <div>
            <Label htmlFor="tiempo">Tiempo (segundos)</Label>
            <Input
              id="tiempo"
              type="number"
              step="0.001"
              min="0"
              value={tiempoS}
              onChange={(e) => setTiempoS(e.target.value)}
              placeholder="0.000"
            />
          </div>
        );
      
      default:
        return (
          <div>
            <Label htmlFor="puntos">Puntos</Label>
            <Input
              id="puntos"
              type="number"
              min="0"
              value={puntos}
              onChange={(e) => setPuntos(e.target.value)}
              placeholder="0"
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          {arbitroId.toUpperCase()} - Panel de Control
        </h2>
        <p className="text-muted-foreground">Gestiona equipos y registra resultados</p>
      </div>

      {/* Configuration Section */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Configuración de Competencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jornada">Jornada</Label>
              <Select value={jornada} onValueChange={(value) => setJornada(value as Jornada)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(JORNADAS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="categoria">Categoría</Label>
              <Select value={categoria} onValueChange={(value) => setCategoria(value as Categoria)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIAS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Badge variant="outline" className="w-fit">
            {JORNADAS[jornada]} - {CATEGORIAS[categoria]}
          </Badge>
        </CardContent>
      </Card>

      {/* Team Management */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Equipos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="team-id">ID del Equipo</Label>
              <Input
                id="team-id"
                value={newTeamId}
                onChange={(e) => setNewTeamId(e.target.value)}
                placeholder="team-01"
              />
            </div>
            <div>
              <Label htmlFor="team-name">Nombre del Equipo</Label>
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Nombre del equipo"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addTeam} className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
          
          {equipos.length > 0 && (
            <div>
              <Label>Equipos Registrados ({equipos.length})</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {equipos.map((equipo) => (
                  <Badge key={equipo.equipo_id} variant="secondary">
                    {equipo.equipo_nombre}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Submission */}
      {equipos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar Resultado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="team-select">Seleccionar Equipo</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un equipo" />
                </SelectTrigger>
                <SelectContent>
                  {equipos.map((equipo) => (
                    <SelectItem key={equipo.equipo_id} value={equipo.equipo_id}>
                      {equipo.equipo_nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            {renderResultForm()}
            
            <Button onClick={submitResult} className="w-full bg-gradient-to-r from-primary to-accent">
              <Send className="h-4 w-4 mr-2" />
              Enviar Resultado
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ArbitroInterface;