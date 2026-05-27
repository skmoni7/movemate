import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../App';
import { VALUE_BANDS, ROOM_SUGGESTIONS, ROOM_ICONS, getSummary } from '../utils';
import { exportByRoom, exportByBox } from '../utils/pdfExport';

export default function HomePage() {
  const user = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomIcon, setRoomIcon] = useState('🛏️');
  const [moveTitle, setMoveTitle] = useState(() => localStorage.getItem('moveTitle') || 'My Move');  const [editTitle, setEditTitle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const roomsRef = collection(db, 'users', user.uid, 'rooms');

  useEffect(() => {
    const q = query(roomsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    if (rooms.length === 0) return;
    const unsubs = [];
    const itemMap = {};
    rooms.forEach(room => {
      const iRef = collection(db, 'users', user.uid, 'rooms', room.id, 'items');
      const unsub = onSnapshot(iRef, snap => {
        // The roomId: room.id tag is added here so the PDF knows its origin
        itemMap[room.id] = snap.docs.map(d => ({ id: d.id, roomId: room.id, ...d.data() }));
        setAllItems(Object.values(itemMap).flat());
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach(u => u());
  }, [rooms, user.uid]);
    useEffect(() => {
    localStorage.setItem('moveTitle', moveTitle);
  }, [moveTitle]);

  const addRoom = async () => {
    if (!roomName.trim()) return;
    await addDoc(roomsRef, { name: roomName.trim(), icon: roomIcon, createdAt: Date.now() });
    setRoomName('');
    setRoomIcon('🛏️');
    setShowAddRoom(false);
  };

  const deleteRoom = async (roomId) => {
    if (window.confirm('Delete this room and all its items?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'rooms', roomId));
    }
  };

  const totalSummary = getSummary(allItems.filter(i => !i.leaveBehind));
  const leaveBehindItems = allItems.filter(i => i.leaveBehind);
  const leaveBehindSummary = getSummary(leaveBehindItems);
  const getRoomItems = (roomId) => allItems.filter(i => i.roomId === roomId && !i.leaveBehind);
  const getRoomLeaveBehind = (roomId) => allItems.filter(i => i.roomId === roomId && i.leaveBehind);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          {editTitle ? (
            <input
              className="form-control"
              value={moveTitle}
              onChange={e => setMoveTitle(e.target.value)}
              onBlur={() => setEditTitle(false)}
              onKeyDown={e => e.key === 'Enter' && setEditTitle(false)}
              autoFocus
              style={{ fontSize: 22, fontWeight: 700, padding: '6px 12px' }}
            />
          ) : (
            <h1 style={{ fontSize: 24, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setEditTitle(true)}>
              {moveTitle} <span style={{ fontSize: 16, color: '#a0aec0' }}>✏️</span>
            </h1>
          )}
          <p style={{ color: '#718096', fontSize: 14, marginTop: 2 }}>{rooms.length} rooms • {allItems.filter(i => !i.leaveBehind).length} items to move</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setShowExportModal(true)}>
            📄 Export PDF
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddRoom(true)}>
            + Add Room
          </button>
        </div>
      </div>

      {/* Total summary card */}
      {allItems.filter(i => !i.leaveBehind).length > 0 && (
        <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: 'white', border: 'none' }}>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, marginBottom: 10 }}>TOTAL MOVE SUMMARY</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {VALUE_BANDS.map((b, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: 10 }}>
                <div style={{ fontSize: 11, opacity: 0.75 }}>{b.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{totalSummary[i]}</div>
                <div style={{ fontSize: 11, opacity: 0.75 }}>items</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rooms grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : rooms.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No rooms yet</h3>
          <p style={{ color: '#718096', marginBottom: 20 }}>Add your first room to start tracking your move inventory</p>
          <button className="btn btn-primary" onClick={() => setShowAddRoom(true)}>+ Add Your First Room</button>
        </div>
      ) : (
        <div className="grid-3" style={{ marginBottom: 24 }}>
          {rooms.map(room => {
            const items = getRoomItems(room.id);
            const lb = getRoomLeaveBehind(room.id);
            const summary = getSummary(items);
            return (
              <div key={room.id} style={{ position: 'relative' }}>
                <Link to={`/room/${room.id}`} className="room-card" state={{ roomName: room.name, roomIcon: room.icon }}>
                  <div className="room-card-icon">{room.icon}</div>
                  <div className="room-card-name">{room.name}</div>
                  <div className="room-card-count">{items.length} items to move{lb.length > 0 ? ` • ${lb.length} leaving` : ''}</div>
                  <div className="summary-strip">
                    {VALUE_BANDS.map((b, i) => summary[i] > 0 && (
                      <span key={i} className={`summary-chip vc-${i}`}>{b.short}: {summary[i]}</span>
                    ))}
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); deleteRoom(room.id); }}
                  style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16 }}
                  title="Delete room"
                >✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Leave Behind Summary */}
      {leaveBehindItems.length > 0 && (
        <div className="card" style={{ border: '1.5px dashed #fca5a5', background: '#fff7f7', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🚫</span>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: '#991b1b' }}>Leave Behind ({leaveBehindItems.length} items)</h3>
          </div>
          <p style={{ fontSize: 13, color: '#718096', marginBottom: 12 }}>These items are NOT included in the move totals above</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {VALUE_BANDS.map((b, i) => leaveBehindSummary[i] > 0 && (
              <div key={i} style={{ background: '#fee2e2', padding: '8px 14px', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: '#991b1b' }}>{b.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#991b1b' }}>{leaveBehindSummary[i]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 className="modal-title">📄 Export Inventory</h2>
              <button style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#718096' }} onClick={() => setShowExportModal(false)}>✕</button>
            </div>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Choose how you'd like to organize your PDF export</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                className="btn"
                onClick={() => { exportByRoom(rooms, allItems, moveTitle); setShowExportModal(false); }}
                style={{ padding: '14px 18px', background: '#eff6ff', color: '#1e40af', border: '1.5px solid #bfdbfe', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14 }}
              >
                <span style={{ fontSize: 20 }}>🛏️</span>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>By Room</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Group items by each room (Kitchen, Bedroom, etc.)</div>
                </div>
              </button>
              <button
                className="btn"
                onClick={() => { exportByBox(rooms, allItems, moveTitle); setShowExportModal(false); }}
                style={{ padding: '14px 18px', background: '#fef3c7', color: '#92400e', border: '1.5px solid #fde68a', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 14 }}
              >
                <span style={{ fontSize: 20 }}>📦</span>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>By Box Number</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Group items by box number (Box 1, Box 2, etc.)</div>
                </div>
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 16 }}>Items without a room or box will be listed under "Uncategorised"</p>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="modal-overlay" onClick={() => setShowAddRoom(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Room</h2>
              <button style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#718096' }} onClick={() => setShowAddRoom(false)}>✕</button>
            </div>
            <div className="form-group">
              <label>Room Name</label>
              <input
                className="form-control"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRoom()}
                placeholder="e.g. Master Bedroom"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ROOM_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setRoomIcon(icon)}
                    style={{ fontSize: 24, padding: '6px 10px', borderRadius: 8, border: roomIcon === icon ? '2px solid #2563eb' : '1px solid #e2e8f0', background: roomIcon === icon ? '#eff6ff' : 'white', cursor: 'pointer' }}
                  >{icon}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Suggestions</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ROOM_SUGGESTIONS.map(s => (
                  <button
                    key={s.name}
                    onClick={() => { setRoomName(s.name); setRoomIcon(s.icon); }}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddRoom(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addRoom} disabled={!roomName.trim()}>Add Room</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
