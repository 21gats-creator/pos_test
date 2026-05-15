// ── config จาก env.js ──────────────────────────────────────────
const supabaseClient = window.supabase.createClient(
    window.ENV.SUPABASE_URL,
    window.ENV.SUPABASE_ANON_KEY
);

// ── State ───────────────────────────────────────────────────────
let products = [];
let cart = [];
let currentCategory = 'ทั้งหมด';
let currentPaymentMethod = 'cash';
let promptPayPollTimer       = null;
let currentPromptPayChargeId = null;

// Modifier modal state
let currentModifierProduct = null;
let currentModifierFromScanner = false;
let currentModifierSelections = {}; // { groupId: [optionId, ...] }

// ══════════════════════════════════════════════════════
// ALERT TOAST
// ══════════════════════════════════════════════════════
function showPosAlert(message, type = 'error') {
    const alertBox = document.getElementById('pos-alert');
    if (!alertBox) { alert(message); return; }
    const colorMap = { error: 'bg-red-600', success: 'bg-green-600', info: 'bg-blue-600', warn: 'bg-yellow-500' };
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
    if (!isTouchDevice) input.focus();

    input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const barcode = input.value.trim();
        input.value = '';
        if (barcode) processBarcode(barcode);
        if (!isTouchDevice) input.focus();
    });

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
    setBarcodeInputState('success');

    const mods = parseModifiers(product.modifiers);
    const hasRequired = mods.some(g => g.required);
    if (hasRequired) {
        // มี required modifier → ต้องเลือกก่อนเพิ่ม cart
        openModifierModal(product, true);
    } else {
        // ไม่มี required modifier → เพิ่มเลยเพื่อความเร็ว
        addToCart(product, true, [], 0);
    }
}

function setBarcodeInputState(state) {
    const input = document.getElementById('barcode-input');
    if (!input) return;
    input.classList.remove('scan-error', 'scan-success');
    if (state === 'error') input.classList.add('scan-error');
    if (state === 'success') input.classList.add('scan-success');
    setTimeout(() => input.classList.remove('scan-error', 'scan-success'), 800);
}

// ══════════════════════════════════════════════════════
// PROMOTIONS
// ══════════════════════════════════════════════════════
function getActivePromo(product) {
    if (!product.promo_price || !product.promo_end) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end   = new Date(product.promo_end); end.setHours(23, 59, 59, 999);
    if (end < today) return null;
    return {
        price:  Number(product.promo_price),
        type:   product.promo_type  || 'single',
        minQty: product.promo_min_qty || 1,
        pairId: product.promo_pair_product_id || null,
        end:    product.promo_end
    };
}

// compat shim: returns price only for 'single' type
function getActivePromoPrice(product) {
    const p = getActivePromo(product);
    return (p && p.type === 'single') ? p.price : null;
}

// Subtotal for a single cart item (handles all promo types)
function cartItemSubtotal(item) {
    const promo = getActivePromo(item.product);
    const qty   = item.quantity;
    const pa    = item.priceAdd || 0;          // modifier price add per unit
    const orig  = item.product.selling_price;

    if (!promo || promo.type === 'single') {
        return item.effectivePrice * qty;       // effectivePrice already = promo+mod
    }
    if (promo.type === 'qty') {
        const minQty   = promo.minQty || 2;
        const bundles  = Math.floor(qty / minQty);
        const leftover = qty % minQty;
        return bundles * (promo.price + minQty * pa) + leftover * (orig + pa);
    }
    // 'pair': base price; discount applied separately in calculatePairDiscount()
    return item.effectivePrice * qty;
}

// Pair discount applied to the whole cart
function calculatePairDiscount() {
    let discount = 0;
    const counted = new Set();
    for (const item of cart) {
        if (counted.has(item.product.id)) continue;
        const promo = getActivePromo(item.product);
        if (!promo || promo.type !== 'pair' || !promo.pairId) continue;
        const partner = cart.find(i => i.product.id === promo.pairId);
        if (!partner) continue;
        const pairCount = Math.min(item.quantity, partner.quantity);
        const saving = (item.product.selling_price + partner.product.selling_price - promo.price) * pairCount;
        if (saving > 0) discount += saving;
        counted.add(item.product.id);
        counted.add(partner.product.id);
    }
    return discount;
}

