// Gents Cottage Admin - extras: date chip, "/" to search, CSV export for tables
(function () {
    var $ = function (s, r) { return (r || document).querySelector(s); };

    // today's date in the top bar
    var top = $(".topbar");
    if (top) {
        var d = document.createElement("span");
        d.className = "topbar-date";
        d.innerHTML = '<i class="fa-regular fa-calendar"></i> ' +
            new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
        top.insertBefore(d, $("#topbar-actions"));
    }

    // press "/" to jump to the search box of the current page
    document.addEventListener("keydown", function (e) {
        var t = e.target, typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable;
        if (e.key !== "/" || typing || e.ctrlKey || e.metaKey) return;
        var view = document.querySelector(".view:not([hidden])");
        var box = view && view.querySelector('input[type="search"]');
        if (box) { e.preventDefault(); box.focus(); box.select(); }
    });

    // CSV export for a table (customers + recent orders)
    function csvCell(v) { return '"' + String(v).replace(/\s+/g, " ").trim().replace(/"/g, '""') + '"'; }
    function exportTable(table, name) {
        var rows = Array.prototype.slice.call(table.querySelectorAll("tr")).map(function (tr) {
            return Array.prototype.slice.call(tr.children).map(function (c) { return csvCell(c.textContent); }).join(",");
        });
        if (rows.length < 2) { alert("Nothing to export yet."); return; }
        var blob = new Blob(["\ufeff" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name + "-" + new Date().toISOString().slice(0, 10) + ".csv";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }
    function addExport(toolbarSel, tableSel, name) {
        var bar = $(toolbarSel), table = $(tableSel);
        if (!bar || !table) return;
        var b = document.createElement("button");
        b.type = "button"; b.className = "btn btn-light";
        b.innerHTML = '<i class="fa-solid fa-file-csv"></i> Export CSV';
        b.addEventListener("click", function () { exportTable(table, name); });
        bar.appendChild(b);
    }
    addExport("#view-customers .toolbar", "#customers-table", "customers");

    // Print button for the orders page
    var ob = $("#view-orders .toolbar");
    if (ob) {
        var p = document.createElement("button");
        p.type = "button"; p.className = "btn btn-light";
        p.innerHTML = '<i class="fa-solid fa-print"></i> Print';
        p.addEventListener("click", function () { window.print(); });
        ob.appendChild(p);
    }
})();
