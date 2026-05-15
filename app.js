// ── config โหลดจาก env.js ──────────────────────────────────────
const supabaseClient = window.supabase.createClient(
    window.ENV.SUPABASE_URL,
    window.ENV.SUPABASE_ANON_KEY
);

let products = [];
let cart = [];
let currentCategory = 'ทั้งหมด';
let currentPaymentMethod = 'cash';
let promptPayPollTimer = null;

// ══════════════════════════════════════════════════════
// ALERT TOAST
// ══════════════════════════════════════════════════════

function showPosAlert(message, type = 'error') {
    const alertBox = document.getElementById('pos-alert');
    if (!alertBox) { alert(message); return; }

    const colorMap = {
        error:   'bg-red-600',
        success: 'bg-green-600',
        info:    'bg-blue-600',
        warn:    'bg-yellow-500',
    };
    alertBox.className = `fixed top-4 right-4 ${colorMap[type] || colorMap.error} text-white px-5 py-3 rounded-xl shadow-lg z-[60] font-bold text-sm transition-all`;
    document.getElementById('pos-alert-text').textContent = message;
    alertBox.classList.remove('hidden');
    clearTimeout(alertBox._hideTimer);
    alertBox._hideTimer = setTimeout(() => alertBox.classList.add('hidden'), 3000);
}

// ══════════════════════════════════════════════════════
// BARCODE SCANNER
// ══════════════════════════════════════════════════════

function initBarcodeScanner() {
    const input = document.getElementById('barcode-input');
    if (!input) return;

    const isTouchDevice = navigator.maxTouchPoints > 0;

    // Desktop: auto-focus เพื่อรับ barcode ทันที
    if (!isTouchDevice) input.focus();

    input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const barcode = input.value.trim();
        input.value = '';
        if (barcode) processBarcode(barcode);
        if (!isTouchDevice) input.focus();
    });

    // คลิกที่ว่างในหน้า → focus กลับที่ barcode input
    document.addEventListener('click', (e) => {
        const clickedInteractive = e.target.closest('input, button, select, textarea, a, [data-no-barcode-focus]');
        if (!clickedInteractive && !isTouchDevice) input.focus();
    });
}

function processBarcode(barcode) {
    const product = products.find(p => p.sku && p.sku.trim() === barcode.trim());

    if (!product) {
        setBarcodeInputState('error');
        showPosAlert(`ไม่พบบาร์โค้ด: ${barcode}`);
        return;
    }
    if (product.stock <= 0) {
        showPosAlert(`สินค้าหมด: ${product.name}`, 'warn');
        return;
    }

    addToCart(product, true);
    setBarcodeInputState('success');
}

function setBarcodeInputState(state) {
    const input = document.getElementById('barcode-input');
    if (!input) return;
    input.classList.remove('scan-error', 'scan-success');
    if (state === 'error') input.classList.add('scan-error');
    if (state === 'success') input.classList.add('scan-success');
    setTimeout(() => {
        input.classList.remove('scan-error', 'scan-success');
    }, 800);
}

// ══════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════

async function loadProducts() {
    try {
        const { data, error } = await supabaseClient.from('products').select('*').order('name');
        if (error) throw error;
        products = data || [];
        renderCategories();
        filterProducts();
    } catch (err) {
        const grid = document.getElementById('product-grid');
        if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:red;font-weight:bold;margin-top:20px;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

function renderCategories() {
    const container = document.getElementById('category-container');
    if (!container) return;
    const cats = ['ทั้งหมด', ...[...new Set(products.map(p => p.category).filter(Boolean))]];
    container.innerHTML = '';
    cats.forEach(cat => {
        const btn = document.createElement('button');
        const isActive = cat === currentCategory;
        btn.className = `whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`;
        btn.textContent = cat;
        btn.onclick = () => { currentCategory = cat; renderCategories(); filterProducts(); };
        container.appendChild(btn);
    });
}

function filterProducts() {
    const q = (document.getElementById('search-input')?.value || '').toLowerCase();
    const filtered = products.filter(p => {
        const matchCat = currentCategory === 'ทั้งหมด' || p.category === currentCategory;
        const matchSearch = p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
        return matchCat && matchSearch;
    });
    renderProducts(filtered);
}

function renderProducts(items) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#9ca3af;font-weight:bold;margin-top:20px;">ไม่พบสินค้า...</div>';
        return;
    }

    items.forEach(product => {
        const isOut = product.stock <= 0;
        const card = document.createElement('div');
        card.className = 'app-card';
        if (isOut) { card.style.opacity = '0.6'; card.style.filter = 'grayscale(100%)'; }
        else { card.style.cursor = 'pointer'; card.onclick = () => addToCart(product); }

        const img = product.image_url || 'https://placehold.co/300x300?text=No+Image';
        const badge = isOut
            ? `<div class="out-of-stock-layer"><span>หมด</span></div>`
            : `<div class="stock-badge">เหลือ ${product.stock}</div>`;

        card.innerHTML = `
            <div class="app-card-img-wrapper">
                ${badge}
                <img src="${img}" onerror="this.src='https://placehold.co/300x300?text=No+Image';">
            </div>
            <div class="app-card-body">
                <div class="app-card-title">${product.name}</div>
                <div class="app-card-footer">
                    <div class="app-card-price">฿${product.selling_price}</div>
                    ${!isOut ? `<div class="app-card-btn">+</div>` : ''}
                </div>
            </div>`;
        grid.appendChild(card);
    });
}

