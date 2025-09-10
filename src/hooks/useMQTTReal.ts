import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { CompetitionResult, RosterMessage, Categoria, TiempoResult, ArbitroId } from '@/types/competition';

interface MQTTConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
  clientId?: string;
}

interface MQTTHookReturn {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  publishResult: (result: TiempoResult) => void;
  publishRoster: (categoria: Categoria, equipos: { equipo_id: string; equipo_nombre: string }[], arbitroId: ArbitroId) => void;
  isConfigured: boolean;
  configure: (config: MQTTConfig) => void;
  disconnect: () => void;
}

// Solo para Velocitas y Rally
const MQTT_CATEGORIES: Categoria[] = ['velocitas', 'rally'];
const ARBITRO_CATEGORIA: { [key in ArbitroId]?: Categoria } = {
  'arb4': 'velocitas',
  'arb5': 'rally'
};

export const useMQTTReal = (
  onResultReceived?: (result: TiempoResult) => void,
  onRosterReceived?: (message: RosterMessage & { arbitroId: ArbitroId }) => void
): MQTTHookReturn => {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [isConfigured, setIsConfigured] = useState(false);
  const clientRef = useRef<MqttClient | null>(null);
  const configRef = useRef<MQTTConfig | null>(null);

  const connect = useCallback(() => {
    if (!configRef.current || clientRef.current?.connected) return;

    const config = configRef.current;
    setConnectionStatus('connecting');

    try {
      const client = mqtt.connect(config.brokerUrl, {
        clientId: config.clientId || `metarobots_${Math.random().toString(36).substr(2, 9)}`,
        username: config.username,
        password: config.password,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      });

      client.on('connect', () => {
        console.log('MQTT conectado');
        setConnectionStatus('connected');
        
        // Suscribirse a topics de Velocitas y Rally
        MQTT_CATEGORIES.forEach(categoria => {
          // Topics para resultados
          const resultTopic = `metarobots/events/${categoria}/+/result`;
          client.subscribe(resultTopic, (err) => {
            if (err) {
              console.error(`Error suscribiéndose a ${resultTopic}:`, err);
            } else {
              console.log(`Suscrito a ${resultTopic}`);
            }
          });

          // Topics para roster
          const rosterTopic = `metarobots/events/${categoria}/+/roster`;
          client.subscribe(rosterTopic, (err) => {
            if (err) {
              console.error(`Error suscribiéndose a ${rosterTopic}:`, err);
            } else {
              console.log(`Suscrito a ${rosterTopic}`);
            }
          });
        });
      });

      client.on('message', (topic, message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Mensaje MQTT recibido:', topic, data);

          // Extraer información del topic: metarobots/events/{categoria}/{arbitro}/{tipo}
          const topicParts = topic.split('/');
          if (topicParts.length >= 5) {
            const categoria = topicParts[2] as Categoria;
            const arbitro = topicParts[3] as ArbitroId;
            const tipo = topicParts[4];

            // Verificar que es una categoría MQTT válida
            if (!MQTT_CATEGORIES.includes(categoria)) return;

            if (tipo === 'result' && onResultReceived) {
              const result: TiempoResult = {
                categoria,
                arbitro_id: arbitro,
                equipo_id: data.equipo_id,
                tiempo_s: data.tiempo_s
              };
              onResultReceived(result);
            } else if (tipo === 'roster' && onRosterReceived) {
              const roster: RosterMessage & { arbitroId: ArbitroId } = {
                categoria,
                equipos: data.equipos,
                arbitroId: arbitro
              };
              onRosterReceived(roster);
            }
          }
        } catch (error) {
          console.error('Error procesando mensaje MQTT:', error);
        }
      });

      client.on('error', (error) => {
        console.error('Error MQTT:', error);
        setConnectionStatus('error');
      });

      client.on('disconnect', () => {
        console.log('MQTT desconectado');
        setConnectionStatus('disconnected');
      });

      client.on('offline', () => {
        console.log('MQTT offline');
        setConnectionStatus('disconnected');
      });

      clientRef.current = client;

    } catch (error) {
      console.error('Error conectando MQTT:', error);
      setConnectionStatus('error');
    }
  }, [onResultReceived, onRosterReceived]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  const configure = useCallback((config: MQTTConfig) => {
    // Desconectar cliente anterior si existe
    disconnect();
    
    // Guardar configuración
    configRef.current = config;
    localStorage.setItem('mqtt_config', JSON.stringify(config));
    setIsConfigured(true);
    
    // Conectar con nueva configuración
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  const publishResult = useCallback((result: TiempoResult) => {
    if (!clientRef.current?.connected) {
      console.warn('MQTT no conectado, no se puede publicar resultado');
      return;
    }

    // Solo publicar si es velocitas o rally
    if (!MQTT_CATEGORIES.includes(result.categoria)) {
      console.warn(`Categoría ${result.categoria} no configurada para MQTT`);
      return;
    }

    const topic = `metarobots/events/${result.categoria}/${result.arbitro_id}/result`;
    const payload = {
      equipo_id: result.equipo_id,
      tiempo_s: result.tiempo_s,
      timestamp: new Date().toISOString()
    };

    clientRef.current.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
      if (error) {
        console.error('Error publicando resultado MQTT:', error);
      } else {
        console.log('Resultado MQTT publicado:', topic, payload);
      }
    });
  }, []);

  const publishRoster = useCallback((categoria: Categoria, equipos: { equipo_id: string; equipo_nombre: string }[], arbitroId: ArbitroId) => {
    if (!clientRef.current?.connected) {
      console.warn('MQTT no conectado, no se puede publicar roster');
      return;
    }

    // Solo publicar si es velocitas o rally
    if (!MQTT_CATEGORIES.includes(categoria)) {
      console.warn(`Categoría ${categoria} no configurada para MQTT`);
      return;
    }

    const topic = `metarobots/events/${categoria}/${arbitroId}/roster`;
    const payload = {
      equipos,
      timestamp: new Date().toISOString()
    };

    clientRef.current.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
      if (error) {
        console.error('Error publicando roster MQTT:', error);
      } else {
        console.log('Roster MQTT publicado:', topic, payload);
      }
    });
  }, []);

  // Cargar configuración guardada al inicializar
  useEffect(() => {
    const savedConfig = localStorage.getItem('mqtt_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        configRef.current = config;
        setIsConfigured(true);
        connect();
      } catch (error) {
        console.error('Error cargando configuración MQTT guardada:', error);
      }
    }
  }, [connect]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionStatus,
    publishResult,
    publishRoster,
    isConfigured,
    configure,
    disconnect
  };
};