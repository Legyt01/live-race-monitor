import { useState, useEffect } from 'react';
import { ArbitroId, Categoria, CompetitionResult, TeamData } from '@/types/competition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Trophy, Clock, Target, Users, Trash2, Plus, Send } from 'lucide-react';
import { useArbitroData } from '@/hooks/useArbitroData';

// Fixed mapping of ArbitroId to Categoria
const ARBITRO_CATEGORIA: { [key in ArbitroId]: Categoria } = {
  'arb1': 'sumo_rc',
  'arb2': 'sumo_autonomo',
  'arb3': 'futbol_rc',
  'arb4': 'velocitas',
  'arb5': 'rally',
  'arb6': 'barcos'
};

const CATEGORIAS: { [key: string]: string } = {
  'sumo_rc': 'Sumo RC',
  'sumo_autonomo': 'Sumo Autónomo',
  'futbol_rc': 'Fútbol RC',
  'velocitas': 'Velocitas',
  'rally': 'Rally',
  'barcos': 'Barcos RC'
};

interface ArbitroInterfaceProps {
  arbitroId: ArbitroId;
  publishRoster: (categoria: Categoria, equipos: { equipo_id: string; equipo_nombre: string }[], arbitroId?: string) => void;
  publishResult: (result: CompetitionResult, arbitroId?: string) => void;
  getTeamsForCategory: (categoria: Categoria) => TeamData[];
}

const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = (timeInSeconds % 60).toFixed(2);
  return `${minutes}:${seconds.padStart(5, '0')}`;
};

