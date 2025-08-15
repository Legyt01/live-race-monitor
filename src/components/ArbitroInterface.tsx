import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Categoria, 
  ArbitroId, 
  CATEGORIAS, 
  CompetitionResult, 
  PuntosResult, 
  FutbolResult, 
  TiempoResult,
  TIME_CATEGORIES
} from '@/types/competition';
import { Plus, Send, Users, Trophy, Edit3, Target, Clock, Award } from 'lucide-react';

interface ArbitroInterfaceProps {
  arbitroId: ArbitroId;
  publishRoster: (categoria: Categoria, equipos: { equipo_id: string; equipo_nombre: string }[]) => void;
  publishResult: (result: CompetitionResult) => void;
  getTeamsForCategory: (categoria: Categoria) => any[];
}

// Format time as min:sec
const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = (timeInSeconds % 60).toFixed(3);
  return `${minutes}:${seconds.padStart(6, '0')}`;
};

const ArbitroInterface = ({ arbitroId, publishRoster, publishResult, getTeamsForCategory }: ArbitroInterfaceProps) => {
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

  // Load teams from localStorage for this category
  useEffect(() => {
    const saved = localStorage.getItem(`teams_${categoria}`);
    if (saved) {
      const teams = JSON.parse(saved);
      setEquipos(teams);
      publishRoster(categoria, teams);
    }
  }, [categoria, publishRoster]);

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
    
    // Save to localStorage
    localStorage.setItem(`teams_${categoria}`, JSON.stringify(updatedEquipos));
    
    // Publish roster immediately
    publishRoster(categoria, updatedEquipos);
    
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
          categoria,
          arbitro_id: arbitroId,
          equipo_id: selectedTeam,
          victorias: parseInt(victorias),
          empates: parseInt(empates),
          derrotas: parseInt(derrotas),
          goles_favor: parseInt(golesFavor),
          goles_contra: parseInt(golesContra)
        } as FutbolResult;
      } else if (TIME_CATEGORIES.includes(categoria)) {
        if (!tiempoS) {
          throw new Error("El tiempo es obligatorio");
        }
        
        result = {
          categoria,
          arbitro_id: arbitroId,
          equipo_id: selectedTeam,
          tiempo_s: parseFloat(tiempoS)
        } as TiempoResult;
      } else {
        if (!puntos) {
          throw new Error("Los puntos son obligatorios");
        }
        
        result = {
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

  // Clear teams when changing categoria
  useEffect(() => {
    setSelectedTeam('');
  }, [categoria]);

  // Get current teams and their results
  const currentTeams = getTeamsForCategory(categoria);
  const hasTeams = equipos.length > 0;

  const renderResultForm = () => {
    if (categoria === 'futbol_rc') {
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
              className="bg-background"
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
              className="bg-background"
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
              className="bg-background"
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
              className="bg-background"
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
              className="bg-background"
            />
          </div>
        </div>
      );
    }
    
    if (TIME_CATEGORIES.includes(categoria)) {
      return (
        <div>
          <Label htmlFor="tiempo" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tiempo (segundos)
          </Label>
          <Input
            id="tiempo"
            type="number"
            step="0.001"
            min="0"
            value={tiempoS}
            onChange={(e) => setTiempoS(e.target.value)}
            placeholder="0.000"
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Se mostrará en formato min:seg
          </p>
        </div>
      );
    }
    
    return (
      <div>
        <Label htmlFor="puntos" className="flex items-center gap-2">
          <Award className="h-4 w-4" />
          Puntos
        </Label>
        <Input
          id="puntos"
          type="number"
          min="0"
          value={puntos}
          onChange={(e) => setPuntos(e.target.value)}
          placeholder="0"
          className="bg-background"
        />
      </div>
    );
  };

  const renderResultsTable = () => {
    if (currentTeams.length === 0) return null;

    const getColumns = () => {
      switch (categoria) {
        case 'futbol_rc':
          return ['Equipo', 'V', 'E', 'D', 'GF', 'GC', 'PTS'];
        case 'velocitas':
        case 'rally':
        case 'barcos':
          return ['Equipo', 'Tiempo'];
        default:
          return ['Equipo', 'Puntos'];
      }
    };

    const renderTableCell = (team: any, column: string) => {
      switch (column) {
        case 'Equipo':
          return team.equipo?.equipo_nombre || team.equipo_id;
        case 'V':
          return team.victorias || 0;
        case 'E':
          return team.empates || 0;
        case 'D':
          return team.derrotas || 0;
        case 'GF':
          return team.goles_favor || 0;
        case 'GC':
          return team.goles_contra || 0;
        case 'PTS':
          return team.pts_calculados || 0;
        case 'Tiempo':
          return team.tiempo_s ? formatTime(team.tiempo_s) : '-';
        case 'Puntos':
          return team.puntos || 0;
        default:
          return '-';
      }
    };

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-meta-red" />
            Resultados Actuales - {CATEGORIAS[categoria]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                {getColumns().map((column) => (
                  <TableHead key={column} className="font-semibold">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTeams.map((team, index) => (
                <TableRow key={team.equipo?.equipo_id || team.equipo_id}>
                  <TableCell>
                    <Badge variant="secondary" className="font-bold">
                      {index + 1}
                    </Badge>
                  </TableCell>
                  {getColumns().map((column) => (
                    <TableCell key={column}>
                      {renderTableCell(team, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Users className="h-6 w-6 text-meta-red" />
          {arbitroId.toUpperCase()} - Panel de Control
        </h2>
        <p className="text-muted-foreground">Gestiona equipos y registra resultados en tiempo real</p>
      </div>

      {/* Configuration Section */}
      <Card className="bg-gradient-to-br from-meta-red/5 to-meta-orange/5 border-meta-red/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-meta-red" />
            Configuración de Competencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="categoria">Categoría</Label>
            <Select value={categoria} onValueChange={(value) => setCategoria(value as Categoria)}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORIAS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="w-fit border-meta-red text-meta-red">
            {CATEGORIAS[categoria]}
          </Badge>
        </CardContent>
      </Card>

      {/* Team Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-meta-orange" />
            Gestión de Equipos
          </CardTitle>
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
                className="bg-background"
              />
            </div>
            <div>
              <Label htmlFor="team-name">Nombre del Equipo</Label>
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Nombre del equipo"
                className="bg-background"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={addTeam} 
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
          
          {hasTeams && (
            <div>
              <Label>Equipos Registrados ({equipos.length})</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {equipos.map((equipo) => (
                  <Badge key={equipo.equipo_id} variant="secondary" className="bg-meta-red/10 text-meta-red border-meta-red/20">
                    {equipo.equipo_nombre}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Submission - Always visible */}
      <Card className="bg-gradient-to-br from-meta-purple/5 to-meta-green/5 border-meta-purple/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-meta-purple" />
            Registrar Resultados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasTeams ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Primero agrega equipos</p>
              <p className="text-sm">Necesitas registrar al menos un equipo para poder agregar resultados</p>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="team-select">Seleccionar Equipo</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="bg-background">
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
              
              <Button 
                onClick={submitResult} 
                className="w-full bg-gradient-to-r from-meta-green to-meta-purple hover:opacity-90"
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar Resultado
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      {renderResultsTable()}
    </div>
  );
};

export default ArbitroInterface;