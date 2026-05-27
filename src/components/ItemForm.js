import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VALUE_BANDS, validateBoxNumber } from '../utils';

const EMPTY = { name: '', quantity: 1, valueBand: 0, boxNumber: '', notes: '', leaveBehind: false, isStorage: false, isSensitive: false, photoURL: null, photoPath: null };
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

export default function ItemForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ? {
    name: initial.name || '',
    quantity: initial.quantity || 1,
    valueBand: initial.valueBand ?? 0,
    boxNumber: initial.boxNumber || '',
    notes: initial.notes || '',
    leaveBehind: initial.leaveBehind || false,
    isStorage: initial.isStorage || false,
    isSensitive: initial.isSensitive || false,
    photoURL: initial.photoURL || null,
    photoPath: initial.photoPath || null,
  } : { ...EMPTY });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(initial?.photoURL || null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef();
  const galleryRef = useRef();

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
      setAiLoading(false);
    } catch (err) {
      console.error('Gemini suggestion error:', err);
      setAiLoading(false);
    }
  }, []);

  const handleNameChange = (e) => {
    const val = e.target.value;
    set('name', val);
    setErrors(v => ({ ...v, name: '' }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => fetchGeminiSuggestions(val.trim()), 800);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    set('name', suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
      set('_newPhotoFile', true);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    set('photoURL', null);
    set('photoPath', null);
    set('_newPhotoFile', false);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.quantity || form.quantity < 1) e.quantity = 'Must be at least 1';
    
    if (!form.boxNumber || !form.boxNumber.toString().trim()) {
      e.boxNumber = 'Box number is required (enter a number or NA)';
    }
    
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setSaving(true);
    
    // The .toString() here prevents crashes if the box number is an integer
    const safeBoxNumber = form.boxNumber ? form.boxNumber.toString().trim().toUpperCase() : 'NA';
    
    await onSave({ ...form, quantity: Number(form.quantity), boxNumber: safeBoxNumber }, photoFile);
    setSaving(false);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Name */}
      <div style={{ position: 'relative' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: '#374151' }}>Item Name *</label>
        <input
          style={{
            width: '100%', padding: '10px', fontSize: '15px', border: `1px solid ${errors.name ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '8px', outline: 'none'
          }}
          value={form.name}
          onChange={handleNameChange}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="e.g. Samsung 65in TV"
        />
        {aiLoading && <span style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>✨ Loading suggestions...</span>}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff',
            border: '1px solid #d1d5db', borderRadius: '8px', marginTop: '4px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000, maxHeight: '200px', overflowY: 'auto'
          }}>
            <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#7c3aed', borderBottom: '1px solid #e5e7eb' }}>
              ✨ AI Suggestions
            </div>
            {suggestions.map((s, i) => (
              <div
                key={i}
                onClick={() => handleSuggestionClick(s)}
                style={{
                  padding: '10px 12px', fontSize: '14px', cursor: 'pointer',
                  borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                {s}
              </div>
            ))}
          </div>
        )}
        {errors.name && <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px' }}>{errors.name}</span>}
      </div>

      {/* Quantity */}
      <div>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: '#374151' }}>Quantity *</label>
        <input
          type="number"
          min="1"
          step="1"
          style={{
            width: '100%', padding: '10px', fontSize: '15px', border: `1px solid ${errors.quantity ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '8px', outline: 'none'
          }}
          value={form.quantity}
          onChange={e => { set('quantity', e.target.value); setErrors(v => ({ ...v, quantity: '' })); }}
        />
        {errors.quantity && <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px' }}>{errors.quantity}</span>}
      </div>

      {/* Value Band */}
      <div>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: '#374151' }}>Value Category *</label>
        <select
          style={{
            width: '100%', padding: '10px', fontSize: '15px', border: '1px solid #d1d5db',
            borderRadius: '8px', outline: 'none', background: '#fff'
          }}
          value={form.valueBand}
          onChange={e => set('valueBand', Number(e.target.value))}
        >
          {VALUE_BANDS.map((b, i) => <option key={i} value={i}>{b.label}</option>)}
        </select>
      </div>

      {/* Box Number */}
      <div>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: '#374151' }}>Box Number *</label>
        <input
          type="text"
          style={{
            width: '100%', padding: '10px', fontSize: '15px', border: `1px solid ${errors.boxNumber ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '8px', outline: 'none', textTransform: 'uppercase'
          }}
          value={form.boxNumber}
          onChange={e => { set('boxNumber', e.target.value); setErrors(v => ({ ...v, boxNumber: '' })); }}
          placeholder="e.g. 1 or NA"
        />
        {errors.boxNumber && <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px' }}>{errors.boxNumber}</span>}
      </div>

      {/* Notes */}
      <div>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: '#374151' }}>Notes (optional)</label>
        <textarea
          rows={2}
          style={{
            width: '100%', padding: '10px', fontSize: '15px', border: '1px solid #d1d5db',
            borderRadius: '8px', outline: 'none', fontFamily: 'inherit', resize: 'vertical'
          }}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any extra details..."
        />
      </div>

      {/* Photo */}
      <div>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: '#374151' }}>Photo (optional)</label>
        {photoPreview ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={photoPreview}
              alt="preview"
              style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #d1d5db' }}
            />
            <button
              type="button"
              onClick={removePhoto}
              style={{
                position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: '#fff',
                border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '16px'
              }}
            >×</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              style={{
                flex: 1, padding: '10px', background: '#ede9fe', color: '#7c3aed', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600
              }}
            >📷 Take Photo</button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              style={{
                flex: 1, padding: '10px', background: '#ede9fe', color: '#7c3aed', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600
              }}
            >🖼️ From Library</button>
          </div>
        )}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
        <input ref={galleryRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
      </div>

      {/* Checkboxes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={form.isStorage}
            onChange={e => {
              const checked = e.target.checked;
              set('isStorage', checked);
              if (checked) set('isSensitive', false); // Turn off Sensitive if Storage is checked
            }}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span>📦 Mark as <strong>Storage Item</strong></span>
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={form.isSensitive}
            onChange={e => {
              const checked = e.target.checked;
              set('isSensitive', checked);
              if (checked) set('isStorage', false); // Turn off Storage if Sensitive is checked
            }}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span>🚗 Mark as <strong>Sensitive Item</strong> (carry in personal vehicle)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={form.leaveBehind}
            onChange={e => set('leaveBehind', e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span>🚫 <strong>Leave Behind</strong> (exclude from move)</span>
        </label>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          style={{
            flex: 1, padding: '12px', background: '#f3f4f6', color: '#374151', border: 'none',
            borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: 600
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          style={{
            flex: 1, padding: '12px', background: saving ? '#d1d5db' : '#7c3aed', color: '#fff', border: 'none',
            borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: 600
          }}
        >
          {saving ? 'Saving...' : initial ? 'Save Changes' : 'Add Item'}
        </button>
      </div>
    </div>
  );
}
