import React, { useState, useEffect, useContext } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../App';
import { VALUE_BANDS, getSummary } from '../utils';
import ItemForm from './ItemForm';

// Compress image and return base64 string (JPEG, max ~150KB)
async function compressToBase64(file, maxBytes = 150 * 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const MAX_DIM = 800;
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
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
        if (blob.size <= maxBytes) {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        } else {
          let lo = 0.1, hi = 0.7;
          const iterate = (lo, hi, iters) => {
            const q = (lo + hi) / 2;
            canvas.toBlob((b) => {
              if (!b) { reject(new Error('toBlob failed')); return; }
              if (iters <= 0 || Math.abs(b.size - maxBytes) < 3000) {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(b);
              } else if (b.size > maxBytes) {
                iterate(lo, q, iters - 1);
              } else {
                iterate(q, hi, iters - 1);
              }
            }, 'image/jpeg', q);
          };
          iterate(lo, hi, 8);
        }
      }, 'image/jpeg', 0.7);
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

export default function RoomPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const roomName = location.state?.roomName || roomId;
  const { user } = useContext(AuthContext);

  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'rooms', roomId, 'items'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user, roomId]);

  const closeForm = () => { setShowForm(false); setEditItem(null); };

  const saveItem = async (formData, photoFile) => {
    setSavingItem(true);
    try {
      const { _newPhotoFile, photoPath, ...data } = formData;
      if (photoFile) {
        try {
          data.photoURL = await compressToBase64(photoFile, 150 * 1024);
        } catch (err) {
          console.error('Image compression failed:', err);
        }
      } else if (editItem && editItem.photoURL && !photoFile) {
        data.photoURL = editItem.photoURL;
      }
      if (editItem) {
        await updateDoc(
          doc(db, 'users', user.uid, 'rooms', roomId, 'items', editItem.id),
          { ...data, updatedAt: Date.now() }
        );
      } else {
        await addDoc(
          collection(db, 'users', user.uid, 'rooms', roomId, 'items'),
          { ...data, createdAt: Date.now() }
        );
      }
      closeForm();
    } catch (err) {
      console.error('Save item error:', err);
      alert('Error saving item: ' + err.message);
    } finally {
      setSavingItem(false);
    }
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'rooms', roomId, 'items', itemId));
  };

  const leaveBehindItems = items.filter((i) => i.leaveBehind);
  const movingItems = items.filter((i) => !i.leaveBehind);

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#6b7280', fontSize: '14px' }}>
          ← Back
        </Link>
        <h2 style={{ margin: 0, fontSize: '20px', flex: 1 }}>{roomName}</h2>
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          style={{
            background: '#7c3aed', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px'
          }}
        >
          + Add Item
        </button>
      </div>

      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px 16px 0 0',
            padding: '24px', width: '100%', maxWidth: '600px',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{editItem ? 'Edit Item' : 'Add Item'}</h3>
              <button onClick={closeForm}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
              >×</button>
            </div>
            <ItemForm
              initial={editItem}
              onSave={saveItem}
              onClose={closeForm}
              saving={savingItem}
            />
          </div>
        </div>
      )}

      {movingItems.length === 0 && leaveBehindItems.length === 0 && (
        <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '40px' }}>No items yet. Tap + Add Item to start.</p>
      )}

      {movingItems.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          onEdit={() => { setEditItem(item); setShowForm(true); }}
          onDelete={() => deleteItem(item.id)}
        />
      ))}

      {leaveBehindItems.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h4 style={{ color: '#ef4444', marginBottom: '8px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🚫 Leave Behind ({leaveBehindItems.length})
          </h4>
          {leaveBehindItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={() => { setEditItem(item); setShowForm(true); }}
              onDelete={() => deleteItem(item.id)}
              dimmed
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, onEdit, onDelete, dimmed }) {
  return (
    <div style={{
      display: 'flex', gap: '10px', alignItems: 'flex-start',
      background: dimmed ? '#fef2f2' : '#fff',
      border: `1px solid ${dimmed ? '#fecaca' : '#e5e7eb'}`,
      borderRadius: '10px', padding: '10px', marginBottom: '8px',
      opacity: dimmed ? 0.8 : 1
    }}>
      <div style={{
        width: '60px', height: '60px', borderRadius: '8px',
        background: '#f3f4f6', flexShrink: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {item.photoURL ? (
          <img src={item.photoURL} alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '24px' }}>📦</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>{item.name}</span>
          {item.isStorage && (
            <span style={{
              background: '#ede9fe', color: '#7c3aed', fontSize: '11px',
              padding: '1px 6px', borderRadius: '999px', fontWeight: 600
            }}>📦 Storage</span>
          )}
          {item.leaveBehind && (
            <span style={{
              background: '#fee2e2', color: '#ef4444', fontSize: '11px',
              padding: '1px 6px', borderRadius: '999px', fontWeight: 600
            }}>🚫 Leave Behind</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: '#6b7280' }}>
          {item.quantity && <span>Qty: {item.quantity}</span>}
          {item.value && <span>· {item.value}</span>}
          {item.boxNumber && <span>· Box {item.boxNumber}</span>}
          {item.notes && <span style={{ fontStyle: 'italic' }}>· {item.notes}</span>}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            <button onClick={onEdit} style={{
              background: '#ede9fe', color: '#7c3aed', border: 'none',
              borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', fontSize: '12px'
            }}>Edit</button>
            <button onClick={onDelete} style={{
              background: '#fee2e2', color: '#ef4444', border: 'none',
              borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', fontSize: '12px'
            }}>Del</button>
          </span>
        </div>
      </div>
    </div>
  );
}
