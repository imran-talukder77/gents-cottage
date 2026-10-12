// ============================================================================
// GENTS COTTAGE - ADMIN PANEL
// ============================================================================

import {
    app, db, collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc,
    serverTimestamp, writeBatch, escapeHTML, formatPrice, slugify,
    DEFAULT_CATEGORIES, DEFAULT_SETTINGS, DEFAULT_SIZES, getSettings,
    normalizeProduct, sortSizes, stockOf, runTransaction
} from "./store.js";

import { products as demoProducts } from "./products.js";

import {
    getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const auth = getAuth(app);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));


// ============================================================================
// STATE
// ============================================================================

const state = {
    products: [],
    isDemo: false,          // true while showing built-in demo products
    categories: [],
    orders: [],
    settings: { ...DEFAULT_SETTINGS },
    view: "dashboard"
};

const VIEW_TITLES = {
    dashboard: "Dashboard",
    products: "Products",
    categories: "Categories",
    orders: "Orders",
    customers: "Customers",
    settings: "Store & Landing Page"
};


// ============================================================================
// UTILITIES
// ============================================================================

let toastTimer;
function toast(message, isError = false) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.toggle("error", isError);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

function handleError(error, fallback = "Something went wrong.") {
    console.error(error);
    if (error && error.code === "permission-denied") {
        toast("Permission denied. Publish the firestore.rules file (see README).", true);
    } else {
        toast(fallback, true);
    }
}

function orderCode(order) {
    const d = order.createdAtDate
        ? order.createdAtDate.toISOString().slice(0, 10).replace(/-/g, "")
        : "--------";
    return "GC-" + d + "-" + order.id.slice(0, 3).toUpperCase();
}

function fmtDate(d) {
    if (!d) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function categoryName(slug) {
    const c = state.categories.find(c => c.slug === slug || c.id === slug);
    return c ? c.name : slug;
}

// ============================================================================
// LOGIN / LOGOUT
// ============================================================================

$("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#login-error");
    err.textContent = "";
    try {
        await signInWithEmailAndPassword(
            auth, $("#admin-email").value.trim(), $("#admin-password").value
        );
    } catch (error) {
        console.error(error);
        err.textContent = "Invalid email or password.";
    }
});

$("#logout-btn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    $("#admin-login").hidden = !!user;
    $("#admin-page").hidden = !user;
    if (user) loadEverything();
});


// ============================================================================
// DATA LOADING
// ============================================================================

async function loadEverything() {
    await Promise.all([loadSettings(), loadCategories(), loadProducts(), loadOrders()]);
    renderAll();
}

async function loadSettings() {
    state.settings = await getSettings();
    fillSettingsForm();
}

async function loadCategories() {
    try {
        const snap = await getDocs(collection(db, "categories"));
        if (snap.empty) {
            // First run: save the default categories
            const batch = writeBatch(db);
            DEFAULT_CATEGORIES.forEach(c => batch.set(doc(db, "categories", c.id), {
                name: c.name, slug: c.slug, order: c.order
            }));
            await batch.commit();
            state.categories = DEFAULT_CATEGORIES.slice();
        } else {
            state.categories = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.order || 0) - (b.order || 0));
        }
    } catch (error) {
        handleError(error, "Could not load categories.");
        state.categories = DEFAULT_CATEGORIES.slice();
    }
}

async function loadProducts() {
    try {
        const snap = await getDocs(collection(db, "products"));
        if (snap.empty && !state.settings.seeded) {
            state.isDemo = true;
            state.products = demoProducts.map(p => normalizeProduct(p, p.id));
        } else {
            state.isDemo = false;
            state.products = snap.docs
                .map(d => normalizeProduct(d.data(), d.id))
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
    } catch (error) {
        handleError(error, "Could not load products.");
    }
}

async function loadOrders() {
    try {
        const snap = await getDocs(collection(db, "orders"));
        state.orders = snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                status: data.status || "Pending",
                createdAtDate: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : null
            };
        }).sort((a, b) => (b.createdAtDate || 0) - (a.createdAtDate || 0));
    } catch (error) {
        handleError(error, "Could not load orders.");
    }
}


// ============================================================================
// NAVIGATION
// ============================================================================

