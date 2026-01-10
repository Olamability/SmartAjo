import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import Providers from '@/components/Providers';
import ProtectedRoute from '@/components/ProtectedRoute';

// Pages
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import GroupsPage from '@/pages/GroupsPage';
import CreateGroupPage from '@/pages/CreateGroupPage';

function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/groups" 
              element={
                <ProtectedRoute>
                  <GroupsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/groups/create" 
              element={
                <ProtectedRoute>
                  <CreateGroupPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Router>
      </Providers>
    </ErrorBoundary>
  );
}

export default App;
