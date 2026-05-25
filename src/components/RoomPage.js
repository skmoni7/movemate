import React, { useState, useEffect, useContext } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { AuthContext } from '../App';
import { VALUE_BANDS, getSummary, validateBoxNumber } from '../utils';
import ItemForm from './ItemForm';

export default function RoomPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const user = useContext(AuthContext);
  const roomName = location.state?.roomName || 'Room';
  const roomIcon = location.state?.roomIcon || '🛏️';

  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const itemsRef = collection(db, 'users', user.uid, 'rooms', roomId, 'items');

  useEffect(() => {
    const q = query(itemsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [roomId, user.uid]);

  const saveItem = async (formData, photoFile) => {
    let photoURL = formData.photoURL || null;
    let photoPath = formData.photoPath || null;

    if (photoFile) {
      if (photoPath) {
        try { await deleteObject(ref(storage, photoPath)); } catch (_) {}
      }
      photoPath = `users/${user.uid}/rooms/${roomId}/${Date.now()}_${photoFile.name}`;
      const snap = await uploadBytes(ref(storage, photoPath), photoFile);
      photoURL = await getDownloadURL(snap.ref);
    }

    const data = { ...formData, photoURL, photoPath, roomId, updatedAt: Date.now() };

    if (editItem) {
      await updateDoc(doc(db, 'users', user.uid, 'rooms', roomId, 'items', editItem.id), data);
    } else {
      await addDoc(itemsRef, { ...data, createdAt: Date.now() });
    }
    setShowForm(false);
    setEditItem(null);
  };

  const deleteItem = async (item) => {
    if (!window.confirm('Delete this item?')) return;
    if (item.photoPath) {
      try { await deleteObject(ref(storage, item.photoPath)); } catch (_) {}
    }
    await deleteDoc(doc(db, 'users', user.uid, 'rooms', roomId, 'items', item.id));
  };

  const toggleLeaveBehind = async (item) => {
    await updateDoc(doc(db, 'users', user.uid, 'rooms', roomId, 'items', item.id), {
      leaveBehind: !item.leaveBehind
    });
  };

  const activeItems = items.filter(i => !i.leaveBehind);
  const leaveBehindItems = items.filter(i => i.leaveBehind);
  const summary = getSummary(activeItems);

  return (
    <div>
      {/* Breadcrumb + header */}
      <div style={{ marginBottom: 20 }}>
        <Link to="/" style={{ color: '#2563eb', fontSize: 14, textDecoration: 'none' }}>← All Rooms</Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 32 }}>{roomIcon}</span>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>{roomName}</h2>
              <p style={{ fontSize: 13, color: '#718096' }}>{activeItems.length} items to move{leaveBehindItems.length > 0 ? ` · ${leaveBehindItems.length} leaving behind` : ''}</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>+ Add Item</button>
        </div>
      </div>

      {/* Summary bar */}
      {activeItems.length > 0 && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', padding: '16px 20px' }}>
          {VALUE_BANDS.map((b, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#718096', fontWeight: 600 }}>{b.label}</div>
              <div className={`badge vc-${i}`} style={{ fontSize: 18, fontWeight: 800, padding: '4px 12px', marginTop: 4 }}>{summary[i]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Items */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No items yet</h3>
          <p style={{ color: '#718096', marginBottom: 20 }}>Start adding items to this room</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add First Item</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {activeItems.map(item => <ItemCard key={item.id} item={item} onEdit={() => { setEditItem(item); setShowForm(true); }} onDelete={() => deleteItem(item)} onToggleLB={() => toggleLeaveBehind(item)} />)}
          {leaveBehindItems.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
                <span style={{ fontSize: 16 }}>🚫</span>
                <span style={{ fontWeight: 700, color: '#991b1b', fontSize: 15 }}>Leave Behind ({leaveBehindItems.length})</span>
              </div>
              {leaveBehindItems.map(item => <ItemCard key={item.id} item={item} onEdit={() => { setEditItem(item); setShowForm(true); }} onDelete={() => deleteItem(item)} onToggleLB={() => toggleLeaveBehind(item)} />)}
            </>
          )}
        </div>
      )}

      {/* Item Form Modal */}
      {showForm && (
        <ItemForm
          initial={editItem}
          roomId={roomId}
          onSave={saveItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

function ItemCard({ item, onEdit, onDelete, onToggleLB }) {
  const band = VALUE_BANDS[item.valueBand] || VALUE_BANDS[0];
  return (
    <div className={`item-card${item.leaveBehind ? ' leave-behind' : ''}`}>
      {item.photoURL ? (
        <img src={item.photoURL} alt={item.name} />
      ) : (
        <div style={{ width: 80, height: 80, background: '#f3f4f6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>📦</div>
      )}
      <div className="item-card-body">
        <div className="item-card-title">{item.name}</div>
        <div className="item-card-badges">
          <span className="badge badge-gray">Qty: {item.quantity}</span>
          <span className={`badge vc-${item.valueBand}`}>{band.label}</span>
          <span className="badge badge-teal">📦 Box: {item.boxNumber}</span>
          {item.leaveBehind && <span className="badge badge-red">🚫 Leave Behind</span>}
        </div>
        {item.notes && <p style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>{item.notes}</p>}
        <div className="item-card-actions">
          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={onEdit}>✏️ Edit</button>
          <button
            onClick={onToggleLB}
            className="btn"
            style={{ padding: '6px 12px', fontSize: 13, background: item.leaveBehind ? '#d1fae5' : '#fef3c7', color: item.leaveBehind ? '#065f46' : '#92400e', border: 'none' }}
          >
            {item.leaveBehind ? '✅ Moving it' : '🚫 Leave behind'}
          </button>
          <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 13 }} onClick={onDelete}>🗑️</button>
        </div>
      </div>
    </div>
  );
}
