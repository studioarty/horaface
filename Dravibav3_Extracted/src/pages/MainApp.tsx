import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Dashboard from '@/pages/Dashboard';
import Files from '@/pages/Files';
import Storage from '@/pages/Storage';
import Shares from '@/pages/Shares';
import Users from '@/pages/Users';
import Settings from '@/pages/Settings';
import UploadDialog from '@/components/features/UploadDialog';

export default function MainApp() {
  const [activeView, setActiveView] = useState('dashboard');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  console.log('MainApp renderizado, view ativa:', activeView);

  const handleUploadClick = () => {
    console.log('Upload button clicked');
    setUploadDialogOpen(true);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'files':
        return <Files />;
      case 'storage':
        return <Storage />;
      case 'shares':
        return <Shares />;
      case 'users':
        return <Users />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  // Get current folder ID when in files view
  const getCurrentFolderId = () => {
    return activeView === 'files' ? currentFolderId : null;
  };

  return (
    <div className="flex h-screen bg-secondary/30">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onUploadClick={handleUploadClick} />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      <UploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen}
        currentFolderId={getCurrentFolderId()}
      />
    </div>
  );
}
