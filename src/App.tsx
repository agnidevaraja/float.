import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Homepage } from './components/layout/Homepage';
import { WorkspaceLayout } from './components/layout/WorkspaceLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WorkspaceProvider } from './store/workspaceStore';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <WorkspaceProvider>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/workspace/*" element={
            <ErrorBoundary>
              <WorkspaceLayout />
            </ErrorBoundary>
          } />
          <Route path="/executive-report" element={<Navigate to="/workspace/deal" replace />} />
          <Route path="/ai-risk-copilot" element={<Navigate to="/workspace/copilot" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </WorkspaceProvider>
    </BrowserRouter>
  );
};

export default App;