// ══════════════════════════════════════════════════════
// CART
// ══════════════════════════════════════════════════════

function addToCart(product, fromScanner = false) {
    const existing = cart.find(i => i.product.id === product.id);
    const qtyInCart = existing ? existing.quantity : 0;

    if (qtyInCart >= product.stock) {
        showPosAlert('สินค้าในสต็อกไม่พอครับ!');
        return;
    }

    if (existing) existing.quantity += 1;
    else cart.push({ product, quantity: 1 });

    updateCartUI();

    if (fromScanner) {
        showPosAlert(`เพิ่ม: ${product.name}`, 'success');
        const barcodeInput = document.getElementById('barcode-input');
        if (barcodeInput && navigator.maxTouchPoints === 0) barcodeInput.focus();
    } else {
        const searchInput = document.getElementById('search-input');
        if (searchInput?.value) { searchInput.value = ''; filterProducts(); }
    }
}

function updateQuantity(id, delta) {
    const idx = cart.findIndex(i => i.product.id === id);
    if (idx < 0) return;
    if (delta > 0 && cart[idx].quantity >= cart[idx].product.stock) {
        showPosAlert('สต็อกไม่พอให้เพิ่มแล้ว!');
        return;
    }
    cart[idx].quantity += delta;
    if (cart[idx].quantity <= 0) cart.splice(idx, 1);
    updateCartUI();
}

function clearCart() { cart = []; updateCartUI(); }

function updateCartUI() {
    const container = document.getElementById('cart-items');
    const totalEl   = document.getElementById('total-price');
    const btn       = document.getElementById('checkout-btn');
    if (!container) return;

    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 mt-8 text-sm font-bold">ยังไม่มีสินค้าในบิล</div>`;
        if (btn) btn.disabled = true;
    } else {
        if (btn) btn.disabled = false;
        cart.forEach(item => {
            total += item.product.selling_price * item.quantity;
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-gray-100';
            div.innerHTML = `
                <div class="flex-1 truncate pr-2">
                    <div class="text-[13px] font-bold text-gray-800 truncate">${item.product.name}</div>
                    <div class="text-xs text-blue-600 font-bold mt-0.5">฿${item.product.selling_price} <span class="text-gray-400 font-medium">x ${item.quantity}</span></div>
                </div>
                <div class="flex items-center space-x-1 bg-gray-50 rounded-lg p-1 border">
                    <button onclick="updateQuantity('${item.product.id}', -1)" class="w-6 h-6 font-bold text-gray-600 bg-white rounded shadow-sm">-</button>
                    <span class="w-5 text-center text-xs font-black">${item.quantity}</span>
                    <button onclick="updateQuantity('${item.product.id}', 1)" class="w-6 h-6 font-bold text-blue-600 bg-white rounded shadow-sm">+</button>
                </div>`;
            container.appendChild(div);
        });
    }
    if (totalEl) totalEl.textContent = `฿${total.toLocaleString()}`;
}

// ══════════════════════════════════════════════════════
// PAYMENT MODAL
// ══════════════════════════════════════════════════════

function openPaymentModal() {
    if (cart.length === 0) return;
    const total = cartTotal();
    document.getElementById('payment-total-amount').textContent = `฿${total.toLocaleString()}`;
    document.getElementById('received-amount').value = '';
    document.getElementById('change-amount').textContent = '฿0.00';
    document.getElementById('change-amount').className = 'text-2xl font-black text-green-600';
    selectPaymentMethod('cash');
    showModal('payment-modal');
}

function closePaymentModal() { hideModal('payment-modal'); }

function selectPaymentMethod(method) {
    currentPaymentMethod = method;
    const cashBtn       = document.getElementById('pay-cash-btn');
    const promptpayBtn  = document.getElementById('pay-promptpay-btn');
    const cashSection   = document.getElementById('cash-section');
    const ppSection     = document.getElementById('promptpay-section');

    if (method === 'cash') {
        cashSection.classList.remove('hidden');
        ppSection.classList.add('hidden');
        cashBtn.classList.add('active');
        promptpayBtn.classList.remove('active');
        setTimeout(() => document.getElementById('received-amount').focus(), 50);
    } else {
        ppSection.classList.remove('hidden');
        cashSection.classList.add('hidden');
        promptpayBtn.classList.add('active');
        cashBtn.classList.remove('active');
    }
}