function showView(name) {
    state.view = name;
    $$(".view").forEach(v => v.hidden = v.id !== "view-" + name);
    $$(".nav-item[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === name));
    $("#view-title").textContent = VIEW_TITLES[name];
    closeSidebar();
    window.scrollTo({ top: 0 });
}

$$(".nav-item[data-view]").forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-goto]");
    if (g) showView(g.dataset.goto);
});

function closeSidebar() {
    $("#sidebar").classList.remove("open");
    $("#sidebar-backdrop").classList.remove("open");
}
$("#menu-toggle").addEventListener("click", () => {
    $("#sidebar").classList.add("open");
    $("#sidebar-backdrop").classList.add("open");
});
$("#sidebar-backdrop").addEventListener("click", closeSidebar);


function renderAll() {
    renderDashboard();
    renderProducts();
    renderCategories();
    renderOrders();
    renderCustomers();
}


// ============================================================================
// DASHBOARD
// ============================================================================

function renderDashboard() {
    const orders = state.orders;
    const active = orders.filter(o => o.status !== "Cancelled");
    const revenue = orders.filter(o => o.status === "Delivered")
        .reduce((s, o) => s + (o.totalPrice || 0), 0);
    const pending = orders.filter(o => o.status === "Pending").length;
    const customers = new Set(orders.map(o => o.customerPhone)).size;

    const stats = [
        ["fa-bangladeshi-taka-sign", "tone-gold", "Revenue (delivered)", formatPrice(revenue)],
        ["fa-box", "tone-blue", "Total orders", orders.length],
        ["fa-clock", "tone-amber", "Pending orders", pending],
        ["fa-shirt", "tone-green", "Products", state.isDemo ? demoProducts.length : state.products.length],
        ["fa-users", "tone-purple", "Customers", customers],
        ["fa-triangle-exclamation", "tone-red", "Low / sold-out products",
            state.isDemo ? 0 : state.products.filter(p => p.tracked && p.totalStock <= 5).length]
    ];

    $("#stat-grid").innerHTML = stats.map(([icon, tone, label, value]) => `
        <div class="stat">
            <div class="stat-icon ${tone}"><i class="fa-solid ${icon}"></i></div>
            <div><span>${label}</span><strong>${value}</strong></div>
        </div>`).join("");

    // Pending badge in sidebar
    const badge = $("#nav-pending");
    badge.textContent = pending;
    badge.hidden = pending === 0;

    // Last 7 days chart
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        days.push(d);
    }
    const counts = days.map(d => orders.filter(o =>
        o.createdAtDate && o.createdAtDate.toDateString() === d.toDateString()).length);
    const max = Math.max(1, ...counts);

    $("#orders-chart").innerHTML = days.map((d, i) => `
        <div class="bar-col">
            <b>${counts[i]}</b>
            <div class="bar" style="height:${(counts[i] / max) * 100}%"></div>
            <small>${d.toLocaleDateString("en-GB", { weekday: "short" })}</small>
        </div>`).join("");

    // Top products
    const sold = {};
    active.forEach(o => (o.products || []).forEach(p => {
        sold[p.name] = (sold[p.name] || 0) + (p.quantity || 0);
    }));
    const top = Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 5);
    $("#top-products").innerHTML = top.length ? top.map(([name, qty]) => {
        const p = state.products.find(p => p.name === name);
        return `<div class="top-row">
            <img src="${escapeHTML(p ? p.image : "image/logo.png")}" alt="">
            <div><strong>${escapeHTML(name)}</strong><span>${qty} sold</span></div>
        </div>`;
    }).join("") : `<div class="empty">No sales yet.</div>`;

    // Recent orders
    const recent = orders.slice(0, 6);
    $("#recent-orders").innerHTML = recent.length ? `
        <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>${recent.map(o => `
            <tr>
                <td>${orderCode(o)}</td>
                <td>${escapeHTML(o.customerName)}</td>
                <td>${fmtDate(o.createdAtDate)}</td>
                <td><b>${formatPrice(o.totalPrice)}</b></td>
                <td><span class="status status-${o.status.toLowerCase()}">${o.status}</span></td>
            </tr>`).join("")}</tbody>` : `<tbody><tr><td class="empty">No orders yet.</td></tr></tbody>`;
}


// ============================================================================
// PRODUCTS
// ============================================================================

