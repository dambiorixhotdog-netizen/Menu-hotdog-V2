import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const supabase = createClient('https://eiphlylrwwijogoyqwns.supabase.co', 'sb_publishable_afTPTTSnyflSQpDVZLzlvA_1G08TBJp');

// ===== CONFIRMAR PEDIDO Y ENVIAR A WHATSAPP =====
async function confirmOrder() {
  if (AppState.cart.length === 0) {
    alert('Tu carrito está vacío. Agrega productos antes de confirmar.');
    return;
  }

  const customerNameInput = document.getElementById('customerName');
  const customerName = customerNameInput ? customerNameInput.value.trim() : '';
  
  if (!customerName) {
    alert('Por favor ingresa tu nombre para el turno.');
    if (customerNameInput) customerNameInput.focus();
    return;
  }

  const orderTypeInput = document.getElementById('orderType');
  const paymentMethodInput = document.getElementById('paymentMethod');
  const notesInput = document.getElementById('orderNotes');

  const orderType = orderTypeInput ? orderTypeInput.value : 'Para Llevar';
  const paymentMethod = paymentMethodInput ? paymentMethodInput.value : 'Efectivo';
  const notes = notesInput ? notesInput.value.trim() : '';

  const turnoNum = `#T-${AppState.orderCounter}`;
  AppState.orderCounter++;
  saveOrderCounter();

  const newOrder = {
    id: 'ORD-' + Date.now(),
    turno: turnoNum,
    customer: customerName,
    type: orderType,
    payment: paymentMethod,
    notes: notes,
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

  // Esperar un poco y abrir WhatsApp automáticamente
  setTimeout(() => {
    sendWhatsAppOrder(newOrder);
  }, 500);
}

// ===== MOSTRAR EL TICKET =====
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

// ===== ENVIAR A WHATSAPP =====
async function sendWhatsAppOrder(orderToSend) {
  const t = orderToSend || AppState.currentTicket;
  if (!t) return;

  let phone = APP_CONFIG.whatsappPhone;
  try {
    const { data } = await supabase.from('categories').select('whatsapp_phone').limit(1);
    if (data && data.length > 0 && data[0].whatsapp_phone) {
      phone = data[0].whatsapp_phone;
    }
  } catch (error) {
    console.warn("Usando número por defecto.");
  }

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

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// Exponer funciones al window para que los botones con "onclick" funcionen
window.confirmOrder = confirmOrder;
window.closeTicketModal = closeTicketModal;
window.sendWhatsAppOrder = sendWhatsAppOrder;