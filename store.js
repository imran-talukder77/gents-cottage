// ============================================================================
// GENTS COTTAGE - SHARED STORE (Firebase + data helpers)
// Used by: index.html, product-details.html, admin.html
// ============================================================================

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    writeBatch,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { products as staticProducts } from "./products.js";


export const firebaseConfig = {
    apiKey: "AIzaSyDmhq96_0766Rlh4B8BffPHFCKHHOgnOjk",
    authDomain: "gents-cottage.firebaseapp.com",
    projectId: "gents-cottage",
    storageBucket: "gents-cottage.firebasestorage.app",
    messagingSenderId: "827979587396",
    appId: "1:827979587396:web:be87aaf1861b1ce84f4111",
    measurementId: "G-WD1WV0SL4Q"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Re-export Firestore helpers so pages import from one place
export {
    collection, getDocs, getDoc, doc, setDoc, addDoc,
    updateDoc, deleteDoc, serverTimestamp, writeBatch, runTransaction
};


// ============================================================================
// DEFAULTS (used when Firestore is empty / unreachable)
// ============================================================================

export const DEFAULT_SIZES = ["M", "L", "XL", "XXL"];

export const DEFAULT_CATEGORIES = [
    { id: "shirt", name: "Shirts", slug: "shirt", order: 1 },
    { id: "tshirt", name: "T-Shirts", slug: "tshirt", order: 2 },
    { id: "polo", name: "Polo", slug: "polo", order: 3 },
    { id: "pants", name: "Pants", slug: "pants", order: 4 }
];

export const DEFAULT_SETTINGS = {
    storeName: "Gents Cottage",
    announcement: "Free delivery on orders over ৳3,000 · Cash on delivery available",
    heroEyebrow: "NEW SEASON 2026",
    heroTitle: "Dress Sharp. Live Confident.",
    heroSubtitle: "Premium shirts, t-shirts, polos and pants crafted for the modern gentleman — made to feel as good as they look.",
    heroImage: "image/product1.jpg",
    phone: "+880 1511977577",
    email: "gentscottagebd@gmail.com",
    address: "Tangail, Dhaka, Bangladesh",
    hours: "Every Day: 10:00 AM - 10:00 PM",
    facebook: "https://www.facebook.com/profile.php?id=61594129015656",
    instagram: "",
    youtube: "",
    tiktok: "",
    seeded: false
};


// ============================================================================
// HELPERS
// ============================================================================

function withTimeout(promise, ms = 7000) {
    return Promise.race([
        promise,
        new Promise(function (_, reject) {
            setTimeout(function () { reject(new Error("timeout")); }, ms);
        })
    ]);
}

export function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

export function formatPrice(n) {
    return "৳" + Number(n || 0).toLocaleString();
}

export function slugify(text) {
    return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

export function sortSizes(list) {
    return list.slice().sort(function (a, b) {
        const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        const na = parseFloat(a), nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a).localeCompare(String(b));
    });
}

// How many pieces of one size are left. Infinity = stock is not tracked (old products).
export function stockOf(p, size) {
    if (!p.tracked) return Infinity;
    return Number(p.stock[size]) || 0;
}

// Make every product look the same no matter where it came from
export function normalizeProduct(raw, id) {
    const price = Number(raw.price) || 0;
    const oldPrice = Number(raw.oldPrice) || 0;

    const images = Array.isArray(raw.images) && raw.images.length
        ? raw.images
        : (raw.image ? [raw.image] : []);

    // Per-size stock: { M: 5, L: 0, XL: 12 }. Products without it are "untracked".
    const tracked = !!raw.stock && typeof raw.stock === "object" && Object.keys(raw.stock).length > 0;
    const stock = {};
    if (tracked) {
        Object.keys(raw.stock).forEach(function (k) {
            stock[k] = Math.max(0, Math.floor(Number(raw.stock[k]) || 0));
        });
    }

    const sizes = tracked
        ? sortSizes(Object.keys(stock))
        : (Array.isArray(raw.sizes) && raw.sizes.length ? raw.sizes : DEFAULT_SIZES);

    const totalStock = tracked
        ? sizes.reduce(function (n, s) { return n + stock[s]; }, 0)
        : Infinity;

    const manuallyVisible = raw.inStock !== false;

    return {
        id: String(id ?? raw.id),
        name: raw.name || "Untitled product",
        image: raw.image || images[0] || "image/logo.png",
        images: images,
        price: price,
        oldPrice: oldPrice > price ? oldPrice : 0,
        category: raw.category || "shirt",
        badge: raw.badge || "",
        sizes: sizes,
        stock: stock,
        tracked: tracked,
        totalStock: totalStock,
        description: raw.description || "Premium quality product designed for comfort and everyday style.",
        inStock: manuallyVisible,                                  // manual "show on website" switch
        soldOut: tracked && totalStock === 0,                      // every size finished
        visible: manuallyVisible && !(tracked && totalStock === 0), // shown on the storefront?
        featured: raw.featured === true,
        createdAt: raw.createdAt && raw.createdAt.toMillis ? raw.createdAt.toMillis() : (raw.createdAt || 0)
    };
}

export function discountPercent(p) {
    if (!p.oldPrice || p.oldPrice <= p.price) return 0;
    return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
}


// ============================================================================
// LOADERS
// ============================================================================

export async function getSettings() {
    try {
        const snap = await withTimeout(getDoc(doc(db, "settings", "store")));
        if (snap.exists()) {
            return Object.assign({}, DEFAULT_SETTINGS, snap.data());
        }
    } catch (error) {
        console.warn("Settings: using defaults.", error.message);
    }
    return Object.assign({}, DEFAULT_SETTINGS);
}

export async function getCategories() {
    try {
        const snap = await withTimeout(getDocs(collection(db, "categories")));
        if (!snap.empty) {
            return snap.docs
                .map(function (d) { return Object.assign({ id: d.id }, d.data()); })
                .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        }
    } catch (error) {
        console.warn("Categories: using defaults.", error.message);
    }
    return DEFAULT_CATEGORIES.slice();
}

// Firestore is the source of truth once the admin has saved anything.
// Before that (or if Firestore is unreachable) the built-in demo products show.
export async function getProducts() {
    try {
        const snap = await withTimeout(getDocs(collection(db, "products")));

        if (!snap.empty) {
            return snap.docs
                .map(function (d) { return normalizeProduct(d.data(), d.id); })
                .filter(function (p) { return p.visible; })
                .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        }

        const settings = await getSettings();
        if (settings.seeded) return [];

    } catch (error) {
        console.warn("Products: using built-in list.", error.message);
    }

    return staticProducts.map(function (p) {
        return normalizeProduct(p, p.id);
    });
}

export async function getProductById(id) {
    try {
        const snap = await withTimeout(getDoc(doc(db, "products", String(id))));
        if (snap.exists()) return normalizeProduct(snap.data(), snap.id);
    } catch (error) {
        console.warn("Product lookup failed.", error.message);
    }
    const fallback = staticProducts.find(function (p) { return String(p.id) === String(id); });
    return fallback ? normalizeProduct(fallback, fallback.id) : null;
}

// Fill contact info / social links / announcement on any page
export function applySettingsToPage(s) {
    document.querySelectorAll("[data-setting]").forEach(function (el) {
        const key = el.dataset.setting;
        if (s[key] !== undefined && s[key] !== "") el.textContent = s[key];
    });

    document.querySelectorAll("[data-social]").forEach(function (el) {
        const url = s[el.dataset.social];
        if (url) { el.href = url; el.style.display = ""; }
        else { el.style.display = "none"; }
    });

    const bar = document.querySelector(".announcement-bar");
    if (bar) {
        if (s.announcement) { bar.querySelector("span").textContent = s.announcement; }
        else { bar.style.display = "none"; }
    }
}


// ============================================================================
// SHARED PRODUCT CARD (home page, landing sections, related products)
// ============================================================================

export function productCardHTML(p) {
    const off = discountPercent(p);
    const badge = p.badge || (off ? "SALE" : "");

    return `
    <div class="product-card" data-id="${escapeHTML(p.id)}" data-category="${escapeHTML(p.category)}">
        <div class="product-image">
            <a href="product-details.html?id=${encodeURIComponent(p.id)}">
                <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy">
            </a>
            ${badge ? `<span class="product-badge ${badge === "SALE" ? "sale" : ""}">${escapeHTML(badge)}</span>` : ""}
            ${off ? `<span class="discount-tag">-${off}%</span>` : ""}
        </div>

        <div class="product-info">
            <h3>${escapeHTML(p.name)}</h3>

            <div class="price">
                <span>${formatPrice(p.price)}</span>
                ${p.oldPrice ? `<del>${formatPrice(p.oldPrice)}</del>` : ""}
            </div>

            <div class="product-sizes">
                ${p.sizes.map(function (s) {
                    const left = stockOf(p, s);
                    return left > 0
                        ? `<button class="size-btn" data-size="${escapeHTML(s)}" data-stock="${left === Infinity ? "" : left}"${left <= 5 ? ` title="Only ${left} left"` : ""}>${escapeHTML(s)}</button>`
                        : `<button class="size-btn size-out" disabled title="Out of stock">${escapeHTML(s)}</button>`;
                }).join("")}
            </div>
            <p class="size-error">Please select a size first!</p>
            <button class="add-cart"><i class="fa-solid fa-cart-shopping"></i> ADD TO CART</button>
        </div>
    </div>`;
}


// ============================================================================
// PLACE ORDER + REDUCE STOCK (one atomic step, so two customers can't buy the last piece)
// items: [{ id, name, size, quantity }]
// Throws an Error with .code === "out-of-stock" and a readable message.
// ============================================================================

export async function createOrderWithStock(orderData, items) {

    const need = {};   // productId -> { size -> qty }

    items.forEach(function (item) {
        if (!item.id) return;
        need[item.id] = need[item.id] || {};
        need[item.id][item.size] = (need[item.id][item.size] || 0) + item.quantity;
    });

    const orderRef = doc(collection(db, "orders"));

    await runTransaction(db, async function (tx) {

        // all reads first
        const reads = [];
        for (const id of Object.keys(need)) {
            const ref = doc(db, "products", id);
            reads.push({ id: id, ref: ref, snap: await tx.get(ref) });
        }

        // then validate + write
        for (const r of reads) {

            if (!r.snap.exists()) continue;           // built-in demo product: nothing to track

            const data = r.snap.data();

            if (!data.stock || typeof data.stock !== "object") continue;   // untracked product

            if (data.inStock === false) {
                const err = new Error(`"${data.name}" is no longer available.`);
                err.code = "out-of-stock";
                throw err;
            }

            const newStock = Object.assign({}, data.stock);

            for (const size of Object.keys(need[r.id])) {

                const left = Number(newStock[size]) || 0;
                const want = need[r.id][size];

                if (left < want) {
                    const err = new Error(left > 0
                        ? `Only ${left} left of "${data.name}" in size ${size}.`
                        : `"${data.name}" in size ${size} is sold out.`);
                    err.code = "out-of-stock";
                    throw err;
                }

                newStock[size] = left - want;
            }

            tx.update(r.ref, { stock: newStock });
        }

        tx.set(orderRef, orderData);
    });

    return orderRef;
}
