const STYLES = `
  body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
  h1 { color: #1e40af; font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  h2 { color: #1e293b; font-size: 16px; margin: 24px 0 8px; padding: 8px 12px;
       background: #f1f5f9; border-left: 4px solid #2563eb; border-radius: 4px; }
  h2.uncategorised { border-left-color: #f59e0b; background: #fffbeb; }
  h2.storage-header { border-left-color: #7c3aed; background: #f5f3ff; }
  h2.sensitive-header { border-left-color: #16a34a; background: #f0fdf4; }
  h1.storage-title { color: #7c3aed; font-size: 20px; margin: 40px 0 4px; padding-top: 24px; border-top: 2px dashed #c4b5fd; }
  h1.sensitive-title { color: #16a34a; font-size: 20px; margin: 40px 0 4px; padding-top: 24px; border-top: 2px dashed #bbf7d0; }
  
  /* --- 80% SCALED LINE ITEMS --- */
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10.5px; }
  th { background: #e2e8f0; color: #475569; padding: 5px 8px; text-align: left; font-size: 9.5px; text-transform: uppercase; }
  td { border-bottom: 1px solid #f1f5f9; padding: 5px 8px; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 1.5px 6px; border-radius: 999px; font-size: 9px; font-weight: 600; margin-right: 3px; margin-bottom: 2px; }
  /* ------------------------------- */

  .badge-box { background: #dbeafe; color: #1e40af; }
  .badge-lb { background: #fee2e2; color: #991b1b; }
  .badge-storage { background: #ede9fe; color: #5b21b6; }
  .badge-sensitive { background: #dcfce7; color: #16a34a; }
  .empty { color: #94a3b8; font-style: italic; font-size: 10.5px; padding: 6px 0; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0;
            font-size: 11px; color: #94a3b8; text-align: center; }
`;

