import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VALUE_BANDS, validateBoxNumber } from '../utils';

const EMPTY = { name: '', quantity: 1, valueBand: 0, boxNumber: '', notes: '', leaveBehind: false, photoURL: null, photoPath: null };
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

export default function ItemForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ? {
    name: initial.name || '',
    quantity: initial.quantity || 1,
    valueBand: initial.valueBand ?? 0,
    boxNumber: initial.boxNumber || '',
    notes: initial.notes || '',
    leaveBehind: initial.leaveBehind || false,
    photoURL: initial.photoURL || null,
    photoPath: initial.photoPath || null,
  } : { ...EMPTY });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(initial?.photoURL || null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  // Gemini AI suggestion state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const debounceRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fetchGeminiSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2 || !GEMINI_API_KEY) return;
    setAiLoading(true);
    try {
      const prompt = `You are a moving inventory assistant. The user is typing an item name: "${query}". Suggest 5 specific household item names that match or complete this. Return ONLY a JSON array of 5 short item name strings, nothing else. Example: ["Samsung 65\" TV", "Sony 55\" TV", "LG OLED TV", "Vizio TV", "TCL TV"]`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
          })
        }
      );
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setSuggestions(parsed.slice(0, 5));
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Gemini error:', err);
    } finally {
      setAiLoading(false);
    }
  }, []);

  const handleNameChange = (e) => {
    const val = e.target.value;
    set('name', val);
    setErrors(v => ({ ...v, name: '' }));
    setSuggestions([]);
    setShowSuggestions(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => fetchGeminiSuggestions(val.trim()), 500);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    set('name', suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Item name is required';
    const qty = Number(form.quantity);
    if (!Number.isInteger(qty) || qty < 1) e.quantity = 'Quantity must be a whole number >= 1';
    if (!validateBoxNumber(form.boxNumber)) e.boxNumber = 'Enter a box number (e.g. 1, 2, 14) or "NA"';
    return e;
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setForm(f => ({ ...f, photoURL: null, photoPath: null }));
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    await onSave({ ...form, quantity: Number(form.quantity), boxNumber: form.boxNumber.trim().toUpperCase() }, photoFile);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{initial ? 'Edit Item' : 'Add Item'}</h2>
          <button style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#718096' }} onClick={onClose}>✕</button>
        </div>

        {/* Name with Gemini AI suggestions */}
        <div className="form-group" style={{ position: 'relative' }}>
          <label>Item Name *</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              className={`form-control${errors.name ? ' error' : ''}`}
              value={form.name}
              onChange={handleNameChange}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="e.g. Samsung TV"
              autoFocus
              style={{ paddingRight: aiLoading ? '36px' : undefined }}
            />
            {aiLoading && (
              <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <div style={{
                  width: 16, height: 16, border: '2px solid #e2e8f0',
                  borderTop: '2px solid #2563eb', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite'
                }} />
              </div>
            )}
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)', overflow: 'hidden', marginTop: 2
            }}>
              <div style={{ padding: '6px 12px 4px', fontSize: 11, color: '#94a3b8', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 13 }}>✨</span> AI suggestions
              </div>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onMouseDown={() => handleSuggestionClick(s)}
                  style={{
                    padding: '9px 14px', cursor: 'pointer', fontSize: 14,
                    color: '#1e293b', borderBottom: i < suggestions.length - 1 ? '1px solid #f8fafc' : 'none',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        {/* Quantity */}
        <div className="form-group">
          <label>Quantity *</label>
          <input
            className={`form-control${errors.quantity ? ' error' : ''}`}
            type="number"
            min="1"
            step="1"
            value={form.quantity}
            onChange={e => { set('quantity', e.target.value); setErrors(v => ({ ...v, quantity: '' })); }}
          />
          {errors.quantity && <span className="error-text">{errors.quantity}</span>}
        </div>

        {/* Value Band */}
        <div className="form-group">
          <label>Value Category *</label>
          <select
            className="form-control"
            value={form.valueBand}
            onChange={e => set('valueBand', Number(e.target.value))}
          >
            {VALUE_BANDS.map((b, i) => <option key={i} value={i}>{b.label}</option>)}
          </select>
        </div>

        {/* Box Number */}
        <div className="form-group">
          <label>Box Number * <span style={{ fontWeight: 400, color: '#718096', fontSize: 12 }}>(enter a number like 1, 2, 14 or "NA")</span></label>
          <input
            className={`form-control${errors.boxNumber ? ' error' : ''}`}
            value={form.boxNumber}
            onChange={e => { set('boxNumber', e.target.value); setErrors(v => ({ ...v, boxNumber: '' })); }}
            placeholder="e.g. 1 or NA"
          />
          {errors.boxNumber && <span className="error-text">{errors.boxNumber}</span>}
        </div>

        {/* Notes */}
        <div className="form-group">
          <label>Notes <span style={{ fontWeight: 400, color: '#718096', fontSize: 12 }}>(optional)</span></label>
          <textarea
            className="form-control"
            rows={2}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Condition, special handling notes..."
          />
        </div>

        {/* Photo */}
        <div className="form-group">
          <label>Photo <span style={{ fontWeight: 400, color: '#718096', fontSize: 12 }}>(optional)</span></label>
          {photoPreview ? (
            <div style={{ position: 'relative' }}>
              <img src={photoPreview} alt="preview" className="photo-preview" />
              <button
                onClick={removePhoto}
                style={{ position: 'absolute', top: 18, right: 8, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>
          ) : (
            <div className="photo-upload-area" onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
              <div style={{ fontSize: 13, color: '#718096' }}>Click to upload photo</div>
              <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>JPG, PNG, WEBP supported</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
        </div>

        {/* Exclude from Move Toggle */}
        <div className="form-group">
          <div className="toggle-wrapper">
            <button
              className={`toggle${form.leaveBehind ? ' on' : ''}`}
              onClick={() => set('leaveBehind', !form.leaveBehind)}
              type="button"
            />
            <span className={`toggle-label${form.leaveBehind ? ' on' : ''}`}>
              {form.leaveBehind ? '🚫 Excluded from move' : 'Exclude from move'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : initial ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
      `}</style>
    </div>
  );
}
