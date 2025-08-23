import { useState, useEffect, useCallback } from 'react';
import { Categoria, ArbitroId, CompetitionResult, TeamData, CONFIG } from '@/types/competition';

interface ArbitroDataHookReturn {
  equipos: { equipo_id: string; equipo_nombre: string }[];
  results: TeamData[];
  updateTrigger: number;
  addTeam: (equipo: { equipo_id: string; equipo_nombre: string }) => void;
  deleteTeam: (equipoId: string) => void;
  saveResult: (result: CompetitionResult) => void;
}

// Mapeo de árbitros a categorías
const ARBITRO_CATEGORIA: { [key in ArbitroId]: Categoria } = {
  'arb1': 'sumo_rc',
  'arb2': 'sumo_autonomo',
  'arb3': 'futbol_rc',
  'arb4': 'velocitas',
  'arb5': 'rally',
  'arb6': 'barcos'
};

const calculateFutbolPoints = (victorias: number, empates: number, derrotas: number): number => {
  return victorias * CONFIG.FUTBOL_WIN_POINTS + empates * CONFIG.FUTBOL_DRAW_POINTS + derrotas * CONFIG.FUTBOL_LOSS_POINTS;
};

export const useArbitroData = (arbitroId: ArbitroId): ArbitroDataHookReturn => {
  const categoria = ARBITRO_CATEGORIA[arbitroId];
  const [equipos, setEquipos] = useState<{ equipo_id: string; equipo_nombre: string }[]>([]);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Cargar equipos desde localStorage - SOLO para esta categoría específica
  const loadTeams = useCallback(() => {
    const teamsKey = `teams_${categoria}_${arbitroId}`;
    const saved = localStorage.getItem(teamsKey);
    
    // Verificar que el árbitro esté autorizado para esta categoría
    if (ARBITRO_CATEGORIA[arbitroId] !== categoria) {
      console.error(`Árbitro ${arbitroId} no autorizado para categoría ${categoria}`);
      setEquipos([]);
      return;
    }
    
    if (saved) {
      const teams = JSON.parse(saved);
      setEquipos(teams);
      console.log(`[${categoria}] Cargados ${teams.length} equipos para ${arbitroId}:`, teams);
    } else {
      setEquipos([]);
      console.log(`[${categoria}] No hay equipos guardados para ${arbitroId}`);
    }
  }, [categoria, arbitroId]);

  // Agregar equipo - SOLO para esta categoría específica
  const addTeam = useCallback((equipo: { equipo_id: string; equipo_nombre: string }) => {
    // Verificar autorización
    if (ARBITRO_CATEGORIA[arbitroId] !== categoria) {
      console.error(`Árbitro ${arbitroId} no autorizado para categoría ${categoria}`);
      return;
    }
    
    setEquipos(prev => {
      // Verificar que el equipo no exista ya en esta categoría
      if (prev.some(e => e.equipo_id === equipo.equipo_id)) {
        console.warn(`Equipo ${equipo.equipo_id} ya existe en ${categoria}`);
        return prev;
      }
      
      const updated = [...prev, equipo];
      localStorage.setItem(`teams_${categoria}_${arbitroId}`, JSON.stringify(updated));
      console.log(`[${categoria}] Equipo agregado:`, equipo);
      return updated;
    });
    setUpdateTrigger(prev => prev + 1);
  }, [categoria, arbitroId]);

  // Eliminar equipo - SOLO de esta categoría específica
  const deleteTeam = useCallback((equipoId: string) => {
    // Verificar autorización
    if (ARBITRO_CATEGORIA[arbitroId] !== categoria) {
      console.error(`Árbitro ${arbitroId} no autorizado para categoría ${categoria}`);
      return;
    }
    
    setEquipos(prev => {
      const updated = prev.filter(e => e.equipo_id !== equipoId);
      localStorage.setItem(`teams_${categoria}_${arbitroId}`, JSON.stringify(updated));
      
      // También eliminar resultados del equipo de esta categoría específica
      const resultsKey = `results_${categoria}_${arbitroId}`;
      const existingResults = localStorage.getItem(resultsKey);
      if (existingResults) {
        const results = JSON.parse(existingResults);
        delete results[equipoId];
        localStorage.setItem(resultsKey, JSON.stringify(results));
      }
      
      console.log(`[${categoria}] Equipo eliminado: ${equipoId}`);
      return updated;
    });
    setUpdateTrigger(prev => prev + 1);
  }, [categoria, arbitroId]);

  // Guardar resultado
  const saveResult = useCallback((result: CompetitionResult) => {
    const resultsKey = `results_${categoria}_${arbitroId}`;
    const existingResults = localStorage.getItem(resultsKey);
    const results = existingResults ? JSON.parse(existingResults) : {};
    
    results[result.equipo_id] = result;
    localStorage.setItem(resultsKey, JSON.stringify(results));
    setUpdateTrigger(prev => prev + 1);
  }, [categoria, arbitroId]);

  // Obtener resultados combinados
  const getResults = useCallback((): TeamData[] => {
    const resultsKey = `results_${categoria}_${arbitroId}`;
    const resultsData = localStorage.getItem(resultsKey);
    const results = resultsData ? JSON.parse(resultsData) : {};

    const teamData: TeamData[] = equipos.map(equipo => {
      const result = results[equipo.equipo_id] || {};
      const teamData: TeamData = {
        equipo,
        position: 0,
        ...result
      };

      // Calcular puntos de fútbol si es necesario
      if (categoria === 'futbol_rc' && 'victorias' in result) {
        teamData.pts_calculados = calculateFutbolPoints(
          result.victorias || 0,
          result.empates || 0,
          result.derrotas || 0
        );
        teamData.diferencia_gol = (result.goles_favor || 0) - (result.goles_contra || 0);
      }

      return teamData;
    });

    // Ordenar equipos
    const sorted = teamData.sort((a, b) => {
      if (categoria === 'futbol_rc') {
        const ptsA = a.pts_calculados || 0;
        const ptsB = b.pts_calculados || 0;
        if (ptsA !== ptsB) return ptsB - ptsA;
        
        const diffA = a.diferencia_gol || 0;
        const diffB = b.diferencia_gol || 0;
        return diffB - diffA;
      } else if (categoria === 'velocitas' || categoria === 'rally' || categoria === 'barcos') {
        const timeA = a.tiempo_s || Infinity;
        const timeB = b.tiempo_s || Infinity;
        return timeA - timeB;
      } else {
        const ptsA = a.puntos || 0;
        const ptsB = b.puntos || 0;
        return ptsB - ptsA;
      }
    });

    // Asignar posiciones
    return sorted.map((team, index) => ({ ...team, position: index + 1 }));
  }, [equipos, categoria, arbitroId, updateTrigger]);

  // Cargar datos al inicializar
  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Polling para mantener datos actualizados
  useEffect(() => {
    const interval = setInterval(() => {
      loadTeams();
    }, 3000);

    return () => clearInterval(interval);
  }, [loadTeams]);

  return {
    equipos,
    results: getResults(),
    updateTrigger,
    addTeam,
    deleteTeam,
    saveResult
  };
};