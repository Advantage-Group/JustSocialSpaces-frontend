// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Explore from './pages/Explore';
import Login from './pages/Login';
import LoginPassword from './pages/LoginPassword';
import PickProfilePhoto from './pages/PickProfilePhoto';
import Signup from './pages/Signup';
import LoadingScreen from './components/LoadingScreen';
import SetPassword from './components/SetPassword';
import AuthCallback from './pages/AuthCallback';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Show loading screen first */}
          <Route path="/" element={<LoadingScreen />} />
          
          {/* Authentication routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/login/password" element={<LoginPassword />} />
          <Route path="/pick-profile-photo" element={<PickProfilePhoto />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/auth-callback" element={<AuthCallback />} />
          
          {/* Protected routes with MainLayout */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          
          <Route path="/home" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          
          <Route path="/messages" element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          } />
          
          <Route path="/explore" element={
            <ProtectedRoute>
              <Explore />
            </ProtectedRoute>
          } />
          
          <Route path="/notifications" element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="/profile/:userId" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="/more" element={
            <ProtectedRoute>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>More</h2>
                <p>Additional features coming soon...</p>
              </div>
            </ProtectedRoute>
          } />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;