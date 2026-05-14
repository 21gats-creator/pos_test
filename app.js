const SUPABASE_URL = 'https://opdclzrurmkfzezanmgj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZGNsenJ1cm1rZnplemFubWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjU2NDcsImV4cCI6MjA5NDM0MTY0N30.VRnEOQGb4jjOkJLyFeGc1Hpch0MQAekjjxmSl9X1gnE';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let products = [];
let cart = [];
let currentCategory = 'ทั้งหมด';

function showPosAlert(message) {
    const alertBox = document.getElementById('pos-alert');
    if(!alertBox) return alert(message);
    document.getElementById('pos-alert-text').textContent = message;
    alertBox.classList.remove('hidden'); // แสดง
    setTimeout(() => alertBox.classList.add('hidden'), 3000); // ซ่อน
}

async function loadProducts() {
    try {
        const { data, error } = await supabaseClient.from('products').select('*').order('name');
        if (error) throw error;
        products = data || [];
        renderCategories();
        filterProducts();
    } catch (error) {
        document.getElementById('product-grid').innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red; font-weight: bold; margin-top: 20px;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

function renderCategories() {
    const container = document.getElementById('category-container');
    const uniqueCats = [...new Set(products.map(p => p.category).filter(Boolean))];
    const allCats = ['ทั้งหมด', ...uniqueCats];
    
    if(container) {
        container.innerHTML = '';
        allCats.forEach(cat => {
            const btn = document.createElement('button');
            const isActive = cat === currentCategory;
            btn.className = `whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`;
            btn.textContent = cat;
            btn.onclick = () => { currentCategory = cat; renderCategories(); filterProducts(); };
            container.appendChild(btn);
        });
    }
}

function filterProducts() {
    const searchInput = document.getElementById('search-input');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    
    const filtered = products.filter(p => {
        const matchCat = currentCategory === 'ทั้งหมด' || p.category === currentCategory;
        const matchSearch = p.name.toLowerCase().includes(searchQuery) || (p.sku && p.sku.toLowerCase().includes(searchQuery));
        return matchCat && matchSearch;
    });
    renderProducts(filtered);
}

// 🔥 ดึงคลาสจาก CSS ตรงๆ ไม่มีทางเพี้ยน 🔥
function renderProducts(items) {
    const grid = document.getElementById('product-grid');
    if(!grid) return;
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #9ca3af; font-weight: bold; margin-top: 20px;">ไม่พบสินค้า...</div>';
        return;
    }

    items.forEach(product => {
        const isOutOfStock = product.stock <= 0;
        const card = document.createElement('div');
        
        card.className = 'app-card';
        if (isOutOfStock) {
            card.style.opacity = '0.6';
            card.style.filter = 'grayscale(100%)';
        } else {
            card.style.cursor = 'pointer';
            card.onclick = () => addToCart(product);
        }

        const imgUrl = product.image_url || 'https://placehold.co/300x300?text=No+Image';
        
        let badges = '';
        if (isOutOfStock) {
            badges = `<div class="out-of-stock-layer"><span>หมด</span></div>`;
        } else {
            badges = `<div class="stock-badge">เหลือ ${product.stock}</div>`;
        }

        card.innerHTML = `
            <div class="app-card-img-wrapper">
                ${badges}
                <img src="${imgUrl}" onerror="this.src='https://placehold.co/300x300?text=No+Image';">
            </div>
            <div class="app-card-body">
                <div class="app-card-title">${product.name}</div>
                <div class="app-card-footer">
                    <div class="app-card-price">฿${product.selling_price}</div>
                    ${!isOutOfStock ? `<div class="app-card-btn">+</div>` : ''}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function addToCart(product) {
    const existing = cart.find(item => item.product.id === product.id);
    const qtyInCart = existing ? existing.quantity : 0;
    if (qtyInCart >= product.stock) return showPosAlert('สินค้าในสต็อกไม่พอครับ!');

    if (existing) existing.quantity += 1;
    else cart.push({ product, quantity: 1 });
    
    updateCartUI();
    const searchInput = document.getElementById('search-input');
    if(searchInput && searchInput.value !== '') { searchInput.value = ''; filterProducts(); }
}

function updateQuantity(id, delta) {
    const index = cart.findIndex(item => item.product.id === id);
    if (index > -1) {
        if (delta > 0 && cart[index].quantity >= cart[index].product.stock) return showPosAlert('สต็อกไม่พอให้เพิ่มแล้ว!');
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) cart.splice(index, 1);
    }
    updateCartUI();
}

function clearCart() { cart = []; updateCartUI(); }

function updateCartUI() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('total-price');
    const btn = document.getElementById('checkout-btn');
    if(!container) return;

    container.innerHTML = '';
    let totalSales = 0;

    if (cart.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 mt-8 text-sm font-bold">ยังไม่มีสินค้าในบิล</div>`;
        if(btn) btn.disabled = true;
    } else {
        if(btn) btn.disabled = false;
        cart.forEach(item => {
            totalSales += item.product.selling_price * item.quantity;
            const div = document.createElement('div');
            div.className = "flex justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-gray-100";
            div.innerHTML = `
                <div class="flex-1 truncate pr-2">
                    <div class="text-[13px] font-bold text-gray-800 truncate">${item.product.name}</div>
                    <div class="text-xs text-blue-600 font-bold mt-0.5">฿${item.product.selling_price} <span class="text-gray-400 font-medium">x ${item.quantity}</span></div>
                </div>
                <div class="flex items-center space-x-1 bg-gray-50 rounded-lg p-1 border">
                    <button onclick="updateQuantity('${item.product.id}', -1)" class="w-6 h-6 font-bold text-gray-600 bg-white rounded shadow-sm">-</button>
                    <span class="w-5 text-center text-xs font-black">${item.quantity}</span>
                    <button onclick="updateQuantity('${item.product.id}', 1)" class="w-6 h-6 font-bold text-blue-600 bg-white rounded shadow-sm">+</button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    if(totalEl) totalEl.textContent = `฿${totalSales.toLocaleString()}`;
}

async function checkout() {
    if (cart.length === 0) return;
    const btn = document.getElementById('checkout-btn');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก...';

    const totalAmount = cart.reduce((sum, item) => sum + (item.product.selling_price * item.quantity), 0);
    const totalProfit = cart.reduce((sum, item) => sum + ((item.product.selling_price - (item.product.cost_price || 0)) * item.quantity), 0);

    try {
        // 1. บันทึกลงตาราง orders
        const { data: order, error: orderError } = await supabaseClient.from('orders').insert([{ total_amount: totalAmount, total_profit: totalProfit, status: 'completed' }]).select().single();
        if (orderError) throw orderError;

        // 2. บันทึกลงตาราง order_items และตัดสต็อก
        for (const item of cart) {
            const { error: itemError } = await supabaseClient.from('order_items').insert([{
                order_id: order.id, product_id: item.product.id, quantity: item.quantity,
                price_at_time: item.product.selling_price, cost_at_time: item.product.cost_price || 0
            }]);
            if (itemError) throw itemError;

            const { error: stockError } = await supabaseClient.from('products').update({ stock: item.product.stock - item.quantity }).eq('id', item.product.id);
            if (stockError) throw stockError;
        }

        showReceipt(order.id, cart, totalAmount);
        cart = []; updateCartUI(); loadProducts();
    } catch (error) {
        console.error("Checkout Error: ", error);
        // 🔥 เปลี่ยนจากคำว่าเน็ตหลุด เป็นโชว์ Error จริงๆ จาก Supabase 🔥
        showPosAlert('Error: ' + (error.message || 'บันทึกไม่สำเร็จ'));
    } finally {
        btn.textContent = 'รับเงิน / พิมพ์บิล';
    }
}

function showReceipt(orderId, savedCart, total) {
    document.getElementById('receipt-id').textContent = orderId.substring(0, 8).toUpperCase();
    document.getElementById('receipt-date').textContent = new Date().toLocaleString('th-TH');
    
    const itemsContainer = document.getElementById('receipt-items');
    itemsContainer.innerHTML = '';
    savedCart.forEach(item => {
        const row = document.createElement('div');
        row.className = "flex justify-between text-[11px] py-0.5";
        row.innerHTML = `<span>${item.quantity}x ${item.product.name.substring(0,14)}</span><span>${(item.product.selling_price * item.quantity).toLocaleString()}</span>`;
        itemsContainer.appendChild(row);
    });
    document.getElementById('receipt-total').textContent = `฿${total.toLocaleString()}`;
    document.getElementById('receipt-modal').classList.remove('hidden');
}

function closeReceipt() { document.getElementById('receipt-modal').classList.add('hidden'); }

window.onload = loadProducts;