const ArbitroInterface = ({ arbitroId, publishRoster, publishResult }: ArbitroInterfaceProps) => {
  const categoria = ARBITRO_CATEGORIA[arbitroId];
  const { equipos, results, addTeam, deleteTeam, saveResult } = useArbitroData(arbitroId);
  
  // Form states
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

  // Notify WebSocket system when teams change
  useEffect(() => {
    if (equipos.length > 0) {
      publishRoster(categoria, equipos, arbitroId);
    }
  }, [equipos, categoria, arbitroId, publishRoster]);

  const handleAddTeam = () => {
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

    addTeam(newTeam);
    setNewTeamId('');
    setNewTeamName('');
    
    toast({
      title: "Equipo agregado",
      description: `${newTeam.equipo_nombre} agregado exitosamente`
    });
  };

  const handleDeleteTeam = (equipoId: string) => {
    const team = equipos.find(e => e.equipo_id === equipoId);
    if (team) {
      deleteTeam(equipoId);
      if (selectedTeam === equipoId) {
        setSelectedTeam('');
      }
      toast({
        title: "Equipo eliminado",
        description: `${team.equipo_nombre} eliminado exitosamente`
      });
    }
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

    if (categoria === 'futbol_rc') {
      const v = parseInt(victorias) || 0;
      const e = parseInt(empates) || 0;
      const d = parseInt(derrotas) || 0;
      const gf = parseInt(golesFavor) || 0;
      const gc = parseInt(golesContra) || 0;

      result = {
        categoria,
        arbitro_id: arbitroId,
        equipo_id: selectedTeam,
        victorias: v,
        empates: e,
        derrotas: d,
        goles_favor: gf,
        goles_contra: gc,
      };
    } else if (['velocitas', 'rally', 'barcos'].includes(categoria)) {
      const tiempo = parseFloat(tiempoS);
      if (isNaN(tiempo) || tiempo <= 0) {
        toast({
          title: "Error",
          description: "Ingresa un tiempo válido",
          variant: "destructive"
        });
        return;
      }

      result = {
        categoria,
        arbitro_id: arbitroId,
        equipo_id: selectedTeam,
        tiempo_s: tiempo,
      };
    } else {
      const pts = parseInt(puntos);
      if (isNaN(pts) || pts < 0) {
        toast({
          title: "Error", 
          description: "Ingresa puntos válidos",
          variant: "destructive"
        });
        return;
      }

      result = {
        categoria,
        arbitro_id: arbitroId,
        equipo_id: selectedTeam,
        puntos: pts,
      };
    }

    saveResult(result);
    publishResult(result, arbitroId);

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
      title: "Resultado guardado",
      description: "Resultado enviado exitosamente"
    });
  };

  const renderResultForm = () => {
    if (categoria === 'futbol_rc') {
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Victorias</label>
            <Input
              type="number"
              min="0"
              value={victorias}
              onChange={(e) => setVictorias(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Empates</label>
            <Input
              type="number"
              min="0"
              value={empates}
              onChange={(e) => setEmpates(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Derrotas</label>
            <Input
              type="number"
              min="0"
              value={derrotas}
              onChange={(e) => setDerrotas(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Goles a favor</label>
            <Input
              type="number"
              min="0"
              value={golesFavor}
              onChange={(e) => setGolesFavor(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Goles en contra</label>
            <Input
              type="number"
              min="0"
              value={golesContra}
              onChange={(e) => setGolesContra(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      );
    } else if (['velocitas', 'rally', 'barcos'].includes(categoria)) {
      return (
        <div>
          <label className="text-sm font-medium mb-2 block">Tiempo (segundos)</label>
          <Input
            type="number"
            step="0.001"
            min="0"
            value={tiempoS}
            onChange={(e) => setTiempoS(e.target.value)}
            placeholder="0.000"
          />
        </div>
      );
    } else {
      return (
        <div>
          <label className="text-sm font-medium mb-2 block">Puntos</label>
          <Input
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

  const renderResultsTable = () => {
    if (results.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No hay resultados aún
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pos</TableHead>
            <TableHead>Equipo</TableHead>
            {categoria === 'futbol_rc' ? (
              <>
                <TableHead>V</TableHead>
                <TableHead>E</TableHead>
                <TableHead>D</TableHead>
                <TableHead>GF</TableHead>
                <TableHead>GC</TableHead>
                <TableHead>Pts</TableHead>
              </>
            ) : ['velocitas', 'rally', 'barcos'].includes(categoria) ? (
              <TableHead>Tiempo</TableHead>
            ) : (
              <TableHead>Puntos</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((team) => (
            <TableRow key={team.equipo.equipo_id}>
              <TableCell>
                <Badge variant={team.position === 1 ? "default" : "secondary"}>
                  {team.position}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {team.equipo.equipo_nombre}
              </TableCell>
              {categoria === 'futbol_rc' ? (
                <>
                  <TableCell>{team.victorias || 0}</TableCell>
                  <TableCell>{team.empates || 0}</TableCell>
                  <TableCell>{team.derrotas || 0}</TableCell>
                  <TableCell>{team.goles_favor || 0}</TableCell>
                  <TableCell>{team.goles_contra || 0}</TableCell>
                  <TableCell className="font-bold">{team.pts_calculados || 0}</TableCell>
                </>
              ) : ['velocitas', 'rally', 'barcos'].includes(categoria) ? (
                <TableCell className="font-bold">
                  {team.tiempo_s ? formatTime(team.tiempo_s) : '-'}
                </TableCell>
              ) : (
                <TableCell className="font-bold">{team.puntos || 0}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const getCategoryIcon = () => {
    switch (categoria) {
      case 'futbol_rc':
        return <Trophy className="h-5 w-5" />;
      case 'velocitas':
      case 'rally':
      case 'barcos':
        return <Clock className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Category Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getCategoryIcon()}
            <span>Categoría: {CATEGORIAS[categoria]}</span>
            <Badge variant="outline" className="ml-auto">
              {arbitroId.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Team Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Equipos ({equipos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="ID del equipo"
              value={newTeamId}
              onChange={(e) => setNewTeamId(e.target.value)}
            />
            <Input
              placeholder="Nombre del equipo"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
            />
            <Button onClick={handleAddTeam} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Equipo
            </Button>
          </div>
          
          {equipos.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Equipos registrados:</h4>
              <div className="space-y-2">
                {equipos.map((equipo) => (
                  <div key={equipo.equipo_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">{equipo.equipo_nombre}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        (ID: {equipo.equipo_id})
                      </span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTeam(equipo.equipo_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Resultados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Seleccionar Equipo</label>
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

            {renderResultForm()}

            <Button onClick={submitResult} className="w-full" disabled={!selectedTeam}>
              <Send className="h-4 w-4 mr-2" />
              Enviar Resultado
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Resultados Actuales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderResultsTable()}
        </CardContent>
      </Card>
    </div>
  );
};

export default ArbitroInterface;