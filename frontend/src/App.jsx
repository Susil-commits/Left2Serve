import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { FavoritesProvider } from './components/Favorites';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ListFood from './pages/ListFood';
import EditFood from './pages/EditFood';
import BrowseFood from './pages/BrowseFood';
import FoodDetail from './pages/FoodDetail';
import SavedListings from './pages/SavedListings';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <FavoritesProvider>
              <ErrorBoundary>
            <div className="min-h-screen bg-white text-text flex flex-col">
              <Navbar />
              <main id="main-content" className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/browse" element={<BrowseFood />} />
                  <Route path="/food/:id" element={<FoodDetail />} />
                  <Route path="/saved" element={<SavedListings />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/list-food" element={<ProtectedRoute roles={['donor']}><ListFood /></ProtectedRoute>} />
                  <Route path="/edit-food/:id" element={<ProtectedRoute roles={['donor']}><EditFood /></ProtectedRoute>} />
                  <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </ErrorBoundary>
            </FavoritesProvider>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}