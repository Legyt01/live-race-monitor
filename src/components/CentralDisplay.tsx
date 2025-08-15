import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CATEGORIAS, PARALLEL_CATEGORIES, SEQUENTIAL_CATEGORIES, TeamData, Categoria, TIME_CATEGORIES } from '@/types/competition';
import { Trophy, Clock, Target, Car, Ship, Zap } from 'lucide-react';

interface CentralDisplayProps {
  getTeamsForCategory: (categoria: Categoria) => TeamData[];
}

// Format time as min:sec
const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = (timeInSeconds % 60).toFixed(3);
  return `${minutes}:${seconds.padStart(6, '0')}`;
};

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

  const getTeams = (categoria: Categoria): TeamData[] => {
    return getTeamsForCategory(categoria);
  };

  const renderTable = (categoria: Categoria) => {
    const teams = getTeams(categoria);
    const Icon = getCategoryIcon(categoria);
    const colorClass = getCategoryColor(categoria);
    
    const getColumns = () => {
      switch (categoria) {
        case 'futbol_rc':
          return ['#', 'Equipo', 'V', 'GF', 'GC', 'PTS'];
        case 'velocitas':
        case 'rally':
        case 'barcos':
          return ['#', 'Equipo', 'Tiempo'];
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
        case 'Tiempo':
          return team.tiempo_s ? formatTime(team.tiempo_s) : '-';
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
          {PARALLEL_CATEGORIES.map(categoria => renderTable(categoria))}
          {SEQUENTIAL_CATEGORIES.map(categoria => renderTable(categoria))}
        </div>
      </div>
    </div>
  );
};

export default CentralDisplay;