function renderPromoSection() {
    const section = document.getElementById('promo-section');
    const scroll  = document.getElementById('promo-scroll');
    if (!section || !scroll) return;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const activePromos = products.filter(p => {
        if (!p.promo_price || !p.promo_end) return false;
        const end = new Date(p.promo_end); end.setHours(23, 59, 59, 999);
        return end >= today;
    });

    if (activePromos.length === 0) { section.classList.add('hidden'); updateSectionsDivider(); return; }

    section.classList.remove('hidden');
    scroll.innerHTML = '';
    activePromos.forEach(p => {
        const promo = getActivePromo(p);
        if (!promo) return;
        const end = new Date(p.promo_end); end.setHours(0, 0, 0, 0);
        const daysLeft = Math.round((end - today) / 86400000);
        const dayLabel = daysLeft <= 0 ? '🔥 วันสุดท้าย' : daysLeft === 1 ? '⏰ เหลือ 1 วัน' : `เหลือ ${daysLeft} วัน`;
        const availStock = (p.stock || 0) - (p.material_stock || 0);
        const isOut = availStock <= 0;
        const img = p.image_url || 'https://placehold.co/300x300?text=🔥';
        const hasMods = parseModifiers(p.modifiers).length > 0;

        // Type-specific label
        let promoLabel = '';
        if (promo.type === 'qty') {
            promoLabel = `${promo.minQty} ชิ้น ฿${promo.price}`;
        } else if (promo.type === 'pair') {
            const partner = products.find(x => x.id === promo.pairId);
            promoLabel = partner ? `คู่กับ ${partner.name}` : 'ซื้อคู่ราคาพิเศษ';
        }

        const card = document.createElement('div');
        card.className = `app-card flex-shrink-0 border-2 border-orange-300 ${isOut ? 'opacity-60' : ''}`;
        card.style.width = '160px';
        if (!isOut) card.onclick = () => openModifierModal(p, false);
        else card.style.cursor = 'default';
        card.innerHTML = `
            <div class="app-card-img-wrapper">
                <div class="stock-badge">เหลือ ${availStock}</div>
                <div class="absolute top-1 right-1 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full z-10 leading-tight">${dayLabel}</div>
                ${hasMods && !isOut ? '<div class="absolute top-6 right-1 bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full z-10">ปรับแต่งได้</div>' : ''}
                ${isOut ? '<div class="out-of-stock-layer"><span>หมด</span></div>' : ''}
                <img src="${img}" onerror="this.src='https://placehold.co/300x300?text=🔥'">
            </div>
            <div class="app-card-body">
                <div class="app-card-title">${p.name}</div>
                <div class="app-card-footer">
                    <div>
                        ${promo.type === 'single' ? `<div class="text-[9px] text-gray-400 line-through leading-none">฿${p.selling_price}</div><div class="app-card-price text-red-600">฿${promo.price}</div>` : ''}
                        ${promo.type === 'qty' ? `<div class="text-[9px] text-gray-400 line-through leading-none">฿${p.selling_price}/ชิ้น</div><div class="app-card-price text-red-600 text-xs leading-tight">${promoLabel}</div>` : ''}
                        ${promo.type === 'pair' ? `<div class="app-card-price">฿${p.selling_price}</div><div class="text-[9px] text-orange-600 font-bold leading-tight">${promoLabel}</div>` : ''}
                    </div>
                    ${!isOut ? `<div class="app-card-btn">${hasMods ? '…' : '+'}</div>` : ''}
                </div>
            </div>`;
        scroll.appendChild(card);
    });
    updateSectionsDivider();
}

async function loadBestSellers() {
    const section = document.getElementById('bestseller-section');
    if (!section || products.length === 0) return;
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: items } = await supabaseClient
            .from('order_items').select('product_id, quantity')
            .gte('created_at', thirtyDaysAgo.toISOString());
        if (!items || items.length === 0) { section.classList.add('hidden'); updateSectionsDivider(); return; }
        const totals = {};
        items.forEach(item => { totals[item.product_id] = (totals[item.product_id] || 0) + (item.quantity || 1); });
        // เฉพาะสินค้าที่ขายได้ ≥ 3 ชิ้นใน 30 วัน
        const topIds = Object.entries(totals)
            .filter(([, qty]) => qty >= 3)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8).map(([id]) => id);
        const topProducts = products.filter(p => topIds.includes(p.id))
            .sort((a, b) => (totals[b.id] || 0) - (totals[a.id] || 0));
        if (topProducts.length === 0) { section.classList.add('hidden'); updateSectionsDivider(); return; }
        renderBestSellerSection(topProducts, totals);
    } catch(e) { section.classList.add('hidden'); updateSectionsDivider(); }
}

