import { useState } from 'react';
import Layout from '@/components/Layout';
import CentralDisplay from '@/components/CentralDisplay';
import ArbitroInterface from '@/components/ArbitroInterface';
import { useMQTT } from '@/hooks/useMQTT';
import { ArbitroId } from '@/types/competition';

const CompetitionApp = () => {
  const [currentView, setCurrentView] = useState('central');
  const { connectionStatus, publishRoster, publishResult, getTeamsForCategory } = useMQTT();

  const renderContent = () => {
    switch (currentView) {
      case 'central':
        return <CentralDisplay getTeamsForCategory={getTeamsForCategory} />;
      case 'arb1':
      case 'arb2':
      case 'arb3':
      case 'arb4':
      case 'arb5':
      case 'arb6':
        return (
          <ArbitroInterface
            arbitroId={currentView as ArbitroId}
            publishRoster={publishRoster}
            publishResult={publishResult}
            getTeamsForCategory={getTeamsForCategory}
          />
        );
      default:
        return <CentralDisplay getTeamsForCategory={getTeamsForCategory} />;
    }
  };

  return (
    <Layout
      currentView={currentView}
      onViewChange={setCurrentView}
      connectionStatus={connectionStatus}
    >
      {renderContent()}
    </Layout>
  );
};

export default CompetitionApp;