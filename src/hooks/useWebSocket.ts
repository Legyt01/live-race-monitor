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
  const [updateTrigger, setUpdateTrigger] = useState(0);
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
    }
  }, []);

  const loadLocalData = useCallback(() => {
    // Cargar datos desde localStorage - SOLO del árbitro asignado a cada categoría
    const categories: Categoria[] = ['sumo_rc', 'sumo_autonomo', 'futbol_rc', 'velocitas', 'rally', 'barcos'];
    const arbitroCategoria: { [key: string]: Categoria } = {
      'arb1': 'sumo_rc',
      'arb2': 'sumo_autonomo', 
      'arb3': 'futbol_rc',
      'arb4': 'velocitas',
      'arb5': 'rally',
      'arb6': 'barcos'
    };
    const localData: CompetitionData = {};

    categories.forEach(categoria => {
      const key = `tarde_${categoria}`;
      localData[key] = {};
      
      // Buscar SOLO el árbitro asignado a esta categoría específica
      const arbitroAsignado = Object.keys(arbitroCategoria).find(arb => arbitroCategoria[arb] === categoria);
      
      if (arbitroAsignado) {
        const teamsData = localStorage.getItem(`teams_${categoria}_${arbitroAsignado}`);
        const resultsData = localStorage.getItem(`results_${categoria}_${arbitroAsignado}`);
        
        if (teamsData) {
          const teams = JSON.parse(teamsData);
          const results = resultsData ? JSON.parse(resultsData) : {};
          
          // Agregar equipos SOLO del árbitro asignado a esta categoría
          teams.forEach((team: any) => {
            localData[key][team.equipo_id] = {
              equipo: team,
              puntos: 0,
              position: 0,
              arbitroId: arbitroAsignado,
              ...results[team.equipo_id] // Aplicar resultados si existen
            };
          });
        }
      }
    });

    setCompetitionData(localData);
    setUpdateTrigger(prev => prev + 1); // Forzar actualización de pantalla central
    console.log('Datos locales cargados por categoría específica:', localData);
  }, []);

  const handleRosterMessage = useCallback((message: RosterMessage & { arbitroId?: string }) => {
    const key = `tarde_${message.categoria}`;
    const arbitroId = message.arbitroId || 'unknown';
    
    // Verificar que el árbitro esté autorizado para esta categoría
    const arbitroCategoria: { [key: string]: Categoria } = {
      'arb1': 'sumo_rc',
      'arb2': 'sumo_autonomo', 
      'arb3': 'futbol_rc',
      'arb4': 'velocitas',
      'arb5': 'rally',
      'arb6': 'barcos'
    };
    
    if (arbitroCategoria[arbitroId] !== message.categoria) {
      console.warn(`Árbitro ${arbitroId} no autorizado para categoría ${message.categoria}`);
      return;
    }
    
    setCompetitionData(prev => {
      const updated = { ...prev };
      
      if (!updated[key]) {
        updated[key] = {};
      }

      // Limpiar TODOS los equipos de esta categoría (solo debe haber un árbitro por categoría)
      updated[key] = {};

      // Agregar equipos del árbitro autorizado
      message.equipos.forEach(equipo => {
        updated[key][equipo.equipo_id] = {
          equipo: equipo,
          puntos: 0,
          position: 0,
          arbitroId
        };
      });

      return updated;
    });
    
    // Forzar actualización en componentes
    setUpdateTrigger(prev => prev + 1);
  }, []);

  const handleResultUpdate = useCallback((result: CompetitionResult & { arbitroId?: string }) => {
    const key = `tarde_${result.categoria}`;
    const arbitroId = result.arbitroId || 'unknown';
    
    // Verificar que el árbitro esté autorizado para esta categoría
    const arbitroCategoria: { [key: string]: Categoria } = {
      'arb1': 'sumo_rc',
      'arb2': 'sumo_autonomo', 
      'arb3': 'futbol_rc',
      'arb4': 'velocitas',
      'arb5': 'rally',
      'arb6': 'barcos'
    };
    
    if (arbitroCategoria[arbitroId] !== result.categoria) {
      console.warn(`Árbitro ${arbitroId} no autorizado para categoría ${result.categoria}`);
      return;
    }
    
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
      
      return updated;
    });
    
    // Forzar actualización en componentes
    setUpdateTrigger(prev => prev + 1);
  }, []);

  const publishRoster = useCallback((categoria: Categoria, equipos: { equipo_id: string; equipo_nombre: string }[], arbitroId?: string) => {
    const message = { categoria, equipos, arbitroId };
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'roster', ...message }));
    }
    
    // También actualizar localmente
    handleRosterMessage(message);
    
    // Guardar en localStorage con ID de árbitro para mantener separación
    if (arbitroId) {
      localStorage.setItem(`teams_${categoria}_${arbitroId}`, JSON.stringify(equipos));
    }
  }, [handleRosterMessage]);

  const publishResult = useCallback((result: CompetitionResult, arbitroId?: string) => {
    const resultWithArbitro = { ...result, arbitroId };
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'result', ...resultWithArbitro }));
    }
    
    // También actualizar localmente
    handleResultUpdate(resultWithArbitro);
    
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
  }, [competitionData, sortTeams, updateTrigger]);

  useEffect(() => {
    // Cargar datos locales inmediatamente
    loadLocalData();
    
    // Intentar conectar WebSocket pero no depender de él
    connect();

    // Configurar polling para actualización automática cada 2 segundos
    const pollingInterval = setInterval(() => {
      loadLocalData();
    }, 2000);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearInterval(pollingInterval);
    };
  }, []);

  return {
    competitionData,
    connectionStatus,
    publishRoster,
    publishResult,
    getTeamsForCategory
  };
};