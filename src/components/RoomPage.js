import React, { useState, useEffect, useContext } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { AuthContext } from '../App';
import { VALUE_BANDS, getSummary } from '../utils';
import ItemForm from './ItemForm';

// Compress image file to target max size using Canvas API
// Returns a new File object (JPEG) under maxBytes
async function compressImage(file, maxBytes = 200 * 1024) {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale down if image is very large (max 1200px on longest side)
      const MAX_DIM = 1200;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Binary search for quality that hits target size
      let lo = 0.1, hi = 0.92, quality = 0.7;
      let blob;
      const attempt = (q, cb) => canvas.toBlob(cb, 'image/jpeg', q);

      const iterate = (lo, hi, iterations) => {
        quality = (lo + hi) / 2;
        attempt(quality, (b) => {
          blob = b;
          if (iterations <= 0 || Math.abs(b.size - maxBytes) < 5000) {
            // Done — wrap blob as File
            const compressed = new File([b], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
            resolve(compressed);
          } else if (b.size > maxBytes) {
            iterate(lo, quality, iterations - 1);
          } else {
            iterate(quality, hi, iterations - 1);
          }
        });
      };

      // First check — if already under limit, return as-is
      attempt(0.92, (b) => {
        if (b.size <= maxBytes) {
          const compressed = new File([b], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
          resolve(compressed);
        } else {
          iterate(lo, hi, 8); // up to 8 iterations to find right quality
        }
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fallback to original on error
    };
    img.src = objectUrl;
  });
}

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
  const [uploadingIds, setUploadingIds] = useState(new Set());

  const itemsRef = collection(db, 'users', user.uid, 'rooms', roomId, 'items');

  useEffect(() => {
    const q = query(itemsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [roomId, user.uid]);

  const uploadPhotoInBackground = async (itemDocId, photoFile, oldPhotoPath) => {
    setUploadingIds(prev => new Set(prev).add(itemDocId));
    try {
      if (oldPhotoPath) {
        try { await deleteObject(ref(storage, oldPhotoPath)); } catch (_) {}
      }
      // Compress before upload
      const compressed = await compressImage(photoFile, 200 * 1024);
      const safeFileName = compressed.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const photoPath = `users/${user.uid}/rooms/${roomId}/${Date.now()}_${safeFileName}`;
      const storageRef = ref(storage, photoPath);
      const uploadSnap = await uploadBytes(storageRef, compressed);
      const photoURL = await getDownloadURL(uploadSnap.ref);
      await updateDoc(doc(db, 'users', user.uid, 'rooms', roomId, 'items', itemDocId), {
        photoURL,
        photoPath,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error('Background photo upload failed:', err);
    } finally {
      setUploadingIds(prev => { const s = new Set(prev); s.delete(itemDocId); return s; });
    }
  };

  const saveItem = async (formData, photoFile) => {
    const { _newPhotoFile, ...cleanData } = formData;
    const data = {
      ...cleanData,
      photoURL: photoFile ? null : (cleanData.photoURL || null),
      photoPath: photoFile ? null : (cleanData.photoPath || null),
      roomId,
      updatedAt: Date.now()
    };

    let itemDocId;
    if (editItem) {
      itemDocId = editItem.id;
      await updateDoc(doc(db, 'users', user.uid, 'rooms', roomId, 'items', editItem.id), data);
    } else {
      const docRef = await addDoc(itemsRef, { ...data, createdAt: Date.now() });
      itemDocId = docRef.id;
    }

    setShowForm(false);
    setEditItem(null);

    if (photoFile && itemDocId) {
      const oldPath = editItem?.photoPath || null;
      uploadPhotoInBackground(itemDocId, photoFile, oldPath);
    }
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
              uploading={uploadingIds.has(item.id)}
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
                  uploading={uploadingIds.has(item.id)}
                />
              ))}
            </>
          )}
        </div>
      )}

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

function ItemCard({ item, onEdit, onDelete, uploading }) {
  const band = VALUE_BANDS[item.valueBand] || VALUE_BANDS[0];
  return (
    <div className={`item-card${item.leaveBehind ? ' leave-behind' : ''}`} style={{ padding: '10px 14px' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {item.photoURL ? (
          <img src={item.photoURL} alt={item.name} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📦</div>
        )}
        {uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2.5px solid #e2e8f0', borderTop: '2.5px solid #2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}
      </div>

      <div className="item-card-body" style={{ gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span className="item-card-title" style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</span>
          {item.isStorage && <span style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>📦 Storage</span>}
          {item.leaveBehind && <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>🚫 Leave Behind</span>}
          {uploading && <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 999, fontSize: 11, fontWeight: 600, padding: '2px 8px' }}>⏳ Uploading photo...</span>}
        </div>
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