function updateCashChange() {
    const total    = cartTotal();
    const received = parseFloat(document.getElementById('received-amount').value) || 0;
    const change   = received - total;
    const el       = document.getElementById('change-amount');
    el.textContent = `฿${Math.abs(change).toFixed(2)}${change < 0 ? ' (ไม่พอ)' : ''}`;
    el.className   = `text-2xl font-black ${change >= 0 ? 'text-green-600' : 'text-red-500'}`;
}

function setQuickCash(amount) {
    document.getElementById('received-amount').value = amount;
    updateCashChange();
}

function setExactCash() {
    document.getElementById('received-amount').value = cartTotal();
    updateCashChange();
}

async function confirmPayment() {
    if (currentPaymentMethod === 'cash') {
        const total    = cartTotal();
        const received = parseFloat(document.getElementById('received-amount').value) || 0;
        if (received < total) { showPosAlert('รับเงินมาไม่พอครับ!'); return; }
        closePaymentModal();
        await saveOrder('cash', { receivedAmount: received, changeAmount: received - total });
    } else {
        closePaymentModal();
        await startPromptPayPayment();
    }
}

// ══════════════════════════════════════════════════════
// PROMPTPAY QR PAYMENT
// ══════════════════════════════════════════════════════

async function startPromptPayPayment() {
    const total   = cartTotal();
    const img     = document.getElementById('qr-code-img');
    const loader  = document.getElementById('qr-loading');
    const statusEl = document.getElementById('qr-status');

    // Reset UI
    document.getElementById('qr-amount').textContent = `฿${total.toLocaleString()}`;
    statusEl.textContent = 'กำลังสร้าง QR Code...';
    img.classList.add('hidden');
    img.src = '';
    loader.classList.remove('hidden');
    loader.innerHTML = '<div class="qr-spinner"></div>';

    showModal('promptpay-modal');

    try {
        const res = await fetch('api/omise_payment.php?action=create', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ amount: total }),
        });

        // ดึง text ก่อนเสมอ แล้วค่อย parse JSON เพื่อให้ debug ง่าย
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`PHP ส่ง response ไม่ถูกต้อง (ไม่ใช่ JSON): ${text.substring(0, 120)}`);
        }

        if (!res.ok || !data.success) {
            throw new Error(data.error || `HTTP ${res.status}`);
        }

        // แสดง QR image (base64 data URI จาก PHP proxy)
        if (data.qr_image) {
            img.src = data.qr_image;
            // onload handler (onQrImageLoaded) จะแสดง img และซ่อน loader
        } else {
            loader.innerHTML = '<p class="text-sm text-red-500 font-bold text-center px-2">ไม่ได้รับ QR Image<br>กรุณาลองใหม่</p>';
        }

        statusEl.textContent = 'รอลูกค้าสแกน QR Code';

        // Poll ทุก 3 วินาที
        promptPayPollTimer = setInterval(() => pollPromptPayStatus(data.charge_id), 3000);

    } catch (err) {
        hideModal('promptpay-modal');
        // แยก network error ออกจาก API error
        if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
            showPosAlert('เชื่อมต่อไม่ได้ — ตรวจสอบว่า XAMPP Apache กำลังทำงานอยู่ และเปิดผ่าน http://localhost/ ไม่ใช่ file://');
        } else {
            showPosAlert('PromptPay: ' + err.message);
        }
        console.error('[PromptPay]', err);
    }
}

async function pollPromptPayStatus(chargeId) {
    try {
        const res  = await fetch(`api/omise_payment.php?action=status&charge_id=${encodeURIComponent(chargeId)}`);
        const data = await res.json();

        if (data.paid) {
            clearInterval(promptPayPollTimer);
            document.getElementById('qr-status').textContent = 'ชำระเงินสำเร็จ! ✓';
            await new Promise(r => setTimeout(r, 800));
            hideModal('promptpay-modal');
            await saveOrder('promptpay', { chargeId });
        }
    } catch (e) {
        console.error('Poll error:', e);
    }
}

function cancelPromptPay() {
    if (promptPayPollTimer) { clearInterval(promptPayPollTimer); promptPayPollTimer = null; }
    hideModal('promptpay-modal');
}

function onQrImageLoaded() {
    document.getElementById('qr-code-img').classList.remove('hidden');
    document.getElementById('qr-loading').classList.add('hidden');
}

