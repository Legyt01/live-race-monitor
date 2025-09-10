# Integración MQTT para MetaRobots

## Configuración

El sistema MQTT está configurado únicamente para las categorías **Velocitas** y **Rally**.

### Árbitros asignados:
- **arb4** → **Velocitas**
- **arb5** → **Rally**

## Topics MQTT

### Para publicar resultados:
- `metarobots/events/velocitas/arb4/result`
- `metarobots/events/rally/arb5/result`

### Para publicar roster (lista de equipos):
- `metarobots/events/velocitas/arb4/roster`
- `metarobots/events/rally/arb5/roster`

## Estructura de mensajes

### 1. Publicar resultado de tiempo (Velocitas/Rally)

```json
{
  "equipo_id": "team001",
  "tiempo_s": 45.234,
  "timestamp": "2024-09-10T10:30:00.000Z"
}
```

### 2. Publicar roster (lista de equipos)

```json
{
  "equipos": [
    {
      "equipo_id": "team001",
      "equipo_nombre": "Veloces Runners"
    },
    {
      "equipo_id": "team002", 
      "equipo_nombre": "Speed Masters"
    }
  ],
  "timestamp": "2024-09-10T10:30:00.000Z"
}
```

## Ejemplo de código JavaScript para enviar datos

### Instalación de mqtt.js (Node.js/Browser)

```bash
npm install mqtt
```

### Código JavaScript

```javascript
const mqtt = require('mqtt'); // Para Node.js
// Para browser usar: import mqtt from 'mqtt'

class MetaRobotsMQTT {
  constructor(brokerUrl, options = {}) {
    this.client = mqtt.connect(brokerUrl, {
      clientId: options.clientId || `metarobots_${Math.random().toString(36).substr(2, 9)}`,
      username: options.username,
      password: options.password,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    });

    this.client.on('connect', () => {
      console.log('Conectado al broker MQTT');
    });

    this.client.on('error', (error) => {
      console.error('Error MQTT:', error);
    });
  }

  // Enviar resultado de tiempo para Velocitas
  enviarResultadoVelocitas(equipoId, tiempoSegundos) {
    const topic = 'metarobots/events/velocitas/arb4/result';
    const payload = {
      equipo_id: equipoId,
      tiempo_s: tiempoSegundos,
      timestamp: new Date().toISOString()
    };

    this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
      if (error) {
        console.error('Error enviando resultado Velocitas:', error);
      } else {
        console.log('Resultado Velocitas enviado:', payload);
      }
    });
  }

  // Enviar resultado de tiempo para Rally
  enviarResultadoRally(equipoId, tiempoSegundos) {
    const topic = 'metarobots/events/rally/arb5/result';
    const payload = {
      equipo_id: equipoId,
      tiempo_s: tiempoSegundos,
      timestamp: new Date().toISOString()
    };

    this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
      if (error) {
        console.error('Error enviando resultado Rally:', error);
      } else {
        console.log('Resultado Rally enviado:', payload);
      }
    });
  }

  // Enviar lista de equipos para Velocitas
  enviarRosterVelocitas(equipos) {
    const topic = 'metarobots/events/velocitas/arb4/roster';
    const payload = {
      equipos: equipos,
      timestamp: new Date().toISOString()
    };

    this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
      if (error) {
        console.error('Error enviando roster Velocitas:', error);
      } else {
        console.log('Roster Velocitas enviado:', payload);
      }
    });
  }

  // Enviar lista de equipos para Rally
  enviarRosterRally(equipos) {
    const topic = 'metarobots/events/rally/arb5/roster';
    const payload = {
      equipos: equipos,
      timestamp: new Date().toISOString()
    };

    this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
      if (error) {
        console.error('Error enviando roster Rally:', error);
      } else {
        console.log('Roster Rally enviado:', payload);
      }
    });
  }

  disconnect() {
    this.client.end();
  }
}

// Ejemplo de uso
const metarobots = new MetaRobotsMQTT('wss://broker.hivemq.com:8884/mqtt', {
  // username: 'tu_usuario',    // opcional
  // password: 'tu_password',   // opcional
  // clientId: 'mi_cliente'     // opcional
});

// Enviar lista de equipos para Velocitas
metarobots.enviarRosterVelocitas([
  { equipo_id: 'team001', equipo_nombre: 'Veloces Runners' },
  { equipo_id: 'team002', equipo_nombre: 'Speed Masters' }
]);

// Enviar resultado de tiempo para Velocitas (45.234 segundos)
metarobots.enviarResultadoVelocitas('team001', 45.234);

// Enviar lista de equipos para Rally
metarobots.enviarRosterRally([
  { equipo_id: 'rally001', equipo_nombre: 'Rally Champions' },
  { equipo_id: 'rally002', equipo_nombre: 'Desert Runners' }
]);

// Enviar resultado de tiempo para Rally (120.567 segundos)
metarobots.enviarResultadoRally('rally001', 120.567);
```

