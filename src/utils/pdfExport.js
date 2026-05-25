export function exportToPDF(rooms, allItems, moveTitle) {
  const title = moveTitle || 'My Move';

  let html = `
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        h2 { color: #555; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f0f0f0; }
      </style>
    </head>
    <body>
      <h1>${title} - Inventory Report</h1>
  `;

  rooms.forEach(room => {
    const roomItems = allItems.filter(item => item.roomId === room.id);
    html += `<h2>${room.icon || ''} ${room.name}</h2>`;
    if (roomItems.length === 0) {
      html += '<p>No items</p>';
    } else {
      html += '<table><thead><tr><th>Item</th><th>Quantity</th><th>Value Band</th><th>Notes</th></tr></thead><tbody>';
      roomItems.forEach(item => {
        html += `<tr>
          <td>${item.name || ''}</td>
          <td>${item.quantity || 1}</td>
          <td>${item.valueBand || ''}</td>
          <td>${item.notes || ''}</td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
  });

  html += '</body></html>';

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}
