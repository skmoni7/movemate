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
      // Delete old photo if replacing
      if (photoPath) {
        try { await deleteObject(ref(storage, photoPath)); } catch (_) {}
      }
      const safeFileName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      photoPath = `users/${user.uid}/rooms/${roomId}/${Date.now()}_${safeFileName}`;
      try {
        const storageRef = ref(storage, photoPath);
        const uploadSnap = await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(uploadSnap.ref);
      } catch (err) {
        console.error('Photo upload failed:', err);
        photoURL = null;
        photoPath = null;
      }
    }

    // Strip internal-only fields before saving
    const { _newPhotoFile, ...cleanData } = formData;
    const data = { ...cleanData, photoURL, photoPath, roomId, updatedAt: Date.now() };

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {activeItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={() => { setEditItem(item); setShowForm(true); }}
              onDelete={() => deleteItem(item)}
            />
          ))}
          {leaveBehindItems.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
                <span style={{ fontSize: 16 }}>🚫</span>
                <span style={{ fontWeight: 700, color: '#991b1b', fontSize: 15 }}>Leave Behind ({leaveBehindItems.length})</span>
              </div>
              {leaveBehindItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onEdit={() => { setEditItem(item); setShowForm(true); }}
                  onDelete={() => deleteItem(item)}
                />
              ))}
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

function ItemCard({ item, onEdit, onDelete }) {
  const band = VALUE_BANDS[item.valueBand] || VALUE_BANDS[0];
  return (
    <div className={`item-card${item.leaveBehind ? ' leave-behind' : ''}`} style={{ padding: '10px 14px' }}>
      {/* Thumbnail */}
      {item.photoURL ? (
        <img src={item.photoURL} alt={item.name} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>📦</div>
      )}

      <div className="item-card-body" style={{ gap: 4 }}>
        {/* Line 1: Name + storage/lb badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span className="item-card-title" style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
          {item.isStorage && (
            <span style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>📦 Storage</span>
          )}
          {item.leaveBehind && (
            <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>🚫 Leave Behind</span>
          )}
        </div>

        {/* Line 2: Qty + Value + Box + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span className="badge badge-gray" style={{ fontSize: 12 }}>Qty: {item.quantity}</span>
          <span className={`badge vc-${item.valueBand}`} style={{ fontSize: 12 }}>{band.label}</span>
          <span className="badge badge-teal" style={{ fontSize: 12 }}>📦 Box: {item.boxNumber}</span>
          {item.notes && <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>{item.notes}</span>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={onEdit}>✏️ Edit</button>
            <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={onDelete}>🗑️</button>
          </div>
        </div>
      </div>
    </div>
  );
}