function renderProducts() {
    // category filter
    const filter = $("#product-category-filter");
    const current = filter.value || "all";
    filter.innerHTML = `<option value="all">All categories</option>` +
        state.categories.map(c => `<option value="${escapeHTML(c.slug)}">${escapeHTML(c.name)}</option>`).join("");
    filter.value = current;

    $("#seed-notice").hidden = !state.isDemo;

    const q = $("#product-search").value.toLowerCase().trim();
    const cat = filter.value;

    const list = state.products.filter(p =>
        (cat === "all" || p.category === cat) &&
        p.name.toLowerCase().includes(q));

    $("#product-grid").innerHTML = list.length ? list.map(p => `
        <article class="pcard ${p.visible ? "" : "is-hidden"}" data-id="${escapeHTML(p.id)}">
            <div class="pcard-img">
                <img src="${escapeHTML(p.image)}" alt="" loading="lazy">
                ${p.badge ? `<span class="pcard-badge">${escapeHTML(p.badge)}</span>` : ""}
                <div class="pcard-flags">
                    ${p.soldOut ? `<span class="pill pill-out">SOLD OUT · HIDDEN</span>` : (!p.inStock ? `<span class="pill pill-hidden">HIDDEN</span>` : "")}
                    ${p.featured ? `<span class="pill pill-feat">★ FEATURED</span>` : ""}
                </div>
            </div>
            <div class="pcard-body">
                <span class="pcard-cat">${escapeHTML(categoryName(p.category))}${p.tracked ? ` · ${p.totalStock} in stock` : ""}</span>
                <h4>${escapeHTML(p.name)}</h4>
                <div class="pcard-price"><b>${formatPrice(p.price)}</b>${p.oldPrice ? `<del>${formatPrice(p.oldPrice)}</del>` : ""}</div>
                <div class="size-pills">
                    ${p.sizes.map(sz => {
                        const n = stockOf(p, sz);
                        const cls = n === 0 ? "zero" : (n <= 3 ? "low" : "");
                        return state.isDemo || n === Infinity
                            ? `<span class="size-pill">${escapeHTML(sz)}</span>`
                            : `<button class="size-pill ${cls}" data-act="qty" data-size="${escapeHTML(sz)}" title="Click to change stock">${escapeHTML(sz)}: ${n}</button>`;
                    }).join("")}
                </div>
                ${state.isDemo ? "" : `
                <div class="pcard-actions">
                    <button class="btn btn-light" data-act="edit"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="icon-btn" data-act="feature" title="Toggle featured"><i class="fa-${p.featured ? "solid" : "regular"} fa-star"></i></button>
                    <button class="icon-btn" data-act="stock" title="Show / hide on website"><i class="fa-solid ${p.inStock ? "fa-eye" : "fa-eye-slash"}"></i></button>
                    <button class="icon-btn" data-act="delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>`}
            </div>
        </article>`).join("") : `<div class="empty" style="grid-column:1/-1">No products found.</div>`;
}

$("#product-search").addEventListener("input", renderProducts);
$("#product-category-filter").addEventListener("change", renderProducts);

$("#product-grid").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.closest(".pcard").dataset.id;
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    try {
        if (btn.dataset.act === "edit") openProductModal(product);

        if (btn.dataset.act === "feature") {
            await updateDoc(doc(db, "products", id), { featured: !product.featured });
            product.featured = !product.featured;
            renderProducts();
            toast(product.featured ? "Marked as featured" : "Removed from featured");
        }

        if (btn.dataset.act === "stock") {
            await updateDoc(doc(db, "products", id), { inStock: !product.inStock });
            await loadProducts();
            renderAll();
            toast(product.inStock ? "Product is visible on the website" : "Product hidden from the website");
        }

        if (btn.dataset.act === "qty") {
            const size = btn.dataset.size;
            const answer = prompt(`Stock for "${product.name}" size ${size}:`, stockOf(product, size));
            if (answer === null) return;
            const n = Math.floor(Number(answer));
            if (!Number.isFinite(n) || n < 0) return toast("Enter a number 0 or more", true);
            await updateDoc(doc(db, "products", id), { ["stock." + size]: n });
            await loadProducts();
            renderAll();
            toast(`${size} stock set to ${n}`);
        }

        if (btn.dataset.act === "delete") {
            if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
            await deleteDoc(doc(db, "products", id));
            state.products = state.products.filter(p => p.id !== id);
            renderProducts();
            renderDashboard();
            toast("Product deleted");
        }
    } catch (error) {
        handleError(error);
    }
});

// ---- Import demo products
$("#seed-btn").addEventListener("click", importDemoProducts);

async function importDemoProducts() {
    const btn = $("#seed-btn");
    btn.disabled = true;
    try {
        const batch = writeBatch(db);
        demoProducts.forEach((p, i) => {
            const data = { ...p };
            delete data.id;
            batch.set(doc(db, "products", "demo-" + p.id), {
                ...data,
                sizes: DEFAULT_SIZES,
                stock: Object.fromEntries(DEFAULT_SIZES.map(sz => [sz, 10])),
                description: "Premium quality " + p.name.toLowerCase() +
                    " designed for comfort and everyday style.",
                inStock: true,
                featured: i % 5 === 0,
                createdAt: new Date(Date.now() - i * 1000)
            });
        });
        batch.set(doc(db, "settings", "store"), { seeded: true }, { merge: true });
        await batch.commit();
        state.settings.seeded = true;
        await loadProducts();
        renderAll();
        toast("Demo products imported");
    } catch (error) {
        handleError(error);
    } finally {
        btn.disabled = false;
    }
}


// ---- Product modal
let modalImages = [];
let modalStock = {};   // { M: 10, L: 5 }

function renderSizeChips() {
    const all = sortSizes(Array.from(new Set([...DEFAULT_SIZES, "S", "XS", "3XL", ...Object.keys(modalStock)])));
    $("#size-chips").innerHTML = all.map(sz =>
        `<button type="button" class="chip ${sz in modalStock ? "on" : ""}" data-size="${escapeHTML(sz)}">${escapeHTML(sz)}</button>`
    ).join("");

    $("#stock-grid").innerHTML = sortSizes(Object.keys(modalStock)).map(sz => `
        <div class="stock-cell ${modalStock[sz] === 0 ? "zero" : ""}">
            <b>Size ${escapeHTML(sz)}</b>
            <input type="number" min="0" step="1" value="${modalStock[sz]}" data-stock-size="${escapeHTML(sz)}" aria-label="Stock for ${escapeHTML(sz)}">
        </div>`).join("");
}

$("#stock-grid").addEventListener("input", (e) => {
    const sz = e.target.dataset.stockSize;
    if (!sz) return;
    modalStock[sz] = Math.max(0, Math.floor(Number(e.target.value) || 0));
    e.target.closest(".stock-cell").classList.toggle("zero", modalStock[sz] === 0);
});

function renderModalImages() {
    $("#image-list").innerHTML = modalImages.map((src, i) => `
        <div class="img-item">
            <img src="${escapeHTML(src)}" alt="">
            <button type="button" data-remove-img="${i}" aria-label="Remove">✕</button>
            ${i === 0 ? "<em>MAIN</em>" : ""}
        </div>`).join("") || `<span style="color:var(--muted)">No images yet.</span>`;
}

$("#size-chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const sz = chip.dataset.size;
    if (sz in modalStock) delete modalStock[sz]; else modalStock[sz] = 10;
    renderSizeChips();
});

$("#add-size-btn").addEventListener("click", () => {
    const input = $("#custom-size");
    const v = input.value.trim().toUpperCase();
    if (v && !(v in modalStock)) modalStock[v] = 10;
    input.value = "";
    renderSizeChips();
});

$("#image-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-remove-img]");
    if (!b) return;
    modalImages.splice(Number(b.dataset.removeImg), 1);
    renderModalImages();
});

function addImageFromInput() {
    let v = $("#p-url").value.trim().replace(/^\.?\//, "");
    if (!v) return;
    if (!/^(https?:|data:|image\/)/i.test(v)) v = "image/" + v;
    if (modalImages.length >= 4) return toast("Maximum 4 images per product", true);
    modalImages.push(v);
    $("#p-url").value = "";
    renderModalImages();
}
$("#p-url-add").addEventListener("click", addImageFromInput);
$("#p-url").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); addImageFromInput(); }
});

async function openProductModal(product) {
    // First product ever? Offer to keep the demo catalogue.
    if (!product && state.isDemo) {
        if (confirm("Import the demo products first so they stay on your store?\n\nOK = import them, then add yours\nCancel = start with an empty store")) {
            await importDemoProducts();
        } else {
            try {
                await setDoc(doc(db, "settings", "store"), { seeded: true }, { merge: true });
                state.settings.seeded = true;
                state.isDemo = false;
                state.products = [];
                renderAll();
            } catch (error) { return handleError(error); }
        }
    }

    $("#product-modal-title").textContent = product ? "Edit Product" : "Add Product";
    $("#p-id").value = product ? product.id : "";
    $("#p-name").value = product ? product.name : "";
    $("#p-price").value = product ? product.price : "";
    $("#p-old-price").value = product && product.oldPrice ? product.oldPrice : "";
    $("#p-badge").value = product ? product.badge : "NEW";
    $("#p-description").value = product ? product.description : "";
    $("#p-instock").checked = product ? product.inStock : true;
    $("#p-featured").checked = product ? product.featured : false;

    $("#p-category").innerHTML = state.categories.map(c =>
        `<option value="${escapeHTML(c.slug)}">${escapeHTML(c.name)}</option>`).join("");
    if (product) $("#p-category").value = product.category;

    modalImages = product ? product.images.slice() : [];
    modalStock = {};
    if (product) {
        // untracked (old) products start with 10 per size so nothing disappears by surprise
        product.sizes.forEach(sz => { modalStock[sz] = product.tracked ? product.stock[sz] : 10; });
    } else {
        DEFAULT_SIZES.forEach(sz => { modalStock[sz] = 10; });
    }
    renderSizeChips();
    renderModalImages();

    $("#product-modal").hidden = false;
    document.body.style.overflow = "hidden";
}

function closeModal() {
    $("#product-modal").hidden = true;
    document.body.style.overflow = "";
}
$$("[data-close-modal]").forEach(b => b.addEventListener("click", closeModal));
$("#product-modal").addEventListener("mousedown", (e) => { if (e.target.id === "product-modal") closeModal(); });
$("#add-product-btn").addEventListener("click", () => openProductModal(null));

$("#product-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!modalImages.length) return toast("Please add at least one image", true);
    if (!Object.keys(modalStock).length) return toast("Select at least one size", true);

    const size = modalImages.reduce((s, i) => s + i.length, 0);
    if (size > 900000) return toast("Images are too large in total. Remove one or use smaller photos.", true);

    const price = Number($("#p-price").value);
    const oldPrice = Number($("#p-old-price").value) || 0;
    if (oldPrice && oldPrice <= price) return toast("Old price must be higher than the selling price", true);

    const data = {
        name: $("#p-name").value.trim(),
        category: $("#p-category").value,
        badge: $("#p-badge").value,
        price,
        oldPrice,
        sizes: sortSizes(Object.keys(modalStock)),
        stock: modalStock,
        description: $("#p-description").value.trim(),
        image: modalImages[0],
        images: modalImages,
        inStock: $("#p-instock").checked,
        featured: $("#p-featured").checked
    };

    const id = $("#p-id").value;
    const btn = $("#product-save");
    btn.disabled = true;

    try {
        if (id) {
            await setDoc(doc(db, "products", id), data, { merge: true });
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, "products"), data);
        }
        await setDoc(doc(db, "settings", "store"), { seeded: true }, { merge: true });
        state.settings.seeded = true;

        await loadProducts();
        renderAll();
        closeModal();
        toast(id ? "Product updated" : "Product added");
    } catch (error) {
        handleError(error, "Could not save product.");
    } finally {
        btn.disabled = false;
    }
});


// ============================================================================
// CATEGORIES
// ============================================================================

function renderCategories() {
    $("#category-list").innerHTML = state.categories.map(c => {
        const count = state.products.filter(p => p.category === c.slug).length;
        return `<div class="cat-row" data-id="${escapeHTML(c.id)}">
            <strong>${escapeHTML(c.name)}</strong>
            <span>${count} product${count === 1 ? "" : "s"}</span>
            <button class="btn btn-light" data-act="rename">Rename</button>
            <button class="btn btn-danger" data-act="delete"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    }).join("") || `<div class="empty">No categories.</div>`;
}