## Ejemplo con HTML + JavaScript (Browser)

```html
<!DOCTYPE html>
<html>
<head>
    <title>MetaRobots MQTT</title>
    <script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>
</head>
<body>
    <h1>MetaRobots MQTT Sender</h1>
    
    <div>
        <h3>Velocitas</h3>
        <input type="text" id="velocitas-equipo" placeholder="ID del equipo">
        <input type="number" id="velocitas-tiempo" placeholder="Tiempo en segundos" step="0.001">
        <button onclick="enviarVelocitas()">Enviar Resultado Velocitas</button>
    </div>

    <div>
        <h3>Rally</h3>
        <input type="text" id="rally-equipo" placeholder="ID del equipo">
        <input type="number" id="rally-tiempo" placeholder="Tiempo en segundos" step="0.001">
        <button onclick="enviarRally()">Enviar Resultado Rally</button>
    </div>

    <script>
        const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');

        client.on('connect', () => {
            console.log('Conectado al broker MQTT');
        });

        function enviarVelocitas() {
            const equipoId = document.getElementById('velocitas-equipo').value;
            const tiempo = parseFloat(document.getElementById('velocitas-tiempo').value);
            
            if (!equipoId || !tiempo) {
                alert('Por favor completa todos los campos');
                return;
            }

            const topic = 'metarobots/events/velocitas/arb4/result';
            const payload = {
                equipo_id: equipoId,
                tiempo_s: tiempo,
                timestamp: new Date().toISOString()
            };

            client.publish(topic, JSON.stringify(payload), { qos: 1 });
            console.log('Resultado Velocitas enviado:', payload);
        }

        function enviarRally() {
            const equipoId = document.getElementById('rally-equipo').value;
            const tiempo = parseFloat(document.getElementById('rally-tiempo').value);
            
            if (!equipoId || !tiempo) {
                alert('Por favor completa todos los campos');
                return;
            }

            const topic = 'metarobots/events/rally/arb5/result';
            const payload = {
                equipo_id: equipoId,
                tiempo_s: tiempo,
                timestamp: new Date().toISOString()
            };

            client.publish(topic, JSON.stringify(payload), { qos: 1 });
            console.log('Resultado Rally enviado:', payload);
        }
    </script>
</body>
</html>
```

## Brokers MQTT públicos para pruebas

- **HiveMQ**: `wss://broker.hivemq.com:8884/mqtt`
- **Eclipse Mosquitto**: `wss://test.mosquitto.org:8081/mqtt`
- **EMQX**: `wss://broker.emqx.io:8084/mqtt`

## Notas importantes

1. **Solo Velocitas y Rally**: El sistema MQTT únicamente funciona para estas dos categorías.
2. **Tiempo en segundos**: Los tiempos deben enviarse en segundos con decimales (ej: 45.234).
3. **QoS 1**: Se recomienda usar QoS 1 para garantizar entrega.
4. **Timestamp**: Opcional pero recomendado para debug.
5. **Formato de equipos**: El `equipo_id` debe ser único y el `equipo_nombre` descriptivo.