function renderBestSellerSection(topProducts, totals) {
    const section = document.getElementById('bestseller-section');
    const scroll  = document.getElementById('bestseller-scroll');
    if (!section || !scroll) return;
    section.classList.remove('hidden');
    scroll.innerHTML = '';
    const rankEmojis = ['🥇','🥈','🥉'];
    topProducts.forEach((p, rank) => {
        const promo = getActivePromo(p);
        const promoPrice = promo?.type === 'single' ? promo.price : null;
        const displayPrice = promoPrice ?? p.selling_price;
        const availStock = (p.stock || 0) - (p.material_stock || 0);
        const isOut = availStock <= 0;
        const img = p.image_url || 'https://placehold.co/300x300?text=⭐';
        const hasMods = parseModifiers(p.modifiers).length > 0;
        const rankEmoji = rankEmojis[rank] || '⭐';
        const card = document.createElement('div');
        card.className = `app-card flex-shrink-0 border border-yellow-200 ${isOut ? 'opacity-60' : ''}`;
        card.style.width = '160px';
        if (!isOut) card.onclick = () => openModifierModal(p, false);
        else card.style.cursor = 'default';
        card.innerHTML = `
            <div class="app-card-img-wrapper">
                ${isOut ? '<div class="out-of-stock-layer"><span>หมด</span></div>' : `<div class="stock-badge">เหลือ ${availStock}</div>`}
                ${hasMods && !isOut ? '<div class="absolute top-1.5 right-1.5 bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full z-10">ปรับแต่งได้</div>' : ''}
                <div class="absolute top-0.5 left-1 text-xl leading-none z-10">${rankEmoji}</div>
                <img src="${img}" onerror="this.src='https://placehold.co/300x300?text=⭐'">
            </div>
            <div class="app-card-body">
                <div class="app-card-title">${p.name}</div>
                <div class="app-card-footer">
                    <div>
                        ${promoPrice ? `<div class="text-[9px] text-gray-400 line-through leading-none">฿${p.selling_price}</div><div class="app-card-price text-red-600">฿${displayPrice}</div>` : `<div class="app-card-price">฿${displayPrice}</div>`}
                        <div class="text-[9px] text-gray-500 font-medium">ขาย ${totals[p.id] || 0} ชิ้น/30วัน</div>
                    </div>
                    ${!isOut ? `<div class="app-card-btn">${hasMods ? '…' : '+'}</div>` : ''}
                </div>
            </div>`;
        scroll.appendChild(card);
    });
    updateSectionsDivider();
}

function updateSectionsDivider() {
    const div = document.getElementById('sections-divider');
    if (!div) return;
    const p = !document.getElementById('promo-section')?.classList.contains('hidden');
    const b = !document.getElementById('bestseller-section')?.classList.contains('hidden');
    div.classList.toggle('hidden', !p && !b);
}

// ══════════════════════════════════════════════════════
// MODIFIER MODAL
// ══════════════════════════════════════════════════════
function parseModifiers(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
    return [];
}

function openModifierModal(product, fromScanner = false) {
    const mods = parseModifiers(product.modifiers);
    if (!mods.length) {
        addToCart(product, fromScanner, [], 0);
        return;
    }

    currentModifierProduct  = product;
    currentModifierFromScanner = fromScanner;
    currentModifierSelections = {};

    // ตั้งค่า default selections
    mods.forEach(group => {
        if (group.type === 'single') {
            const def = group.options.find(o => o.default);
            if (def) {
                currentModifierSelections[group.id] = [def.id];
            } else if (group.required && group.options[0]) {
                // บังคับ + ไม่มี default → เลือก option แรกกันลืม
                currentModifierSelections[group.id] = [group.options[0].id];
            }
            // ไม่บังคับ + ไม่มี default → ไม่เลือกอะไร
        } else {
            currentModifierSelections[group.id] = group.options.filter(o => o.default).map(o => o.id);
        }
    });

    const promoPrice = getActivePromoPrice(product);
    document.getElementById('mod-product-name').textContent = product.name;
    document.getElementById('mod-product-base-price').innerHTML = promoPrice
        ? `<span class="line-through text-gray-400 text-xs">฿${product.selling_price.toLocaleString()}</span> <span class="text-red-400 font-black ml-1">฿${promoPrice.toLocaleString()} 🔥</span>`
        : `ราคาเริ่มต้น ฿${product.selling_price.toLocaleString()}`;
    renderModifierGroups(mods);
    updateModifierTotal();
    showModal('modifier-modal');
}