$("#category-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#category-name").value.trim();
    const slug = slugify(name);
    if (!slug) return;
    if (state.categories.some(c => c.slug === slug)) return toast("Category already exists", true);
    try {
        const order = state.categories.length + 1;
        await setDoc(doc(db, "categories", slug), { name, slug, order });
        state.categories.push({ id: slug, name, slug, order });
        $("#category-name").value = "";
        renderCategories();
        renderProducts();
        toast("Category added");
    } catch (error) { handleError(error); }
});

$("#category-list").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.closest(".cat-row").dataset.id;
    const cat = state.categories.find(c => c.id === id);
    try {
        if (btn.dataset.act === "rename") {
            const name = prompt("New category name:", cat.name);
            if (!name || !name.trim()) return;
            await updateDoc(doc(db, "categories", id), { name: name.trim() });
            cat.name = name.trim();
            renderCategories();
            renderProducts();
            toast("Category renamed");
        }
        if (btn.dataset.act === "delete") {
            if (state.products.some(p => p.category === cat.slug)) {
                return toast("Move or delete the products in this category first", true);
            }
            if (!confirm(`Delete category "${cat.name}"?`)) return;
            await deleteDoc(doc(db, "categories", id));
            state.categories = state.categories.filter(c => c.id !== id);
            renderCategories();
            renderProducts();
            toast("Category deleted");
        }
    } catch (error) { handleError(error); }
});


