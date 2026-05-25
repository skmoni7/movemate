import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function NavBar({ user }) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <nav className="nav-bar">
      <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
        <div className="nav-logo">📦 MoveMate</div>
        <div className="nav-subtitle">Moving Inventory Tracker</div>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{user.displayName || user.email}</div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>{user.email}</div>
        </div>
        {user.photoURL && (
          <img src={user.photoURL} alt="avatar" style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)' }} />
        )}
        <button
          onClick={handleSignOut}
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
