import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CATEGORIAS, PARALLEL_CATEGORIES, SEQUENTIAL_CATEGORIES, TeamData, Categoria, TIME_CATEGORIES } from '@/types/competition';
import { Trophy, Clock, Target, Car, Ship, Zap, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

interface CentralDisplayProps {
  getTeamsForCategory: (categoria: Categoria) => TeamData[];
}

const ALL_CATEGORIES = [...PARALLEL_CATEGORIES, ...SEQUENTIAL_CATEGORIES];

// Format time as min:sec
const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = (timeInSeconds % 60).toFixed(3);
  return `${minutes}:${seconds.padStart(6, '0')}`;
};

const CentralDisplay = ({ getTeamsForCategory }: CentralDisplayProps) => {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Auto-rotate through categories every 10 seconds
  useEffect(() => {
    if (!isAutoRotating || showAllCategories) return;

    const interval = setInterval(() => {
      setCurrentCategoryIndex((prev) => (prev + 1) % ALL_CATEGORIES.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [isAutoRotating, showAllCategories]);

  const nextCategory = () => {
    setCurrentCategoryIndex((prev) => (prev + 1) % ALL_CATEGORIES.length);
  };

  const prevCategory = () => {
    setCurrentCategoryIndex((prev) => (prev - 1 + ALL_CATEGORIES.length) % ALL_CATEGORIES.length);
  };
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
        return 'text-primary';
      case 'zumo_autonomo':
        return 'text-accent';
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
        <h2 className="text-3xl font-bold mb-2 text-primary">
          MetaRobots - Resultados en Tiempo Real
        </h2>
        <p className="text-muted-foreground">
          Seguimiento de todas las competencias MetaRobots
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center gap-4">
        <Button
          variant="outline"
          onClick={() => setShowAllCategories(!showAllCategories)}
          className="bg-background"
        >
          {showAllCategories ? 'Vista Individual' : 'Vista Completa'}
        </Button>
        
        {!showAllCategories && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={prevCategory}
              className="bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className="bg-background flex items-center gap-2"
            >
              {isAutoRotating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isAutoRotating ? 'Pausar' : 'Auto'}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={nextCategory}
              className="bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Category indicator */}
      {!showAllCategories && (
        <div className="flex justify-center">
          <div className="flex gap-2">
            {ALL_CATEGORIES.map((categoria, index) => (
              <button
                key={categoria}
                onClick={() => setCurrentCategoryIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentCategoryIndex 
                    ? 'bg-primary scale-125' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Competition Display */}
      <div>
        {showAllCategories ? (
          <>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Todas las Competencias
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {ALL_CATEGORIES.map(categoria => renderTable(categoria))}
            </div>
          </>
        ) : (
          <div className="flex justify-center">
            <div className="w-full max-w-4xl">
              {renderTable(ALL_CATEGORIES[currentCategoryIndex])}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CentralDisplay;