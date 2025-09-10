import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MQTTConfigProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  isConfigured: boolean;
  onConfigure: (config: {
    brokerUrl: string;
    username?: string;
    password?: string;
    clientId?: string;
  }) => void;
  onDisconnect: () => void;
}

const MQTTConfig = ({ connectionStatus, isConfigured, onConfigure, onDisconnect }: MQTTConfigProps) => {
  const [brokerUrl, setBrokerUrl] = useState('wss://broker.hivemq.com:8884/mqtt');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [clientId, setClientId] = useState('');
  const [showConfig, setShowConfig] = useState(!isConfigured);
  const { toast } = useToast();

  const handleConnect = () => {
    if (!brokerUrl.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa la URL del broker MQTT",
        variant: "destructive",
      });
      return;
    }

    onConfigure({
      brokerUrl: brokerUrl.trim(),
      username: username.trim() || undefined,
      password: password.trim() || undefined,
      clientId: clientId.trim() || undefined,
    });

    setShowConfig(false);
    toast({
      title: "Configuración guardada",
      description: "Intentando conectar al broker MQTT...",
    });
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'default';
      case 'connecting': return 'secondary';
      default: return 'destructive';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Conectado';
      case 'connecting': return 'Conectando...';
      case 'error': return 'Error';
      default: return 'Desconectado';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="h-4 w-4" />;
      case 'connecting': return <AlertCircle className="h-4 w-4 animate-pulse" />;
      default: return <WifiOff className="h-4 w-4" />;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración MQTT (Velocitas & Rally)
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor()} className="flex items-center gap-1">
              {getStatusIcon()}
              {getStatusText()}
            </Badge>
            {isConfigured && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfig(!showConfig)}
              >
                {showConfig ? 'Ocultar' : 'Configurar'}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      {showConfig && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brokerUrl">URL del Broker MQTT *</Label>
              <Input
                id="brokerUrl"
                type="text"
                value={brokerUrl}
                onChange={(e) => setBrokerUrl(e.target.value)}
                placeholder="wss://broker.hivemq.com:8884/mqtt"
              />
              <p className="text-xs text-muted-foreground">
                Ejemplos: wss://broker.hivemq.com:8884/mqtt, mqtt://localhost:1883
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID (opcional)</Label>
              <Input
                id="clientId"
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="metarobots_client"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario (opcional)</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="usuario"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña (opcional)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="contraseña"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleConnect} className="flex-1">
              {isConfigured ? 'Reconectar' : 'Conectar'}
            </Button>
            {isConfigured && (
              <Button variant="outline" onClick={onDisconnect}>
                Desconectar
              </Button>
            )}
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Información sobre Topics MQTT:</h4>
            <div className="text-sm space-y-1">
              <p><strong>Publicar resultados:</strong> <code>metarobots/events/velocitas/arb4/result</code></p>
              <p><strong>Publicar resultados:</strong> <code>metarobots/events/rally/arb5/result</code></p>
              <p><strong>Publicar roster:</strong> <code>metarobots/events/velocitas/arb4/roster</code></p>
              <p><strong>Publicar roster:</strong> <code>metarobots/events/rally/arb5/roster</code></p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default MQTTConfig;