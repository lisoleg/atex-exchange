import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Trade from './pages/Trade';
import Liquidity from './pages/Liquidity';
import History from './pages/History';
import Settings from './pages/Settings';

/** ATEX 应用主入口 */
function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trade" element={<Trade />} />
        <Route path="/liquidity" element={<Liquidity />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default App;
