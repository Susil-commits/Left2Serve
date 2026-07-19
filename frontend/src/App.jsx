import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './components/AuthContext';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { FavoritesProvider } from './components/Favorites';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ListFood = lazy(() => import('./pages/ListFood'));
const EditFood = lazy(() => import('./pages/EditFood'));
const BrowseFood = lazy(() => import('./pages/BrowseFood'));
const FoodDetail = lazy(() => import('./pages/FoodDetail'));
const SavedListings = lazy(() => import('./pages/SavedListings'));
const Impact = lazy(() => import('./pages/Impact'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Watchlists = lazy(() => import('./pages/Watchlists'));
const Forum = lazy(() => import('./pages/Forum'));
const ForumCategory = lazy(() => import('./pages/ForumCategory'));
const ForumPost = lazy(() => import('./pages/ForumPost'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
                <Suspense fallback={<div className="flex h-[50vh] items-center justify-center"><div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/browse" element={<BrowseFood />} />
                    <Route path="/food/:id" element={<FoodDetail />} />
                    <Route path="/saved" element={<SavedListings />} />
                    <Route path="/impact" element={<Impact />} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/list-food" element={<ProtectedRoute roles={['donor']}><ListFood /></ProtectedRoute>} />
                    <Route path="/edit-food/:id" element={<ProtectedRoute roles={['donor']}><EditFood /></ProtectedRoute>} />
                    <Route path="/watchlists" element={<ProtectedRoute roles={['ngo', 'volunteer']}><Watchlists /></ProtectedRoute>} />
                    <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
                    <Route path="/forum/:categoryId" element={<ProtectedRoute><ForumCategory /></ProtectedRoute>} />
                    <Route path="/forum/post/:postId" element={<ProtectedRoute><ForumPost /></ProtectedRoute>} />
                    <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
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