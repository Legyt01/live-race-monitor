import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CATEGORIAS, JORNADAS, PARALLEL_CATEGORIES, SEQUENTIAL_CATEGORIES, TeamData, Jornada, Categoria } from '@/types/competition';
import { Trophy, Clock, Target, Car, Ship, Zap } from 'lucide-react';

interface CentralDisplayProps {
  getTeamsForCategory: (jornada: Jornada, categoria: Categoria) => TeamData[];
}

const CentralDisplay = ({ getTeamsForCategory }: CentralDisplayProps) => {
  const getCategoryIcon = (categoria: Categoria) => {
    switch (categoria) {
      case 'zumo_rc':
      case 'zumo_autonomo':
        return Target;
      case 'futbol_rc':
        return Trophy;
      case 'velocitas':
        return Zap;
      case 'rally':
        return Car;
      case 'barcos':
        return Ship;
      default:
        return Trophy;
    }
  };

  const getCategoryColor = (categoria: Categoria) => {
    switch (categoria) {
      case 'zumo_rc':
      case 'zumo_autonomo':
        return 'text-meta-red';
      case 'futbol_rc':
        return 'text-meta-green';
      case 'velocitas':
        return 'text-meta-purple';
      case 'rally':
        return 'text-meta-orange';
      case 'barcos':
        return 'text-meta-blue';
      default:
        return 'text-primary';
    }
  };

  // Combinar equipos de mañana y tarde para mostrar en un solo bloque
  const getCombinedTeams = (categoria: Categoria): TeamData[] => {
    const teamsMañana = getTeamsForCategory('manana', categoria);
    const teamsTarde = getTeamsForCategory('tarde', categoria);
    
    // Crear un mapa para combinar equipos por ID
    const combinedMap = new Map<string, TeamData>();
    
    // Agregar equipos de mañana
    teamsMañana.forEach(team => {
      combinedMap.set(team.equipo.equipo_id, { ...team });
    });
    
    // Combinar/agregar equipos de tarde
    teamsTarde.forEach(team => {
      const existing = combinedMap.get(team.equipo.equipo_id);
      if (existing) {
        // Combinar datos
        if (categoria === 'futbol_rc') {
          existing.victorias = (existing.victorias || 0) + (team.victorias || 0);
          existing.empates = (existing.empates || 0) + (team.empates || 0);
          existing.derrotas = (existing.derrotas || 0) + (team.derrotas || 0);
          existing.goles_favor = (existing.goles_favor || 0) + (team.goles_favor || 0);
          existing.goles_contra = (existing.goles_contra || 0) + (team.goles_contra || 0);
        } else if (categoria === 'velocitas') {
          // Para velocitas, tomar el mejor tiempo (menor)
          if (!existing.tiempo_s || (team.tiempo_s && team.tiempo_s < existing.tiempo_s)) {
            existing.tiempo_s = team.tiempo_s;
          }
        } else {
          // Para puntos, sumar
          existing.puntos = (existing.puntos || 0) + (team.puntos || 0);
        }
      } else {
        combinedMap.set(team.equipo.equipo_id, { ...team });
      }
    });
    
    const teams = Array.from(combinedMap.values());
    
    // Ordenar según la categoría
    const sorted = [...teams].sort((a, b) => {
      switch (categoria) {
        case 'futbol_rc':
          const calculateFutbolPoints = (team: TeamData): number => {
            return (team.victorias || 0) * 3 + (team.empates || 0) * 1 + (team.derrotas || 0) * 0;
          };
          
          const ptsA = calculateFutbolPoints(a);
          const ptsB = calculateFutbolPoints(b);
          if (ptsA !== ptsB) return ptsB - ptsA;
          
          const diffA = (a.goles_favor || 0) - (a.goles_contra || 0);
          const diffB = (b.goles_favor || 0) - (b.goles_contra || 0);
          if (diffA !== diffB) return diffB - diffA;
          
          return (b.goles_favor || 0) - (a.goles_favor || 0);
          
        case 'velocitas':
          if (!a.tiempo_s && !b.tiempo_s) return 0;
          if (!a.tiempo_s) return 1;
          if (!b.tiempo_s) return -1;
          return a.tiempo_s - b.tiempo_s; // Menor tiempo es mejor
          
        default:
          return (b.puntos || 0) - (a.puntos || 0);
      }
    });

    return sorted.map((team, index) => ({
      ...team,
      position: index + 1,
      pts_calculados: categoria === 'futbol_rc' ? 
        (team.victorias || 0) * 3 + (team.empates || 0) * 1 + (team.derrotas || 0) * 0 : undefined,
      diferencia_gol: categoria === 'futbol_rc' ? 
        (team.goles_favor || 0) - (team.goles_contra || 0) : undefined
    }));
  };

  const renderCombinedTable = (categoria: Categoria) => {
    const teams = getCombinedTeams(categoria);
    const Icon = getCategoryIcon(categoria);
    const colorClass = getCategoryColor(categoria);
    
    const getColumns = () => {
      switch (categoria) {
        case 'futbol_rc':
          return ['#', 'Equipo', 'V', 'GF', 'GC', 'PTS'];
        case 'velocitas':
          return ['#', 'Equipo', 'Tiempo (s)'];
        default:
          return ['#', 'Equipo', 'Puntos'];
      }
    };

    const renderTableCell = (team: TeamData, column: string) => {
      switch (column) {
        case '#':
          return (
            <Badge variant={team.position === 1 ? "default" : "secondary"} className="font-bold">
              {team.position || '-'}
            </Badge>
          );
        case 'Equipo':
          return (
            <span className={`font-medium ${!hasData(team) ? 'text-muted-foreground' : ''}`}>
              {team.equipo.equipo_nombre}
            </span>
          );
        case 'V':
          return team.victorias || 0;
        case 'GF':
          return team.goles_favor || 0;
        case 'GC':
          return team.goles_contra || 0;
        case 'PTS':
          return team.pts_calculados || 0;
        case 'Tiempo (s)':
          return team.tiempo_s ? team.tiempo_s.toFixed(3) : '-';
        case 'Puntos':
          return team.puntos || 0;
        default:
          return '-';
      }
    };

    const hasData = (team: TeamData) => {
      return !!(team.puntos || team.victorias || team.tiempo_s);
    };

    return (
      <Card key={categoria} className="bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className={`flex items-center gap-2 ${colorClass}`}>
            <Icon className="h-5 w-5" />
            {CATEGORIAS[categoria]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay equipos registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {getColumns().map((column) => (
                    <TableHead key={column} className="font-semibold">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow 
                    key={team.equipo.equipo_id}
                    className={`${!hasData(team) ? 'opacity-60' : ''} hover:bg-muted/30 transition-colors`}
                  >
                    {getColumns().map((column) => (
                      <TableCell key={column}>
                        {renderTableCell(team, column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Resultados en Tiempo Real
        </h2>
        <p className="text-muted-foreground">
          Seguimiento de todas las competencias MetaRobots
        </p>
      </div>

      {/* Todas las competencias como bloques únicos */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Competencias MetaRobots
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {PARALLEL_CATEGORIES.map(categoria => renderCombinedTable(categoria))}
          {SEQUENTIAL_CATEGORIES.map(categoria => renderCombinedTable(categoria))}
        </div>
      </div>
    </div>
  );
};

export default CentralDisplay;