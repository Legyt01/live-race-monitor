import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Users, Trophy, Clock, Car, Ship } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

const Layout = ({ children, currentView, onViewChange, connectionStatus }: LayoutProps) => {
  const menuItems = [
    { id: 'central', label: 'Pantalla Central', icon: Monitor },
    { id: 'arb1', label: 'Árbitro 1 - Sumo RC', icon: Users, category: 'sumo_rc' },
    { id: 'arb2', label: 'Árbitro 2 - Sumo Autónomo', icon: Users, category: 'sumo_autonomo' },
    { id: 'arb3', label: 'Árbitro 3 - Fútbol RC', icon: Trophy, category: 'futbol_rc' },
    { id: 'arb4', label: 'Árbitro 4 - Velocitas', icon: Clock, category: 'velocitas' },
    { id: 'arb5', label: 'Árbitro 5 - Rally', icon: Car, category: 'rally' },
    { id: 'arb6', label: 'Árbitro 6 - Barcos RC', icon: Ship, category: 'barcos' },
  ];

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      default: return 'destructive';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Conectado';
      case 'connecting': return 'Conectando...';
      default: return 'Desconectado';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/10">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/b9529df2-0049-4b6d-8685-46c28194abe1.png" 
                alt="MetaRobots Logo" 
                className="h-8 w-8" 
              />
              <h1 className="text-2xl font-bold text-primary">
                MetaRobots
              </h1>
            </div>
            <Badge variant={getStatusColor() as any} className="gap-2">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-success-foreground' : connectionStatus === 'connecting' ? 'bg-warning-foreground animate-pulse' : 'bg-destructive-foreground'}`} />
              {getStatusText()}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3">
            <Card className="p-4 bg-gradient-to-b from-card to-card/50">
              <h2 className="text-lg font-semibold mb-4 text-card-foreground">Navegación</h2>
              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant={currentView === item.id ? "default" : "ghost"}
                      className={`w-full justify-start gap-3 ${
                        currentView === item.id 
                          ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => onViewChange(item.id)}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </nav>
            </Card>
          </div>

          <div className="col-span-12 lg:col-span-9">
            <Card className="p-6 bg-gradient-to-br from-card via-card/80 to-muted/20">
              {children}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;