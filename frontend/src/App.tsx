import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Trade from './pages/Trade';
import Liquidity from './pages/Liquidity';
import History from './pages/History';
import Settings from './pages/Settings';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import WalletPage from './pages/WalletPage';
import AgentApiPage from './pages/AgentApiPage';
import NotFoundPage from './pages/NotFoundPage';

/** ATEX 应用主入口 */
function App() {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={<LoginPage />} />

      {/* 需要认证的路由 */}
      <Route path="/onboarding" element={
        <AuthGuard>
          <ErrorBoundary>
            <OnboardingPage />
          </ErrorBoundary>
        </AuthGuard>
      } />

      {/* 主应用路由 — Layout 包裹 */}
      <Route path="/" element={
        <AuthGuard>
          <Layout>
            <ErrorBoundary>
              <Dashboard />
            </ErrorBoundary>
          </Layout>
        </AuthGuard>
      } />
      <Route path="/trade" element={
        <AuthGuard>
          <Layout>
            <ErrorBoundary>
              <Trade />
            </ErrorBoundary>
          </Layout>
        </AuthGuard>
      } />
      <Route path="/liquidity" element={
        <AuthGuard>
          <Layout>
            <ErrorBoundary>
              <Liquidity />
            </ErrorBoundary>
          </Layout>
        </AuthGuard>
      } />
      <Route path="/history" element={
        <AuthGuard>
          <Layout>
            <ErrorBoundary>
              <History />
            </ErrorBoundary>
          </Layout>
        </AuthGuard>
      } />
      <Route path="/wallet" element={
        <AuthGuard>
          <Layout>
            <ErrorBoundary>
              <WalletPage />
            </ErrorBoundary>
          </Layout>
        </AuthGuard>
      } />
      <Route path="/agent-api" element={
        <AuthGuard>
          <Layout>
            <ErrorBoundary>
              <AgentApiPage />
            </ErrorBoundary>
          </Layout>
        </AuthGuard>
      } />
      <Route path="/settings" element={
        <AuthGuard>
          <Layout>
            <ErrorBoundary>
              <Settings />
            </ErrorBoundary>
          </Layout>
        </AuthGuard>
      } />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