// ============================================================================
// ORDERS
// ============================================================================

function renderOrders() {
    const q = $("#order-search").value.toLowerCase().trim();
    const status = $("#order-status-filter").value;

    const list = state.orders.filter(o =>
        (status === "all" || o.status === status) &&
        (!q || (o.customerName || "").toLowerCase().includes(q) ||
            (o.customerPhone || "").includes(q) ||
            orderCode(o).toLowerCase().includes(q)));

    $("#orders-list").innerHTML = list.length ? list.map(o => {
        const wa = "https://wa.me/88" + String(o.customerPhone || "").replace(/\D/g, "");
        return `
        <div class="order" data-id="${o.id}">
            <div class="order-top">
                <div>
                    <h4>${escapeHTML(o.customerName)}</h4>
                    <span class="order-id">${orderCode(o)} · ${fmtDate(o.createdAtDate)}</span>
                </div>
                <span class="status status-${o.status.toLowerCase()}">${o.status}</span>
            </div>
            <p><i class="fa-solid fa-phone"></i>${escapeHTML(o.customerPhone)}</p>
            <p><i class="fa-solid fa-location-dot"></i>${escapeHTML(o.customerAddress)}</p>
            <div class="order-items">
                ${(o.products || []).map(p => `
                <div class="order-item">
                    <span>${escapeHTML(p.name)}<small>Size ${escapeHTML(p.size)} · Qty ${p.quantity}</small></span>
                    <b>${formatPrice(p.price * p.quantity)}</b>
                </div>`).join("")}
            </div>
            <div class="order-total"><span>Total (${o.totalItems} items)</span><span>${formatPrice(o.totalPrice)}</span></div>
            <div class="order-actions">
                <select data-act="status">
                    ${["Pending", "Confirmed", "Delivered", "Cancelled"].map(s =>
                        `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
                </select>
                <a class="btn btn-light" href="tel:${escapeHTML(o.customerPhone)}" title="Call"><i class="fa-solid fa-phone"></i></a>
                <a class="btn btn-light" href="${wa}" target="_blank" rel="noopener" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
                <button class="btn btn-danger" data-act="delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;
    }).join("") : `<div class="empty" style="grid-column:1/-1">No orders found.</div>`;
}

