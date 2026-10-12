// Gents Cottage - professional extras: search, sort, WhatsApp, back-to-top, reveal animations
(function () {
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    document.documentElement.classList.add("js-reveal");

    // header shadow + back to top
    var header = $("header");
    var topBtn = document.createElement("button");
    topBtn.className = "pro-fab pro-top";
    topBtn.setAttribute("aria-label", "Back to top");
    topBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
    topBtn.onclick = function () { window.scrollTo({ top: 0, behavior: "smooth" }); };
    document.body.appendChild(topBtn);
    function onScroll() {
        if (header) header.classList.toggle("scrolled", window.scrollY > 10);
        topBtn.classList.toggle("show", window.scrollY > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // WhatsApp button (number is read from the phone link in the footer, so it follows Admin > Settings)
    var wa = document.createElement("a");
    wa.className = "pro-fab pro-wa";
    wa.target = "_blank"; wa.rel = "noopener";
    wa.setAttribute("aria-label", "Chat on WhatsApp");
    wa.innerHTML = '<i class="fa-brands fa-whatsapp"></i>';
    wa.addEventListener("click", function () {
        var tel = $('a[href^="tel:"]');
        var num = (tel ? tel.getAttribute("href").replace("tel:", "") : "+8801511977577").replace(/\D/g, "");
        wa.href = "https://wa.me/" + num + "?text=" + encodeURIComponent("Hello Gents Cottage, I want to know about your products.");
    });
    wa.href = "https://wa.me/8801511977577";
    document.body.appendChild(wa);

    // scroll reveal
    var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 }) : null;
    function reveal() {
        $$(".section-title,.trust-strip>div,#category-grid>*,.product-container>*,.why-choose>*").forEach(function (el) {
            if (el.dataset.rv) return;
            el.dataset.rv = 1;
            el.classList.add("reveal");
            if (io) io.observe(el); else el.classList.add("in");
        });
    }

    // search + sort for the product list (index page only)
    var list = $("#products .product-container"); // the All Products grid only (not the Featured one)
    var bar, input, sel, count, empty, busy = false, mo;
    if (list && $("#product-filter")) {
        bar = document.createElement("div");
        bar.className = "pro-toolbar";
        bar.innerHTML =
            '<div class="pro-search"><i class="fa-solid fa-magnifying-glass"></i>' +
            '<input type="search" placeholder="Search products..." aria-label="Search products"></div>' +
            '<select aria-label="Sort products"><option value="">Sort: Featured</option>' +
            '<option value="lh">Price: Low to High</option><option value="hl">Price: High to Low</option>' +
            '<option value="az">Name: A to Z</option></select><div class="pro-count"></div>';
        list.parentNode.insertBefore(bar, list);
        input = $("input", bar); sel = $("select", bar); count = $(".pro-count", bar);
        input.addEventListener("input", apply);
        sel.addEventListener("change", apply);
        mo = new MutationObserver(function () { if (!busy) apply(); });
        mo.observe(list, { childList: true });
    }
    function price(card) {
        var m = (card.textContent.match(/৳\s*[\d,]+/g) || []).map(function (t) { return +t.replace(/\D/g, ""); });
        return m.length ? Math.min.apply(null, m) : 0;
    }
    function name(card) {
        var h = $("h3,h4,.product-title,.product-name", card);
        return (h ? h.textContent : card.textContent).trim().toLowerCase();
    }
    function apply() {
        busy = true;
        var cards = Array.prototype.slice.call(list.children).filter(function (c) { return !c.classList.contains("pro-empty"); });
        cards.forEach(function (c, i) { if (c.dataset.i === undefined) c.dataset.i = i; });
        var q = input.value.trim().toLowerCase(), shown = 0;
        cards.sort(function (a, b) {
            if (sel.value === "lh") return price(a) - price(b);
            if (sel.value === "hl") return price(b) - price(a);
            if (sel.value === "az") return name(a).localeCompare(name(b));
            return a.dataset.i - b.dataset.i;
        }).forEach(function (c, idx) {
            var ok = !q || c.textContent.toLowerCase().indexOf(q) > -1;
            c.hidden = !ok; if (ok) shown++;
            if (list.children[idx] !== c) list.insertBefore(c, list.children[idx] || null); // move only if needed
        });
        if (empty) { empty.remove(); empty = null; }
        if (cards.length && !shown) {
            empty = document.createElement("div");
            empty.className = "pro-empty";
            empty.innerHTML = '<i class="fa-regular fa-face-frown"></i>No products found. Try another search.';
            list.appendChild(empty);
        }
        count.textContent = cards.length ? shown + " product" + (shown === 1 ? "" : "s") : "";
        reveal();
        if (mo) mo.takeRecords(); // drop our own changes so the observer does not re-trigger apply()
        busy = false;
    }

    reveal();
    new MutationObserver(reveal).observe(document.body, { childList: true, subtree: true });
})();
