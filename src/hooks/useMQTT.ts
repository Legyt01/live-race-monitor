import { useState, useEffect, useRef } from 'react';
import { CompetitionResult, RosterMessage, CompetitionData, TeamData, Categoria, Jornada, CONFIG } from '@/types/competition';

// Simulated MQTT for development - replace with actual MQTT client
class MockMQTTClient {
  private callbacks: { [topic: string]: ((message: any) => void)[] } = {};
  private isConnected = false;
  private connectCallback?: () => void;

  connect(onConnect: () => void) {
    this.connectCallback = onConnect;
    setTimeout(() => {
      this.isConnected = true;
      onConnect();
    }, 1000);
  }

  subscribe(topic: string, callback: (message: any) => void) {
    if (!this.callbacks[topic]) {
      this.callbacks[topic] = [];
    }
    this.callbacks[topic].push(callback);
  }

  publish(topic: string, message: any) {
    const callbacks = this.callbacks[topic] || [];
    callbacks.forEach(callback => callback(message));
  }

  disconnect() {
    this.isConnected = false;
    this.callbacks = {};
  }
}

export const useMQTT = () => {
  const [competitionData, setCompetitionData] = useState<CompetitionData>({});
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const clientRef = useRef<MockMQTTClient | null>(null);

  const calculateFutbolPoints = (team: TeamData): number => {
    if (!team.victorias && !team.empates && !team.derrotas) return 0;
    return (team.victorias || 0) * CONFIG.FUTBOL_WIN_POINTS + 
           (team.empates || 0) * CONFIG.FUTBOL_DRAW_POINTS + 
           (team.derrotas || 0) * CONFIG.FUTBOL_LOSS_POINTS;
  };

  const sortTeams = (teams: TeamData[], categoria: Categoria): TeamData[] => {
    const sorted = [...teams].sort((a, b) => {
      switch (categoria) {
        case 'futbol_rc':
          const ptsA = calculateFutbolPoints(a);
          const ptsB = calculateFutbolPoints(b);
          if (ptsA !== ptsB) return ptsB - ptsA;
          
          const diffA = (a.goles_favor || 0) - (a.goles_contra || 0);
          const diffB = (b.goles_favor || 0) - (b.goles_contra || 0);
          if (diffA !== diffB) return diffB - diffA;
          
          return (b.goles_favor || 0) - (a.goles_favor || 0);
          
        case 'velocitas':
          // Order by tiempo_s descending (mayor a menor)
          if (!a.tiempo_s && !b.tiempo_s) return 0;
          if (!a.tiempo_s) return 1;
          if (!b.tiempo_s) return -1;
          return b.tiempo_s - a.tiempo_s;
          
        default:
          // Zumo RC, Zumo Autónomo, Rally, Barcos - por puntos descendente
          return (b.puntos || 0) - (a.puntos || 0);
      }
    });

    return sorted.map((team, index) => ({
      ...team,
      position: index + 1,
      pts_calculados: categoria === 'futbol_rc' ? calculateFutbolPoints(team) : undefined,
      diferencia_gol: categoria === 'futbol_rc' ? (team.goles_favor || 0) - (team.goles_contra || 0) : undefined
    }));
  };

  const handleRosterMessage = (message: RosterMessage) => {
    const key = `${message.jornada}_${message.categoria}`;
    
    setCompetitionData(prev => {
      const newData = { ...prev };
      if (!newData[key]) {
        newData[key] = {};
      }

      // Add all teams from roster
      message.equipos.forEach(equipo => {
        if (!newData[key][equipo.equipo_id]) {
          newData[key][equipo.equipo_id] = { equipo };
        } else {
          newData[key][equipo.equipo_id].equipo = equipo;
        }
      });

      return newData;
    });
  };

  const handleResultUpdate = (result: CompetitionResult) => {
    const key = `${result.jornada}_${result.categoria}`;
    
    setCompetitionData(prev => {
      const newData = { ...prev };
      if (!newData[key]) {
        newData[key] = {};
      }
      if (!newData[key][result.equipo_id]) {
        newData[key][result.equipo_id] = { 
          equipo: { equipo_id: result.equipo_id, equipo_nombre: result.equipo_id } 
        };
      }

      // Update team data based on result type
      const teamData = newData[key][result.equipo_id];
      
      if ('puntos' in result) {
        teamData.puntos = result.puntos;
      } else if ('victorias' in result) {
        teamData.victorias = result.victorias;
        teamData.empates = result.empates;
        teamData.derrotas = result.derrotas;
        teamData.goles_favor = result.goles_favor;
        teamData.goles_contra = result.goles_contra;
      } else if ('tiempo_s' in result) {
        teamData.tiempo_s = result.tiempo_s;
      }

      return newData;
    });
  };

  const publishRoster = (jornada: Jornada, categoria: Categoria, equipos: { equipo_id: string; equipo_nombre: string }[]) => {
    const message: RosterMessage = { jornada, categoria, equipos };
    const topic = `events/${jornada}/${categoria}/roster`;
    clientRef.current?.publish(topic, message);
  };

  const publishResult = (result: CompetitionResult) => {
    const topic = `events/${result.jornada}/${result.categoria}/${result.arbitro_id}/update`;
    clientRef.current?.publish(topic, result);
  };

  const getTeamsForCategory = (jornada: Jornada, categoria: Categoria): TeamData[] => {
    const key = `${jornada}_${categoria}`;
    const categoryData = competitionData[key] || {};
    const teams = Object.values(categoryData);
    return sortTeams(teams, categoria);
  };

  useEffect(() => {
    setConnectionStatus('connecting');
    const client = new MockMQTTClient();
    clientRef.current = client;

    client.connect(() => {
      setConnectionStatus('connected');
      
      // Subscribe to all roster topics
      ['manana', 'tarde'].forEach(jornada => {
        ['zumo_rc', 'zumo_autonomo', 'futbol_rc', 'velocitas', 'rally', 'barcos'].forEach(categoria => {
          client.subscribe(`events/${jornada}/${categoria}/roster`, handleRosterMessage);
          
          // Subscribe to all arbitro update topics
          ['arb1', 'arb2', 'arb3', 'arb4', 'arb5', 'arb6'].forEach(arbitro => {
            client.subscribe(`events/${jornada}/${categoria}/${arbitro}/update`, handleResultUpdate);
          });
        });
      });
    });

    return () => {
      client.disconnect();
      setConnectionStatus('disconnected');
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