$("#order-search").addEventListener("input", renderOrders);
$("#order-status-filter").addEventListener("change", renderOrders);

// Put stock back when an order is cancelled (direction +1) or take it again when un-cancelled (-1)
async function adjustStockForOrder(order, direction) {
    const need = {};
    (order.products || []).forEach(p => {
        if (!p.id) return;                      // older orders were saved without a product id
        need[p.id] = need[p.id] || {};
        need[p.id][p.size] = (need[p.id][p.size] || 0) + (p.quantity || 0);
    });
    if (!Object.keys(need).length) return;

    await runTransaction(db, async (tx) => {
        const reads = [];
        for (const id of Object.keys(need)) {
            const ref = doc(db, "products", id);
            reads.push({ id, ref, snap: await tx.get(ref) });
        }
        for (const r of reads) {
            if (!r.snap.exists()) continue;
            const data = r.snap.data();
            if (!data.stock) continue;
            const stock = { ...data.stock };
            for (const size of Object.keys(need[r.id])) {
                const next = (Number(stock[size]) || 0) + direction * need[r.id][size];
                if (next < 0) throw new Error(`Not enough stock of "${data.name}" (${size}) to re-activate this order.`);
                stock[size] = next;
            }
            tx.update(r.ref, { stock });
        }
    });
}

