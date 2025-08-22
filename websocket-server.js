const WebSocket = require('ws');
const http = require('http');

// Crear servidor HTTP simple
const server = http.createServer();

// Crear servidor WebSocket
const wss = new WebSocket.Server({ 
  server,
  port: 8080 
});

console.log('Servidor WebSocket iniciado en puerto 8080');

// Almacén de datos en memoria
const gameData = {};

// Broadcast a todos los clientes conectados excepto el remitente
function broadcast(data, excludeSocket = null) {
  wss.clients.forEach(client => {
    if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', (ws, req) => {
  console.log('Nueva conexión WebSocket establecida');
  
  // Enviar datos actuales al nuevo cliente
  ws.send(JSON.stringify({
    type: 'initial_data',
    data: gameData
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'roster') {
        // Actualizar roster de equipos
        const key = `tarde_${data.categoria}`;
        
        if (!gameData[key]) {
          gameData[key] = {};
        }

        // Mantener datos existentes pero actualizar equipos
        data.equipos.forEach(equipo => {
          if (!gameData[key][equipo.equipo_id]) {
            gameData[key][equipo.equipo_id] = {
              equipo,
              puntos: 0,
              position: 0
            };
          } else {
            gameData[key][equipo.equipo_id].equipo = equipo;
          }
        });

        // Remover equipos que ya no están
        const currentIds = data.equipos.map(e => e.equipo_id);
        Object.keys(gameData[key]).forEach(teamId => {
          if (!currentIds.includes(teamId)) {
            delete gameData[key][teamId];
          }
        });

        console.log(`Roster actualizado para ${data.categoria}:`, data.equipos.length, 'equipos');
        
        // Broadcast a otros clientes
        broadcast(data, ws);
        
      } else if (data.type === 'result') {
        // Actualizar resultado de equipo
        const key = `tarde_${data.categoria}`;
        
        if (gameData[key] && gameData[key][data.equipo_id]) {
          const teamData = gameData[key][data.equipo_id];

          if ('puntos' in data) {
            teamData.puntos = data.puntos;
          } else if ('tiempo_s' in data) {
            teamData.tiempo_s = data.tiempo_s;
          } else if ('victorias' in data) {
            teamData.victorias = data.victorias;
            teamData.empates = data.empates;
            teamData.derrotas = data.derrotas;
            teamData.goles_favor = data.goles_favor;
            teamData.goles_contra = data.goles_contra;
            teamData.pts_calculados = data.victorias * 3 + data.empates * 1;
            teamData.diferencia_gol = data.goles_favor - data.goles_contra;
          }

          console.log(`Resultado actualizado para ${data.categoria} - ${data.equipo_id}`);
          
          // Broadcast a otros clientes
          broadcast(data, ws);
        }
      }
      
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error procesando mensaje'
      }));
    }
  });

  ws.on('close', () => {
    console.log('Conexión WebSocket cerrada');
  });

  ws.on('error', (error) => {
    console.error('Error WebSocket:', error);
  });
});

server.listen(8080, () => {
  console.log('Servidor HTTP y WebSocket corriendo en puerto 8080');
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('Cerrando servidor...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('Cerrando servidor...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});