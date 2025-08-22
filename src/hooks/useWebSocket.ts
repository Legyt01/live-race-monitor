import { useState, useEffect, useRef, useCallback } from 'react';
import { CompetitionData, CategoryData, TeamData, Categoria, RosterMessage, CompetitionResult, FutbolResult, TiempoResult, PuntosResult, CONFIG } from '@/types/competition';

interface WebSocketHookReturn {
  competitionData: CompetitionData;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  publishRoster: (categoria: Categoria, equipos: { equipo_id: string; equipo_nombre: string }[], arbitroId?: string) => void;
  publishResult: (result: CompetitionResult, arbitroId?: string) => void;
  getTeamsForCategory: (categoria: Categoria) => TeamData[];
}

// WebSocket server URL - cambiar según configuración
const WS_URL = process.env.NODE_ENV === 'production' 
  ? 'wss://your-websocket-server.com'  // Cambiar por servidor real
  : 'ws://localhost:8080';

export const useWebSocket = (): WebSocketHookReturn => {
  const [competitionData, setCompetitionData] = useState<CompetitionData>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const calculateFutbolPoints = (victorias: number, empates: number, derrotas: number): number => {
    return victorias * CONFIG.FUTBOL_WIN_POINTS + empates * CONFIG.FUTBOL_DRAW_POINTS + derrotas * CONFIG.FUTBOL_LOSS_POINTS;
  };

  const sortTeams = useCallback((teams: TeamData[], categoria: Categoria): TeamData[] => {
    const sorted = [...teams].sort((a, b) => {
      if (categoria === 'futbol_rc') {
        // Ordenar por puntos calculados, luego diferencia de gol
        const ptsA = a.pts_calculados || 0;
        const ptsB = b.pts_calculados || 0;
        if (ptsA !== ptsB) return ptsB - ptsA;
        
        const diffA = a.diferencia_gol || 0;
        const diffB = b.diferencia_gol || 0;
        return diffB - diffA;
      } else if (categoria === 'velocitas' || categoria === 'rally' || categoria === 'barcos') {
        // Ordenar por tiempo (menor es mejor)
        const timeA = a.tiempo_s || Infinity;
        const timeB = b.tiempo_s || Infinity;
        return timeA - timeB;
      } else {
        // Ordenar por puntos (mayor es mejor)
        const ptsA = a.puntos || 0;
        const ptsB = b.puntos || 0;
        return ptsB - ptsA;
      }
    });

    // Asignar posiciones
    return sorted.map((team, index) => ({ ...team, position: index + 1 }));
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    
    try {
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log('WebSocket conectado');
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'roster') {
            handleRosterMessage(message as RosterMessage);
          } else if (message.type === 'result') {
            handleResultUpdate(message as CompetitionResult);
          }
        } catch (error) {
          console.error('Error procesando mensaje WebSocket:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket desconectado:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        // Reconexión automática
        if (reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Error WebSocket:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Error creando WebSocket:', error);
      setConnectionStatus('error');
      
      // Fallback a datos locales si no hay servidor WebSocket
      loadLocalData();
    }
  }, []);

  const loadLocalData = useCallback(() => {
    // Cargar datos desde localStorage como fallback
    const categories = ['sumo_rc', 'sumo_autonomo', 'futbol_rc', 'velocitas', 'rally', 'barcos'];
    const arbitros = ['arb1', 'arb2', 'arb3', 'arb4', 'arb5', 'arb6'];
    const localData: CompetitionData = {};

    categories.forEach(categoria => {
      const key = `tarde_${categoria}`;
      localData[key] = {};
      
      // Buscar datos de todos los árbitros para esta categoría
      arbitros.forEach(arbitroId => {
        const teamsData = localStorage.getItem(`teams_${categoria}_${arbitroId}`);
        const resultsData = localStorage.getItem(`results_${categoria}_${arbitroId}`);
        
        if (teamsData) {
          const teams = JSON.parse(teamsData);
          const results = resultsData ? JSON.parse(resultsData) : {};
          
          // Agregar equipos de este árbitro
          teams.forEach((team: any) => {
            if (!localData[key][team.equipo_id]) {
              localData[key][team.equipo_id] = {
                equipo: team,
                puntos: 0,
                position: 0,
                ...results[team.equipo_id] // Aplicar resultados si existen
              };
            }
          });
        }
      });
    });

    setCompetitionData(localData);
    console.log('Datos locales cargados:', localData);
  }, []);

  const handleRosterMessage = useCallback((message: RosterMessage) => {
    const key = `tarde_${message.categoria}`;
    
    setCompetitionData(prev => {
      const updated = { ...prev };
      
      if (!updated[key]) {
        updated[key] = {};
      }

      // Mantener datos existentes pero actualizar estructura de equipos
      message.equipos.forEach(equipo => {
        if (!updated[key][equipo.equipo_id]) {
          updated[key][equipo.equipo_id] = {
            equipo,
            puntos: 0,
            position: 0
          };
        } else {
          updated[key][equipo.equipo_id].equipo = equipo;
        }
      });

      // Remover equipos que ya no están en la lista
      const currentTeamIds = message.equipos.map(e => e.equipo_id);
      Object.keys(updated[key]).forEach(teamId => {
        if (!currentTeamIds.includes(teamId)) {
          delete updated[key][teamId];
        }
      });

      return updated;
    });
  }, []);

  const handleResultUpdate = useCallback((result: CompetitionResult) => {
    const key = `tarde_${result.categoria}`;
    
    setCompetitionData(prev => {
      const updated = { ...prev };
      
      if (!updated[key] || !updated[key][result.equipo_id]) {
        return prev; // Equipo no existe
      }

      const teamData = { ...updated[key][result.equipo_id] };

      if ('puntos' in result) {
        // Resultado de puntos
        teamData.puntos = result.puntos;
      } else if ('tiempo_s' in result) {
        // Resultado de tiempo
        teamData.tiempo_s = result.tiempo_s;
      } else if ('victorias' in result) {
        // Resultado de fútbol
        const futbolResult = result as FutbolResult;
        teamData.victorias = futbolResult.victorias;
        teamData.empates = futbolResult.empates;
        teamData.derrotas = futbolResult.derrotas;
        teamData.goles_favor = futbolResult.goles_favor;
        teamData.goles_contra = futbolResult.goles_contra;
        teamData.pts_calculados = calculateFutbolPoints(futbolResult.victorias, futbolResult.empates, futbolResult.derrotas);
        teamData.diferencia_gol = futbolResult.goles_favor - futbolResult.goles_contra;
      }

      updated[key][result.equipo_id] = teamData;
      
      // Guardar en localStorage
      localStorage.setItem(`results_${result.categoria}`, JSON.stringify(updated[key]));

      return updated;
    });
  }, []);

  const publishRoster = useCallback((categoria: Categoria, equipos: { equipo_id: string; equipo_nombre: string }[], arbitroId?: string) => {
    const message: RosterMessage = { categoria, equipos };
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'roster', ...message }));
    }
    
    // También actualizar localmente
    handleRosterMessage(message);
    
    // Guardar en localStorage con ID de árbitro si se proporciona
    if (arbitroId) {
      localStorage.setItem(`teams_${categoria}_${arbitroId}`, JSON.stringify(equipos));
    }
    
    // Consolidar datos de todos los árbitros para la categoría
    const allArbitros = ['arb1', 'arb2', 'arb3', 'arb4', 'arb5', 'arb6'];
    const consolidatedTeams: any[] = [];
    
    allArbitros.forEach(arbId => {
      const arbTeams = localStorage.getItem(`teams_${categoria}_${arbId}`);
      if (arbTeams) {
        const teams = JSON.parse(arbTeams);
        consolidatedTeams.push(...teams);
      }
    });
    
    // Remover duplicados por equipo_id
    const uniqueTeams = consolidatedTeams.reduce((acc: any[], team: any) => {
      if (!acc.find(t => t.equipo_id === team.equipo_id)) {
        acc.push(team);
      }
      return acc;
    }, []);
    
    localStorage.setItem(`teams_${categoria}`, JSON.stringify(uniqueTeams));
  }, [handleRosterMessage]);

  const publishResult = useCallback((result: CompetitionResult, arbitroId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'result', ...result }));
    }
    
    // También actualizar localmente
    handleResultUpdate(result);
    
    // Guardar resultado específico del árbitro
    if (arbitroId) {
      const existingResults = localStorage.getItem(`results_${result.categoria}_${arbitroId}`);
      const results = existingResults ? JSON.parse(existingResults) : {};
      
      results[result.equipo_id] = result;
      localStorage.setItem(`results_${result.categoria}_${arbitroId}`, JSON.stringify(results));
    }
  }, [handleResultUpdate]);

  const getTeamsForCategory = useCallback((categoria: Categoria): TeamData[] => {
    const key = `tarde_${categoria}`;
    const categoryData = competitionData[key] || {};
    const teams = Object.values(categoryData);
    return sortTeams(teams, categoria);
  }, [competitionData, sortTeams]);

  useEffect(() => {
    connect();
    
    // Cargar datos locales inmediatamente
    loadLocalData();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, loadLocalData]);

  return {
    competitionData,
    connectionStatus,
    publishRoster,
    publishResult,
    getTeamsForCategory
  };
};