function renderModifierGroups(mods) {
    const container = document.getElementById('modifier-groups-container');
    container.innerHTML = '';

    mods.forEach(group => {
        const groupDiv = document.createElement('div');

        const optionsHtml = group.options.map(opt => {
            const selected = (currentModifierSelections[group.id] || []).includes(opt.id);
            const priceLabel = opt.price_add > 0
                ? `<span class="text-xs font-bold text-green-600 ml-1">+฿${opt.price_add}</span>`
                : '';
            const isSingle = group.type !== 'multi';
            const indicator = selected
                ? (isSingle ? '<span class="text-blue-600 mr-1">●</span>' : '<span class="text-green-600 mr-1">☑</span>')
                : (isSingle ? '<span class="text-gray-300 mr-1">○</span>' : '<span class="text-gray-300 mr-1">☐</span>');
            const activeClass = selected
                ? (isSingle ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-green-500 bg-green-50 text-green-800')
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300';

            return `<button type="button"
                        onclick="selectModifier('${group.id}','${opt.id}','${group.type}')"
                        class="flex items-center px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${activeClass}">
                        ${indicator}${opt.name}${priceLabel}
                    </button>`;
        }).join('');

        groupDiv.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <span class="font-black text-sm text-gray-800">${group.name}</span>
                ${group.required
                    ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">จำเป็น *</span>'
                    : '<span class="text-xs text-gray-400 font-medium">ไม่บังคับ</span>'}
            </div>
            <div class="flex flex-wrap gap-2">${optionsHtml}</div>`;
        container.appendChild(groupDiv);
    });
}

function selectModifier(groupId, optionId, type) {
    if (type === 'single') {
        currentModifierSelections[groupId] = [optionId];
    } else {
        const cur = [...(currentModifierSelections[groupId] || [])];
        const idx = cur.indexOf(optionId);
        if (idx >= 0) cur.splice(idx, 1); else cur.push(optionId);
        currentModifierSelections[groupId] = cur;
    }
    const mods = parseModifiers(currentModifierProduct.modifiers);
    renderModifierGroups(mods);
    updateModifierTotal();
}

function updateModifierTotal() {
    if (!currentModifierProduct) return;
    let total = getActivePromoPrice(currentModifierProduct) ?? currentModifierProduct.selling_price;
    parseModifiers(currentModifierProduct.modifiers).forEach(group => {
        (currentModifierSelections[group.id] || []).forEach(optId => {
            const opt = group.options.find(o => o.id === optId);
            if (opt) total += (opt.price_add || 0);
        });
    });
    document.getElementById('mod-total-price').textContent = `฿${total.toLocaleString()}`;
}

function confirmAddWithModifiers() {
    if (!currentModifierProduct) return;
    const mods = parseModifiers(currentModifierProduct.modifiers);

    // Validate required
    for (const group of mods) {
        if (group.required && !(currentModifierSelections[group.id] || []).length) {
            showPosAlert(`กรุณาเลือก: ${group.name}`);
            return;
        }
    }

    // Build snapshot + priceAdd
    const selectedModifiers = [];
    let priceAdd = 0;
    mods.forEach(group => {
        (currentModifierSelections[group.id] || []).forEach(optId => {
            const opt = group.options.find(o => o.id === optId);
            if (opt) {
                selectedModifiers.push({ group_name: group.name, option_name: opt.name, price_add: opt.price_add || 0 });
                priceAdd += opt.price_add || 0;
            }
        });
    });

    const prod = currentModifierProduct;
    const fromScanner = currentModifierFromScanner;
    closeModifierModal();
    addToCart(prod, fromScanner, selectedModifiers, priceAdd);
}

function closeModifierModal() {
    hideModal('modifier-modal');
    currentModifierProduct = null;
}

// ══════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════
async function loadProducts() {
    try {
        const { data, error } = await supabaseClient.from('products').select('*').order('name');
        if (error) throw error;
        // ซ่อน วัตถุดิบ (material) จากหน้าร้าน
        products = (data || []).filter(p => (p.product_type || 'product') !== 'material');
        renderCategories();
        filterProducts();
        renderPromoSection();
        loadBestSellers();
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
        const matchQ   = p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
        return matchCat && matchQ;
    });
    // Special sections: show only on "ทั้งหมด" tab with no search
    const showSpecial = currentCategory === 'ทั้งหมด' && !q;
    const specialEl = document.getElementById('special-sections');
    if (specialEl) specialEl.classList.toggle('hidden', !showSpecial);
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
        const availStock = (product.stock || 0) - (product.material_stock || 0);
        const isOut = availStock <= 0;
        const hasMods = parseModifiers(product.modifiers).length > 0;
        const card = document.createElement('div');
        card.className = 'app-card';
        if (isOut) { card.style.opacity = '0.6'; card.style.filter = 'grayscale(100%)'; }
        else {
            card.style.cursor = 'pointer';
            card.onclick = () => openModifierModal(product, false);
        }
        const promoPrice = getActivePromoPrice(product);
        const img = product.image_url || 'https://placehold.co/300x300?text=No+Image';
        const badge = isOut
            ? `<div class="out-of-stock-layer"><span>หมด</span></div>`
            : `<div class="stock-badge">เหลือ ${availStock}</div>`;
        const modBadge = hasMods && !isOut
            ? `<div class="absolute top-1.5 right-1.5 bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full z-10">ปรับแต่งได้</div>`
            : '';
        const promoBadge = promoPrice && !isOut
            ? `<div class="absolute bottom-1 left-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full z-10">🔥 โปร</div>`
            : '';
        const priceSection = promoPrice
            ? `<div><div class="text-[9px] text-gray-400 line-through leading-tight">฿${product.selling_price}</div><div class="app-card-price text-red-600">฿${promoPrice}</div></div>`
            : `<div class="app-card-price">฿${product.selling_price}</div>`;

        card.innerHTML = `
            <div class="app-card-img-wrapper">
                ${badge}${modBadge}${promoBadge}
                <img src="${img}" onerror="this.src='https://placehold.co/300x300?text=No+Image';">
            </div>
            <div class="app-card-body">
                <div class="app-card-title">${product.name}</div>
                <div class="app-card-footer">
                    ${priceSection}
                    ${!isOut ? `<div class="app-card-btn">${hasMods ? '…' : '+'}</div>` : ''}
                </div>
            </div>`;
        grid.appendChild(card);
    });
}

// ══════════════════════════════════════════════════════
// CART
// ══════════════════════════════════════════════════════
function buildCartKey(productId, selectedModifiers) {
    const parts = (selectedModifiers || [])
        .map(m => `${m.group_name}:${m.option_name}`)
        .sort();
    return productId + (parts.length ? '||' + parts.join('|') : '');
}

function buildModifierLabel(selectedModifiers) {
    return (selectedModifiers || []).map(m => m.option_name).join(' / ');
}

function addToCart(product, fromScanner = false, selectedModifiers = [], priceAdd = 0) {
    const pa = Number(priceAdd) || 0;
    const promo = getActivePromo(product);
    // 'single' uses promo price as base; 'qty' and 'pair' use original (discount computed at total level)
    const basePrice = (promo && promo.type === 'single') ? promo.price : product.selling_price;
    const effectivePrice = basePrice + pa;
    const cartKey = buildCartKey(product.id, selectedModifiers);
    const existing = cart.find(i => i.cartKey === cartKey);
    const qtyInCart = existing ? existing.quantity : 0;

    const availForSale = (product.stock || 0) - (product.material_stock || 0);
    if (qtyInCart >= availForSale) {
        showPosAlert('สินค้าในสต็อกไม่พอครับ!');
        return;
    }
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            cartKey,
            product,
            quantity: 1,
            selectedModifiers,
            priceAdd: pa,
            effectivePrice,
            modifierLabel: buildModifierLabel(selectedModifiers),
        });
    }
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

function updateQuantity(idx, delta) {
    if (idx < 0 || idx >= cart.length) return;
    const p = cart[idx].product;
    if (delta > 0 && cart[idx].quantity >= (p.stock || 0) - (p.material_stock || 0)) {
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
        cart.forEach((item, idx) => {
            const subtotal = cartItemSubtotal(item);
            total += subtotal;
            const promo = getActivePromo(item.product);
            // Build price line
            let priceLine = '';
            if (promo && promo.type === 'qty' && item.quantity >= promo.minQty) {
                const bundles   = Math.floor(item.quantity / promo.minQty);
                const leftover  = item.quantity % promo.minQty;
                let detail = `${bundles}×(${promo.minQty}ชิ้น/฿${promo.price})`;
                if (leftover > 0) detail += ` +${leftover}×฿${item.product.selling_price}`;
                priceLine = `<div class="text-xs text-red-600 font-bold mt-0.5">${detail} = ฿${subtotal.toLocaleString()}</div>`;
            } else if (promo && promo.type === 'pair') {
                const partnerInCart = cart.find(i => i.product.id === promo.pairId);
                const pairNote = partnerInCart ? `<span class="text-orange-500"> 🔗จับคู่</span>` : '';
                priceLine = `<div class="text-xs text-blue-600 font-bold mt-0.5">฿${item.effectivePrice.toLocaleString()} × ${item.quantity}${pairNote}</div>`;
            } else {
                priceLine = `<div class="text-xs text-blue-600 font-bold mt-0.5">฿${item.effectivePrice.toLocaleString()} <span class="text-gray-400 font-medium">× ${item.quantity}</span></div>`;
            }

            const div = document.createElement('div');
            div.className = 'bg-white p-2 rounded-xl shadow-sm border border-gray-100';
            div.innerHTML = `
                <div class="flex justify-between items-start gap-2">
                    <div class="flex-1 min-w-0">
                        <div class="text-[13px] font-bold text-gray-800 truncate">${item.product.name}</div>
                        ${item.modifierLabel ? `<div class="text-[10px] text-purple-600 font-bold mt-0.5 leading-tight">${item.modifierLabel}</div>` : ''}
                        ${priceLine}
                    </div>
                    <div class="flex items-center space-x-1 bg-gray-50 rounded-lg p-1 border shrink-0">
                        <button onclick="updateQuantity(${idx},-1)" class="w-6 h-6 font-bold text-gray-600 bg-white rounded shadow-sm text-sm">-</button>
                        <span class="w-5 text-center text-xs font-black">${item.quantity}</span>
                        <button onclick="updateQuantity(${idx},1)" class="w-6 h-6 font-bold text-blue-600 bg-white rounded shadow-sm text-sm">+</button>
                    </div>
                </div>`;
            container.appendChild(div);
        });

        // Pair discount line
        const pairDisc = calculatePairDiscount();
        if (pairDisc > 0) {
            total -= pairDisc;
            const discDiv = document.createElement('div');
            discDiv.className = 'bg-orange-50 border border-orange-200 p-2 rounded-xl text-xs';
            discDiv.innerHTML = `<div class="flex justify-between items-center"><span class="font-bold text-orange-700">🎁 ส่วนลดซื้อคู่</span><span class="font-black text-red-600">-฿${pairDisc.toLocaleString()}</span></div>`;
            container.appendChild(discDiv);
        }
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
    const cashBtn      = document.getElementById('pay-cash-btn');
    const ppBtn        = document.getElementById('pay-promptpay-btn');
    const cashSection  = document.getElementById('cash-section');
    const ppSection    = document.getElementById('promptpay-section');

    if (method === 'cash') {
        cashSection.classList.remove('hidden');
        ppSection.classList.add('hidden');
        cashBtn.classList.add('active');
        ppBtn.classList.remove('active');
        setTimeout(() => document.getElementById('received-amount').focus(), 50);
    } else {
        ppSection.classList.remove('hidden');
        cashSection.classList.add('hidden');
        ppBtn.classList.add('active');
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
function _ppApiUrl(action, extra = {}) {
    const base = (window.ENV.PROMPTPAY_API_BASE || '').replace(/\/$/, '');
    const url  = base ? `${base}/api/omise_payment.php` : 'api/omise_payment.php';
    const qs   = new URLSearchParams({ action, ...extra });
    return `${url}?${qs}`;
}

async function startPromptPayPayment() {
    const apiBase = window.ENV.PROMPTPAY_API_BASE || '';
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!apiBase && !isLocal) {
        showPosAlert('PromptPay ต้องการ XAMPP — ตั้งค่า PROMPTPAY_API_BASE ใน env.js ให้ชี้ไปที่เครื่องที่รัน XAMPP');
        return;
    }

    const total = cartTotal();
    const img     = document.getElementById('qr-code-img');
    const loader  = document.getElementById('qr-loading');
    const statusEl = document.getElementById('qr-status');

    document.getElementById('qr-amount').textContent = `฿${total.toLocaleString()}`;
    statusEl.textContent = 'กำลังสร้าง QR Code...';
    img.classList.add('hidden');
    img.src = '';
    loader.classList.remove('hidden');
    loader.innerHTML = '<div class="qr-spinner"></div>';
    showModal('promptpay-modal');

    try {
        const res  = await fetch(_ppApiUrl('create'), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: total }),
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); }
        catch { throw new Error(`PHP response ไม่ใช่ JSON: ${text.substring(0, 120)}`); }

        if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);

        if (data.qr_image) {
            img.src = data.qr_image; // onload → onQrImageLoaded()
        } else {
            loader.innerHTML = '<p class="text-sm text-red-500 font-bold text-center px-2">QR ไม่พร้อม<br>กรุณาลองใหม่</p>';
        }
        currentPromptPayChargeId = data.charge_id;
        statusEl.textContent = 'รอลูกค้าสแกน QR Code';
        promptPayPollTimer = setInterval(() => pollPromptPayStatus(data.charge_id), 3000);
    } catch (err) {
        hideModal('promptpay-modal');
        if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
            showPosAlert('เชื่อมต่อไม่ได้ — เปิด XAMPP Apache และใช้ http://localhost/ ไม่ใช่ file://');
        } else {
            showPosAlert('PromptPay: ' + err.message);
        }
        console.error('[PromptPay]', err);
    }
}

async function pollPromptPayStatus(chargeId) {
    try {
        const res  = await fetch(_ppApiUrl('status', { charge_id: chargeId }));
        const data = await res.json();
        if (data.paid) {
            clearInterval(promptPayPollTimer); promptPayPollTimer = null;
            currentPromptPayChargeId = null;
            document.getElementById('qr-status').textContent = 'ชำระเงินสำเร็จ! ✓';
            document.getElementById('qr-pulse').classList.add('hidden');
            await new Promise(r => setTimeout(r, 800));
            hideModal('promptpay-modal');
            await saveOrder('promptpay', { chargeId });
        } else if (data.status === 'failed' || data.status === 'expired') {
            clearInterval(promptPayPollTimer); promptPayPollTimer = null;
            currentPromptPayChargeId = null;
            expireQrCode();
        }
    } catch (e) { console.error('Poll error:', e); }
}

async function cancelPromptPay() {
    if (promptPayPollTimer) { clearInterval(promptPayPollTimer); promptPayPollTimer = null; }
    const chargeId = currentPromptPayChargeId;
    currentPromptPayChargeId = null;
    hideModal('promptpay-modal');

    if (chargeId) {
        try {
            const res  = await fetch(_ppApiUrl('expire'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ charge_id: chargeId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.error) {
                console.warn('[PromptPay] expire failed:', data);
                showPosAlert('ยกเลิก QR แล้ว แต่แจ้ง Omise ไม่สำเร็จ — QR จะหมดอายุเองภายใน 15 นาที', 'warn');
            }
        } catch (e) {
            console.warn('[PromptPay] expire request failed:', e);
            showPosAlert('ยกเลิก QR แล้ว แต่แจ้ง Omise ไม่สำเร็จ — QR จะหมดอายุเองภายใน 15 นาที', 'warn');
        }
    }
}

function expireQrCode() {
    // ทำให้ QR พร่ามัว + แสดงข้อความหมดอายุ
    const img      = document.getElementById('qr-code-img');
    const statusEl = document.getElementById('qr-status');
    const pulse    = document.getElementById('qr-pulse');
    if (img) img.style.filter = 'blur(4px) grayscale(1) opacity(0.4)';
    if (statusEl) statusEl.textContent = 'QR หมดอายุแล้ว';
    if (pulse) pulse.classList.add('hidden');

    // overlay ข้อความบน QR
    const qrWrap = img?.parentElement;
    if (qrWrap && !qrWrap.querySelector('#qr-expire-overlay')) {
        const ov = document.createElement('div');
        ov.id = 'qr-expire-overlay';
        ov.className = 'absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none';
        ov.innerHTML = '<div class="text-3xl">⏰</div><div class="text-xs font-black text-gray-700 bg-white/90 px-3 py-1 rounded-lg">หมดอายุ กดชำระใหม่</div>';
        qrWrap.style.position = 'relative';
        qrWrap.appendChild(ov);
    }

    showPosAlert('QR Code หมดอายุแล้ว กรุณากดชำระเงินใหม่', 'warn');
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
    const totalCost   = cart.reduce((s, i) => s + (i.product.cost_price || 0) * i.quantity, 0);
    const totalProfit = totalAmount - totalCost;
    const savedCart   = [...cart];

    try {
        const orderPayload = {
            total_amount: totalAmount, total_profit: totalProfit,
            payment_method: paymentMethod, status: 'completed',
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

        for (const item of savedCart) {
            const { error: itemErr } = await supabaseClient.from('order_items').insert([{
                order_id:            order.id,
                product_id:          item.product.id,
                quantity:            item.quantity,
                price_at_time:       cartItemSubtotal(item) / item.quantity, // ราคาต่อหน่วยจริง (รวมโปร+modifier)
                cost_at_time:        item.product.cost_price || 0,
                modifiers_snapshot:  JSON.stringify(item.selectedModifiers || []),
                modifier_price_add:  item.priceAdd || 0,
            }]);
            if (itemErr) throw itemErr;

            const { error: stockErr } = await supabaseClient
                .from('products')
                .update({ stock: item.product.stock - item.quantity })
                .eq('id', item.product.id);
            if (stockErr) throw stockErr;
        }

        showReceipt(order.id, savedCart, totalAmount, paymentMethod, options);
        cart = [];
        updateCartUI();
        loadProducts();
    } catch (err) {
        console.error('SaveOrder error:', err);
        showPosAlert('บันทึกไม่สำเร็จ: ' + (err.message || 'ลองใหม่'));
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'รับเงิน / พิมพ์บิล'; }
    }
}

// ══════════════════════════════════════════════════════
// RECEIPT
// ══════════════════════════════════════════════════════
function showReceipt(orderId, savedCart, total, paymentMethod, options = {}) {
    document.getElementById('receipt-id').textContent    = orderId.substring(0, 8).toUpperCase();
    document.getElementById('receipt-date').textContent  = new Date().toLocaleString('th-TH');
    document.getElementById('receipt-total').textContent = `฿${total.toLocaleString()}`;

    const itemsEl = document.getElementById('receipt-items');
    itemsEl.innerHTML = '';
    savedCart.forEach(item => {
        const row = document.createElement('div');
        row.className = 'py-0.5';
        const nameShort = item.product.name.substring(0, 14);
        const lineTotal = (item.effectivePrice * item.quantity).toLocaleString();
        row.innerHTML = `
            <div class="flex justify-between text-[11px]">
                <span>${item.quantity}x ${nameShort}</span><span>${lineTotal}</span>
            </div>
            ${item.modifierLabel ? `<div class="text-[9px] text-gray-500 ml-3 leading-tight">${item.modifierLabel}</div>` : ''}`;
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
    if (navigator.maxTouchPoints === 0) document.getElementById('barcode-input')?.focus();
}

// ══════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════
function cartTotal() {
    const itemsTotal = cart.reduce((s, i) => s + cartItemSubtotal(i), 0);
    return Math.max(0, itemsTotal - calculatePairDiscount());
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
    const shopNameEl = document.getElementById('receipt-shop-name');
    if (shopNameEl) shopNameEl.textContent = window.ENV.SHOP_NAME;
    const footerEl = document.getElementById('receipt-footer');
    if (footerEl) footerEl.textContent = window.ENV.SHOP_FOOTER;

    loadProducts();
    initBarcodeScanner();
};
