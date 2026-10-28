// ===== CONFIRMAR PEDIDO =====
function confirmOrder() {
  if (AppState.cart.length === 0) {
    alert('Tu carrito está vacío. Agrega productos antes de confirmar.');
    return;
  }

  const customerName = document.getElementById('customerName').value.trim();
  if (!customerName) {
    alert('Por favor ingresa tu nombre para el turno.');
    document.getElementById('customerName').focus();
    return;
  }

  const orderType = document.getElementById('orderType').value;
  const paymentMethod = document.getElementById('paymentMethod').value;
  const notes = document.getElementById('orderNotes').value.trim();

  const turnoNum = `#T-${AppState.orderCounter}`;
  AppState.orderCounter++;
  saveOrderCounter();

  const newOrder = {
    id: 'ORD-' + Date.now(),
    turno: turnoNum,
    customer: customerName,
    type: orderType,
    payment: paymentMethod,
    notes,
    items: [...AppState.cart],
    total: calculateCartSubtotal(),
    status: APP_CONFIG.orderStatus.PREPARING,
    date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  AppState.currentTicket = newOrder;

  AppState.cart = [];
  updateCartUI();
  closeCartDrawer();
  playOrderBeep();

  showTicketModal(newOrder);
}

// ===== MODAL DEL TICKET =====
function showTicketModal(order) {
  document.getElementById('ticketTurnoDisplay').innerText = order.turno;
  document.getElementById('ticketCustomer').innerText = order.customer;
  document.getElementById('ticketType').innerText = order.type;
  document.getElementById('ticketPayment').innerText = order.payment;
  document.getElementById('ticketDate').innerText = order.date;
  document.getElementById('ticketTotal').innerText = `$${order.total}`;

  const notesContainer = document.getElementById('ticketNotesContainer');
  if (order.notes) {
    document.getElementById('ticketNotes').innerText = order.notes;
    notesContainer.classList.remove('hidden');
  } else {
    notesContainer.classList.add('hidden');
  }

  document.getElementById('ticketItemsList').innerHTML = order.items.map(item => `
    <div class="py-1 flex justify-between items-center text-xs">
      <span class="text-slate-300 font-medium">${item.qty}x ${item.name}</span>
      <span class="text-amber-400 font-bold">$${item.price * item.qty}</span>
    </div>
  `).join('');

  document.getElementById('ticketModal').classList.remove('hidden');
}

function closeTicketModal() {
  document.getElementById('ticketModal').classList.add('hidden');
}

// ===== WHATSAPP =====
function sendWhatsAppOrder() {
  if (!AppState.currentTicket) return;
  const t = AppState.currentTicket;

  let message = `*NUEVO PEDIDO - D’AMBIORIX HOTDOG*\n`;
  message += `*TURNO:* ${t.turno}\n`;
  message += `*Cliente:* ${t.customer}\n`;
  message += `*Tipo:* ${t.type}\n`;
  message += `*Pago:* ${t.payment}\n\n`;
  message += `*DETALLE DEL PEDIDO:*\n`;
  t.items.forEach(item => {
    message += `• ${item.qty}x ${item.name} - $${item.price * item.qty}\n`;
  });
  if (t.notes) message += `\n*Notas:* ${t.notes}\n`;
  message += `\n*TOTAL: $${t.total}*`;

  window.open(`https://wa.me/${APP_CONFIG.whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank');
}