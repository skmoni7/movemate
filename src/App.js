import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import AuthPage from './components/AuthPage';
import HomePage from './components/HomePage';
import RoomPage from './components/RoomPage';
import NavBar from './components/NavBar';
import { Analytics } from '@vercel/analytics/react';

export const AuthContext = React.createContext(null);

function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  if (user === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={user}>
      <Router>
        {user && <NavBar user={user} />}
        <div className="app-container" style={{ paddingTop: user ? '24px' : '0' }}>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <AuthPage />} />
            <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" />} />
            <Route path="/room/:roomId" element={user ? <RoomPage /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
      <Analytics />
    </AuthContext.Provider>
  );
}

export default App;