// ══════════════════════════════════════════════════════
// SAVE ORDER → Supabase
// ══════════════════════════════════════════════════════

async function saveOrder(paymentMethod, options = {}) {
    const btn = document.getElementById('checkout-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }

    const totalAmount = cartTotal();
    const totalProfit = cart.reduce((s, i) => s + ((i.product.selling_price - (i.product.cost_price || 0)) * i.quantity), 0);
    const savedCart   = [...cart];

    try {
        // สร้าง order record
        const orderPayload = {
            total_amount:   totalAmount,
            total_profit:   totalProfit,
            payment_method: paymentMethod,
            status:         'completed',
        };
        if (paymentMethod === 'cash') {
            orderPayload.received_amount = options.receivedAmount;
            orderPayload.change_amount   = options.changeAmount;
        }
        if (paymentMethod === 'promptpay') {
            orderPayload.omise_charge_id = options.chargeId;
        }

        const { data: order, error: orderErr } = await supabaseClient
            .from('orders').insert([orderPayload]).select().single();
        if (orderErr) throw orderErr;

        // บันทึก order items + ตัดสต็อก
        for (const item of savedCart) {
            const { error: itemErr } = await supabaseClient.from('order_items').insert([{
                order_id:      order.id,
                product_id:    item.product.id,
                quantity:      item.quantity,
                price_at_time: item.product.selling_price,
                cost_at_time:  item.product.cost_price || 0,
            }]);
            if (itemErr) throw itemErr;

            const { error: stockErr } = await supabaseClient
                .from('products')
                .update({ stock: item.product.stock - item.quantity })
                .eq('id', item.product.id);
            if (stockErr) throw stockErr;
        }

        // แสดงใบเสร็จ
        showReceipt(order.id, savedCart, totalAmount, paymentMethod, options);
        cart = [];
        updateCartUI();
        loadProducts();

    } catch (err) {
        console.error('SaveOrder error:', err);
        showPosAlert('บันทึกไม่สำเร็จ: ' + (err.message || 'กรุณาลองใหม่'));
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'รับเงิน / พิมพ์บิล'; }
    }
}

// ══════════════════════════════════════════════════════
// RECEIPT
// ══════════════════════════════════════════════════════

function showReceipt(orderId, savedCart, total, paymentMethod, options = {}) {
    document.getElementById('receipt-id').textContent   = orderId.substring(0, 8).toUpperCase();
    document.getElementById('receipt-date').textContent = new Date().toLocaleString('th-TH');
    document.getElementById('receipt-total').textContent = `฿${total.toLocaleString()}`;

    const itemsEl = document.getElementById('receipt-items');
    itemsEl.innerHTML = '';
    savedCart.forEach(item => {
        const row = document.createElement('div');
        row.className = 'flex justify-between text-[11px] py-0.5';
        row.innerHTML = `<span>${item.quantity}x ${item.product.name.substring(0, 14)}</span><span>${(item.product.selling_price * item.quantity).toLocaleString()}</span>`;
        itemsEl.appendChild(row);
    });

    const payInfoEl = document.getElementById('receipt-payment-info');
    if (payInfoEl) {
        const methodLabel = paymentMethod === 'cash' ? 'เงินสด' : 'PromptPay';
        let html = `<div>วิธีชำระ: ${methodLabel}</div>`;
        if (paymentMethod === 'cash') {
            html += `<div>รับมา: ฿${(options.receivedAmount || 0).toLocaleString()}</div>`;
            html += `<div>เงินทอน: ฿${(options.changeAmount || 0).toLocaleString()}</div>`;
        }
        payInfoEl.innerHTML = html;
    }

    document.getElementById('receipt-modal').classList.remove('hidden');
}

function closeReceipt() {
    document.getElementById('receipt-modal').classList.add('hidden');
    // คืน focus ไปที่ barcode input หลังปิดบิล
    if (navigator.maxTouchPoints === 0) {
        document.getElementById('barcode-input')?.focus();
    }
}

// ══════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════

function cartTotal() {
    return cart.reduce((s, i) => s + (i.product.selling_price * i.quantity), 0);
}

function showModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'flex';
    requestAnimationFrame(() => el.classList.remove('hidden'));
}

function hideModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('hidden');
    el.style.display = 'none';
}

// ══════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════

window.onload = () => {
    // ตั้งค่าจาก ENV
    const shopNameEl = document.getElementById('receipt-shop-name');
    if (shopNameEl) shopNameEl.textContent = window.ENV.SHOP_NAME;
    const footerEl = document.getElementById('receipt-footer');
    if (footerEl) footerEl.textContent = window.ENV.SHOP_FOOTER;

    loadProducts();
    initBarcodeScanner();
};