$("#orders-list").addEventListener("change", async (e) => {
    if (e.target.dataset.act !== "status") return;
    const id = e.target.closest(".order").dataset.id;
    const order = state.orders.find(o => o.id === id);
    const previous = order.status;
    const next = e.target.value;
    try {
        if (next === "Cancelled" && previous !== "Cancelled") await adjustStockForOrder(order, +1);
        if (previous === "Cancelled" && next !== "Cancelled") await adjustStockForOrder(order, -1);

        await updateDoc(doc(db, "orders", id), { status: next });
        order.status = next;
        await loadProducts();
        renderAll();
        toast(next === "Cancelled" ? "Order cancelled — stock restored" : "Order marked " + next);
    } catch (error) {
        console.error(error);
        toast(error.message && !error.code ? error.message : "Could not update the order.", true);
        renderOrders();
    }
});

$("#orders-list").addEventListener("click", async (e) => {
    const btn = e.target.closest('[data-act="delete"]');
    if (!btn) return;
    const id = btn.closest(".order").dataset.id;
    if (!confirm("Delete this order permanently?")) return;
    try {
        await deleteDoc(doc(db, "orders", id));
        state.orders = state.orders.filter(o => o.id !== id);
        renderOrders();
        renderDashboard();
        renderCustomers();
        toast("Order deleted");
    } catch (error) { handleError(error); }
});


// ============================================================================
// CUSTOMERS
// ============================================================================

function renderCustomers() {
    const q = $("#customer-search").value.toLowerCase().trim();
    const map = {};
    state.orders.forEach(o => {
        const key = o.customerPhone || o.customerName;
        const c = map[key] || (map[key] = {
            name: o.customerName, phone: o.customerPhone, address: o.customerAddress,
            orders: 0, spent: 0, last: null
        });
        c.orders++;
        if (o.status === "Delivered") c.spent += o.totalPrice || 0;
        if (!c.last || (o.createdAtDate && o.createdAtDate > c.last)) c.last = o.createdAtDate;
    });

    const list = Object.values(map)
        .filter(c => !q || (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q))
        .sort((a, b) => b.spent - a.spent || b.orders - a.orders);

    $("#customers-table").innerHTML = list.length ? `
        <thead><tr><th>Customer</th><th>Phone</th><th>Address</th><th>Orders</th><th>Spent (delivered)</th><th>Last order</th></tr></thead>
        <tbody>${list.map(c => `<tr>
            <td><b>${escapeHTML(c.name)}</b></td>
            <td>${escapeHTML(c.phone)}</td>
            <td>${escapeHTML(c.address)}</td>
            <td>${c.orders}</td>
            <td>${formatPrice(c.spent)}</td>
            <td>${fmtDate(c.last)}</td>
        </tr>`).join("")}</tbody>` : `<tbody><tr><td class="empty">No customers yet.</td></tr></tbody>`;
}
$("#customer-search").addEventListener("input", renderCustomers);


// ============================================================================
// SETTINGS (landing page + contact info)
// ============================================================================

const settingsForm = $("#settings-form");

function fillSettingsForm() {
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
        const input = settingsForm.elements[key];
        if (input && key !== "seeded") input.value = state.settings[key] || "";
    });
    $("#hero-preview").src = state.settings.heroImage || "";
}

settingsForm.elements.heroImage.addEventListener("input", (e) => {
    $("#hero-preview").src = e.target.value;
});

settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {};
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
        const input = settingsForm.elements[key];
        if (input && key !== "seeded") data[key] = input.value.trim();
    });
    try {
        await setDoc(doc(db, "settings", "store"), data, { merge: true });
        Object.assign(state.settings, data);
        toast("Settings saved — your website is updated");
    } catch (error) { handleError(error); }
});