// Sort box keys: Box 1 always first, then alphabetical for the rest
function sortBoxKeys(keys) {
  return [...keys].sort((a, b) => {
    const aStr = String(a).toUpperCase();
    const bStr = String(b).toUpperCase();
    if (aStr === '1') return -1;
    if (bStr === '1') return 1;
    return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function buildItemTable(items, extraCol) {
  if (items.length === 0) return '<p class="empty">No items</p>';
  const hasExtra = !!extraCol;
  let html = `<table><thead><tr><th>Item</th><th>Qty</th><th>Box #</th><th>Value</th><th>Notes</th><th>Status</th>${hasExtra ? `<th>${extraCol}</th>` : ''}</tr></thead><tbody>`;
  items.forEach(item => {
    const lb = item.leaveBehind ? '<span class="badge badge-lb">Excluded</span>' : '';
    const storage = item.isStorage ? '<span class="badge badge-storage">📦 Storage</span>' : '';
    const sensitive = item.isSensitive ? '<span class="badge badge-sensitive">🚗 Sensitive</span>' : '';
    const extraVal = hasExtra ? `<td>${item._extraCol || ''}</td>` : '';
    html += `<tr>
      <td><strong>${item.name || ''}</strong></td>
      <td>${item.quantity || 1}</td>
      <td><span class="badge badge-box">${item.boxNumber || 'N/A'}</span></td>
      <td>${item.valueBand !== undefined ? item.valueBand : ''}</td>
      <td>${item.notes || ''}</td>
      <td>${lb}${storage}${sensitive}</td>
      ${extraVal}
    </tr>`;
  });
  html += '</tbody></table>';
  return html;
}

function buildStorageSection(allItems, rooms) {
  const storageItems = allItems.filter(i => i.isStorage);
  if (storageItems.length === 0) return '';

  const roomMap = {};
  if (rooms) rooms.forEach(r => { roomMap[r.id] = r; });

  const boxMap = {};
  storageItems.forEach(item => {
    const key = (item.boxNumber && item.boxNumber.trim() !== '' && item.boxNumber.trim().toUpperCase() !== 'NA')
      ? item.boxNumber.trim().toUpperCase()
      : 'NO BOX';
    if (!boxMap[key]) boxMap[key] = [];
    boxMap[key].push(item);
  });

  const sortedKeys = sortBoxKeys(Object.keys(boxMap));

  let html = `<h1 class="storage-title">📦 Storage Items Report</h1>`;
  html += `<p class="subtitle">All items marked as storage (${storageItems.length} total)</p>`;

  sortedKeys.forEach(boxKey => {
    const boxItems = boxMap[boxKey]
      .map(item => ({
        ...item,
        _extraCol: roomMap[item.roomId] ? `${roomMap[item.roomId].icon || ''} ${roomMap[item.roomId].name}` : (item.roomId || 'No Room')
      }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const label = boxKey === 'NO BOX' ? '⚠️ No Box Assigned' : `📦 Box ${boxKey}`;
    html += `<h2 class="storage-header">${label} (${boxItems.length} item${boxItems.length !== 1 ? 's' : ''})</h2>`;
    html += buildItemTable(boxItems, 'Room');
  });

  return html;
}

function buildSensitiveSection(allItems, rooms) {
  const sensitiveItems = allItems.filter(i => i.isSensitive);
  if (sensitiveItems.length === 0) return '';

  const roomMap = {};
  if (rooms) rooms.forEach(r => { roomMap[r.id] = r; });

  let html = `<h1 class="sensitive-title">🚗 Sensitive Items Report</h1>`;
  html += `<p class="subtitle">Personal transport only — DO NOT pack in moving truck (${sensitiveItems.length} total)</p>`;

  const mappedItems = sensitiveItems.map(item => ({
    ...item,
    _extraCol: roomMap[item.roomId] ? `${roomMap[item.roomId].icon || ''} ${roomMap[item.roomId].name}` : (item.roomId || 'No Room')
  })).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  html += `<h2 class="sensitive-header">Chain of Custody: User Vehicle</h2>`;
  html += buildItemTable(mappedItems, 'Room');

  return html;
}

function openPrintWindow(html, title) {
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}

export function exportByRoom(rooms, allItems, moveTitle) {
  const title = moveTitle || 'My Move';
  const date = new Date().toLocaleDateString();
  let html = `<html><head><title>${title} - By Room</title><style>${STYLES}</style></head><body>`;
  html += `<h1>📦 ${title} — Inventory by Room</h1><p class="subtitle">Exported on ${date}</p>`;

  let hasAnyItem = false;
  rooms.forEach(room => {
    const roomItems = allItems
      .filter(i => i.roomId === room.id)
      .sort((a, b) => {
        const aKey = (a.boxNumber || 'ZZZ').trim().toUpperCase();
        const bKey = (b.boxNumber || 'ZZZ').trim().toUpperCase();
        if (aKey === '1') return -1;
        if (bKey === '1') return 1;
        return aKey.localeCompare(bKey, undefined, { numeric: true, sensitivity: 'base' });
      });
    if (roomItems.length > 0) hasAnyItem = true;
    html += `<h2>${room.icon || '🛏️'} ${room.name} (${roomItems.length})</h2>`;
    html += buildItemTable(roomItems);
  });

  const roomIds = rooms.map(r => r.id);
  const uncategorised = allItems.filter(i => !i.roomId || !roomIds.includes(i.roomId));
  if (uncategorised.length > 0) {
    html += `<h2 class="uncategorised">⚠️ Uncategorised (${uncategorised.length})</h2>`;
    html += buildItemTable(uncategorised);
  }

  if (!hasAnyItem && uncategorised.length === 0) {
    html += '<p class="empty">No items found.</p>';
  }

  html += buildStorageSection(allItems, rooms);
  html += buildSensitiveSection(allItems, rooms); // Adds the new Sensitive section

  html += `<div class="footer">Generated by MoveMate &bull; ${title} &bull; ${date} &bull; Developed with ❤️ by skm</div>`;
  html += '</body></html>';
  openPrintWindow(html, title);
}

export function exportByBox(rooms, allItems, moveTitle) {
  const title = moveTitle || 'My Move';
  const date = new Date().toLocaleDateString();
  let html = `<html><head><title>${title} - By Box</title><style>${STYLES}</style></head><body>`;
  html += `<h1>📦 ${title} — Inventory by Box Number</h1><p class="subtitle">Exported on ${date}</p>`;

  // 1. Create a lookup dictionary for room names and icons
  const roomMap = {};
  if (rooms) rooms.forEach(r => { roomMap[r.id] = r; });

  const boxMap = {};
  allItems.forEach(item => {
    const key = (item.boxNumber && item.boxNumber.trim() !== '' && item.boxNumber.trim().toUpperCase() !== 'NA')
      ? item.boxNumber.trim().toUpperCase()
      : null;
    if (key) {
      if (!boxMap[key]) boxMap[key] = [];
      boxMap[key].push(item);
    }
  });

  const sortedKeys = sortBoxKeys(Object.keys(boxMap));

  if (sortedKeys.length > 0) {
    sortedKeys.forEach(boxKey => {
      // 2. Inject the room name into the '_extraCol' property for each item
      const boxItems = [...boxMap[boxKey]]
        .map(item => ({
          ...item,
          _extraCol: roomMap[item.roomId] ? `${roomMap[item.roomId].icon || ''} ${roomMap[item.roomId].name}` : (item.roomId || 'No Room')
        }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
      html += `<h2>📦 Box ${boxKey} (${boxItems.length} item${boxItems.length !== 1 ? 's' : ''})</h2>`;
      // 3. Trigger the extra column by passing 'Room' as the second parameter
      html += buildItemTable(boxItems, 'Room'); 
    });
  }

  // 4. Do the exact same mapping for Uncategorised/NA items
  const uncategorised = allItems
    .filter(i => !i.boxNumber || i.boxNumber.trim() === '' || i.boxNumber.trim().toUpperCase() === 'NA')
    .map(item => ({
      ...item,
      _extraCol: roomMap[item.roomId] ? `${roomMap[item.roomId].icon || ''} ${roomMap[item.roomId].name}` : (item.roomId || 'No Room')
    }));
    
  if (uncategorised.length > 0) {
    html += `<h2 class="uncategorised">⚠️ Uncategorised / No Box (${uncategorised.length})</h2>`;
    html += buildItemTable(uncategorised, 'Room');
  }

  if (sortedKeys.length === 0 && uncategorised.length === 0) {
    html += '<p class="empty">No items found.</p>';
  }

  html += buildStorageSection(allItems, rooms);
  html += buildSensitiveSection(allItems, rooms);

  html += `<div class="footer">Generated by MoveMate &bull; ${title} &bull; ${date} &bull; Developed with ❤️ by skm</div>`;
  html += '</body></html>';
  openPrintWindow(html, title);
}

export function exportToPDF(rooms, allItems, moveTitle) {
  exportByRoom(rooms, allItems, moveTitle);
}
