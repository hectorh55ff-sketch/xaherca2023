(function () {
  "use strict";

  var ERP = window.DistriFoodERP;
  if (!ERP) return;

  function getActiveUserName() {
    var u = (typeof ERP.getUser === "function" && ERP.getUser()) || {};
    var name = u.name || u.username || u.user || u.email || "";
    return String(name).trim() || "Usuario del Sistema";
  }

  function getSkuThumbnailSrc(skuObj, state) {
    if (!skuObj) return "";
    var direct =
      skuObj.image ||
      skuObj.img ||
      skuObj.photo ||
      skuObj.thumbnail ||
      skuObj.imageUrl ||
      skuObj.imgUrl ||
      skuObj.icon ||
      "";
    if (direct && String(direct).trim()) return String(direct).trim();

    var code = skuObj.sku || skuObj.code || "";
    if (code && state && state.skuImages && state.skuImages[code]) {
      return String(state.skuImages[code]).trim();
    }
    return "";
  }

  function buildFallbackSkuSvgDataUrl(skuObj) {
    var label = String((skuObj && (skuObj.sku || skuObj.name)) || "SKU").trim();
    var parts = label.split(/[\s-]+/).filter(Boolean);
    var initials = parts.length >= 2
      ? (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
      : label.slice(0, 3).toUpperCase();

    var palette = [
      ["#e0f2fe", "#0284c7"],
      ["#fce7f3", "#db2777"],
      ["#dcfce7", "#16a34a"],
      ["#fef3c7", "#d97706"],
      ["#ede9fe", "#7c3aed"],
      ["#ffedd5", "#ea580c"]
    ];
    var hash = 0;
    for (var i = 0; i < label.length; i++) {
      hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
    }
    var pair = palette[hash % palette.length];
    var bg = pair[0];
    var fg = pair[1];

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="88" height="64" viewBox="0 0 88 64">' +
        '<rect x="2" y="2" width="84" height="60" rx="10" fill="' + bg + '" stroke="' + fg + '" stroke-opacity="0.28" stroke-width="1.5"/>' +
        '<circle cx="44" cy="27" r="13" fill="' + fg + '" fill-opacity="0.16"/>' +
        '<text x="44" y="31.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="11.5" font-weight="800" fill="' + fg + '">' + initials + '</text>' +
        '<text x="44" y="52" text-anchor="middle" font-family="Arial, sans-serif" font-size="8.5" font-weight="700" fill="#334155">' + label.slice(0, 12) + '</text>' +
      '</svg>';

    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function ensurePosVentasStyles() {
    var style = document.getElementById("pos-ventas-grid-styles");
    if (!style) {
      style = document.createElement("style");
      style.id = "pos-ventas-grid-styles";
      document.head.appendChild(style);
    }
    style.textContent = [
      ".pos-cat-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }",
      ".pos-cat-chip { border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; padding: 6px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 700; cursor: pointer; }",
      ".pos-cat-chip:hover { background: #e2e8f0; }",
      ".pos-cat-chip.active { background: #ec4899; border-color: #ec4899; color: #fff; }",
      ".pos-search-row { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; }",
      ".pos-search-input { flex: 1; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 13.5px; background: #fff; color: #0f172a; }",
      ".pos-section-title { font-size: 12px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #64748b; margin: 12px 0 8px; }",
      ".pos-prod-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(156px, 1fr)); gap: 10px; }",
      ".pos-card { border: 1px solid #e2e8f0; background: #fff; border-radius: 14px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; min-height: 162px; cursor: pointer; transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease; text-align: left; }",
      ".pos-card:hover { transform: translateY(-2px); border-color: #0284c7; box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08); }",
      ".pos-card.selected { border-color: #0284c7; background: #f0f9ff; box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2); }",
      ".pos-card.sold-out { background: #e5e7eb; border-color: #d1d5db; color: #6b7280; }",
      ".pos-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; font-size: 11px; font-weight: 700; color: #64748b; }",
      ".pos-card-thumb-wrap { width: 100%; height: 58px; border-radius: 10px; overflow: hidden; background: #f8fafc; border: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: center; margin: 6px 0 4px; }",
      ".pos-card-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }",
      ".pos-sold-out-tag { color: #dc2626; font-weight: 800; font-size: 11px; }",
      ".pos-card-name { font-size: 12.5px; font-weight: 700; color: #0f172a; line-height: 1.3; margin: 4px 0 6px; word-break: break-word; }",
      ".pos-card.sold-out .pos-card-name { color: #374151; }",
      ".pos-card-price { background: #f1f5f9; color: #0284c7; font-weight: 800; font-size: 13.5px; text-align: center; padding: 6px 8px; border-radius: 9px; }",
      ".pos-card.sold-out .pos-card-price { background: #d1d5db; color: #6b7280; }",
      ".pos-crates-full-section { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); }",
      ".pos-debt-box { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 12px; padding: 10px 12px; margin-bottom: 12px; }",
      ".pos-debt-box.has-debt { border-color: #fca5a5; background: #fef2f2; }",
      ".pos-debt-box.no-debt { border-color: #86efac; background: #f0fdf4; }",
      ".pos-modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 9999; }",
      ".pos-modal-card { background: #fff; border-radius: 16px; max-width: 860px; width: 100%; max-height: 88vh; overflow-y: auto; padding: 18px 20px; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.25); border: 1px solid #e2e8f0; }",
      ".pos-modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; }",
      "#pos-print-host { display: none; }",
      ".hl-sheet { position: relative; width: 100%; max-width: 7.6in; height: 5.15in; min-height: 5.15in; max-height: 5.15in; margin: 0 auto; background: #fff; color: #0f172a; border: none; border-radius: 0; padding: 2px 0 0 0; font-size: 9.5px; line-height: 1.18; box-sizing: border-box; overflow: hidden; }",
      ".hl-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; margin-bottom: 5px; }",
      ".hl-company { font-size: 12px; font-weight: 800; color: #0f172a; margin: 0; }",
      ".hl-sub { font-size: 8.5px; color: #475569; margin-top: 1px; }",
      ".hl-doc-box { text-align: right; }",
      ".hl-doc-title { font-size: 10.5px; font-weight: 800; color: #0f172a; text-transform: uppercase; }",
      ".hl-meta-grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 6px; margin-bottom: 5px; }",
      ".hl-box { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 4px; padding: 3px 6px; }",
      ".hl-box-label { font-size: 7.5px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.04em; }",
      ".hl-box-val { font-size: 9.5px; font-weight: 700; color: #0f172a; margin-top: 1px; }",
      ".hl-table-wrap { max-height: 2.35in; overflow: hidden; }",
      ".hl-table { width: 100%; border-collapse: collapse; font-size: 9px; }",
      ".hl-table th { background: #f1f5f9; color: #0f172a; font-weight: 800; text-align: left; padding: 2px 5px; border-bottom: 1px solid #94a3b8; }",
      ".hl-table td { padding: 2px 5px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }",
      ".hl-footer { position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; border-top: 1px solid #94a3b8; padding-top: 4px; background: #fff; }",
      ".hl-note { flex: 1; font-size: 8.5px; color: #334155; background: transparent; border: none; padding: 0; }",
      ".hl-totals { text-align: right; min-width: 140px; }",
      ".hl-total-usd { font-size: 11.5px; font-weight: 800; color: #0f172a; }",
      ".hl-total-bs { font-size: 9px; font-weight: 700; color: #334155; }",
      "@media print {",
      "  @page { size: letter portrait; margin: 0.2in 0.35in; }",
      "  html, body { height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }",
      "  body.pos-printing-half-letter > *:not(#pos-print-host) { display: none !important; }",
      "  body.pos-printing-half-letter #pos-print-host { display: block !important; position: static !important; width: 100% !important; height: 5.2in !important; max-height: 5.2in !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; }",
      "  body.pos-printing-half-letter .hl-sheet { position: relative !important; width: 100% !important; max-width: none !important; height: 5.15in !important; min-height: 5.15in !important; max-height: 5.15in !important; overflow: hidden !important; border: none !important; border-radius: 0 !important; padding: 2px 0 0 0 !important; page-break-after: avoid !important; page-break-inside: avoid !important; break-after: avoid !important; break-inside: avoid !important; }",
      "  body.pos-printing-half-letter .hl-footer { position: absolute !important; left: 0 !important; right: 0 !important; bottom: 0 !important; }",
      "}"
    ].join("\n");
  }

  function getCompanyInfoSafe(state) {
    if (typeof ERP.getCompany === "function") {
      var c = ERP.getCompany();
      if (c && (c.name || c.rif)) return c;
    }
    var stComp = (state && (state.company || state.companyInfo)) || {};
    return {
      name: stComp.name || "DistriFood ERP",
      rif: stComp.rif || "",
      address: stComp.address || "",
      phone: stComp.phone || ""
    };
  }

  function buildInvoiceHalfLetterHtml(inv, state) {
    var comp = getCompanyInfoSafe(state);
    var cl = typeof ERP.getClient === "function" ? (ERP.getClient(inv.clientId) || {}) : {};
    var seller = inv.sellerName || inv.billedBy || "—";
    var cond = inv.payCond || inv.condition || "—";
    var items = Array.isArray(inv.items) ? inv.items : [];

    var rowsHtml = items.map(function (it) {
      var skuObj = typeof ERP.getSku === "function" ? (ERP.getSku(it.sku) || {}) : {};
      var qty = Number(it.qty || 0);
      var unitPrice = Number(it.unitPriceUsd != null ? it.unitPriceUsd : (skuObj.priceUsd || 0));
      var sub = Number((qty * unitPrice).toFixed(2));
      return (
        '<tr>' +
          '<td><strong>' + ERP.esc(it.sku) + '</strong></td>' +
          '<td>' + ERP.esc(skuObj.name || it.sku) + '</td>' +
          '<td>' + qty + '</td>' +
          '<td>' + ERP.fmtUsd(unitPrice) + '</td>' +
          '<td><strong>' + ERP.fmtUsd(sub) + '</strong> <span style="color:#64748b;">(' + ERP.fmtBs(sub) + ')</span></td>' +
        '</tr>'
      );
    }).join("");

    var cTypes = typeof ERP.getCrateTypes === "function" ? ERP.getCrateTypes() : [];
    var crateParts = [];
    for (var i = 0; i < cTypes.length; i++) {
      var ct = cTypes[i];
      var cKey = typeof ERP.normalizeCrateKey === "function" ? ERP.normalizeCrateKey(ct.id) : ct.id;
      var delV = Number((inv.cratesDelivered && inv.cratesDelivered[cKey]) || 0);
      var retV = Number((inv.cratesReturned && inv.cratesReturned[cKey]) || 0);
      if (delV > 0 || retV > 0) {
        crateParts.push(ct.name + ": +" + delV + " ent / -" + retV + " dev");
      }
    }

    var notesParts = [];
    if (inv.marginalNote) notesParts.push(String(inv.marginalNote));
    if (crateParts.length) notesParts.push("Envases: " + crateParts.join(" · "));
    var notesText = notesParts.join(" | ") || "Sin observaciones adicionales.";

    return (
      '<div class="hl-sheet">' +
        '<div class="hl-header">' +
          '<div>' +
            '<h4 class="hl-company">' + ERP.esc(comp.name || "DistriFood ERP") + '</h4>' +
            '<div class="hl-sub">' +
              (comp.rif ? 'RIF: <strong>' + ERP.esc(comp.rif) + '</strong>' : '') +
              (comp.phone ? (comp.rif ? ' · ' : '') + 'Tel: ' + ERP.esc(comp.phone) : '') +
              (comp.address ? ' · ' + ERP.esc(comp.address) : '') +
            '</div>' +
          '</div>' +
          '<div class="hl-doc-box">' +
            '<div class="hl-doc-title">Factura ' + ERP.esc(inv.id) + '</div>' +
            '<div class="hl-sub">Fecha: <strong>' + ERP.esc(inv.date || "—") + '</strong> · ' + ERP.esc(cond) + ' · <strong>' + ERP.esc(inv.status || "—") + '</strong></div>' +
          '</div>' +
        '</div>' +
        '<div class="hl-meta-grid">' +
          '<div class="hl-box">' +
            '<div class="hl-box-label">Cliente</div>' +
            '<div class="hl-box-val">' + ERP.esc(cl.name || "Cliente") + '</div>' +
            '<div class="hl-sub">RIF: ' + ERP.esc(cl.rif || "—") + ' · Tipo: ' + ERP.esc(cl.clientType || "Normal") + ' · Zona: ' + ERP.esc(cl.zone || "—") + '</div>' +
          '</div>' +
          '<div class="hl-box">' +
            '<div class="hl-box-label">Emisión y Tasa</div>' +
            '<div class="hl-box-val">Facturó: ' + ERP.esc(seller) + '</div>' +
            '<div class="hl-sub">Tasa ref.: Bs. ' + Number((state && state.rateBs) || 0).toFixed(2) + ' · ' + items.length + ' SKU(s)</div>' +
          '</div>' +
        '</div>' +
        '<div class="hl-table-wrap">' +
          '<table class="hl-table">' +
            '<thead><tr><th style="width:14%;">SKU</th><th style="width:40%;">Producto</th><th style="width:9%;">Cant.</th><th style="width:14%;">Precio</th><th style="width:23%;">Subtotal</th></tr></thead>' +
            '<tbody>' + (rowsHtml || '<tr><td colspan="5">Sin artículos registrados.</td></tr>') + '</tbody>' +
          '</table>' +
        '</div>' +
        '<div class="hl-footer">' +
          '<div class="hl-note">' + ERP.esc(notesText) + '</div>' +
          '<div class="hl-totals">' +
            '<div class="hl-box-label">Total Factura</div>' +
            '<div class="hl-total-usd">' + ERP.fmtUsd(inv.totalUsd) + '</div>' +
            '<div class="hl-total-bs">' + ERP.fmtBs(inv.totalUsd) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function buildClientHistoryHalfLetterHtml(clientId, state) {
    var comp = getCompanyInfoSafe(state);
    var client = typeof ERP.getClient === "function" ? (ERP.getClient(clientId) || {}) : {};
    if (typeof ERP.ensureClientDebt === "function") ERP.ensureClientDebt(clientId);
    var debtUsd = Number((state.clientBalanceUsd && state.clientBalanceUsd[clientId]) || 0);
    var debtCrates = state.clientCrateDebt && state.clientCrateDebt[clientId];
    var debtSummary = getClientDebtAndDueSummary(clientId, client, state.invoices, debtUsd);

    var clientInvoices = (state.invoices || []).filter(function (inv) { return inv.clientId === clientId; });
    var clientPayments = (state.collectionLog || []).filter(function (lg) { return lg.clientId === clientId; });

    var invRows = clientInvoices.slice(0, 4).map(function (inv) {
      var term = computeInvoiceTermInfo(inv, client);
      var itemsTxt = (inv.items || []).map(function (it) { return it.qty + "x " + it.sku; }).join(", ");
      return (
        '<tr>' +
          '<td><strong>' + ERP.esc(inv.id) + '</strong> <span style="color:#64748b;">(' + ERP.esc(inv.date || "—") + ')</span></td>' +
          '<td>' + ERP.esc(itemsTxt || "—") + '</td>' +
          '<td>' + ERP.esc(term.label) + '</td>' +
          '<td><strong>' + ERP.fmtUsd(inv.totalUsd) + '</strong></td>' +
        '</tr>'
      );
    }).join("");

    var payRows = clientPayments.slice(0, 3).map(function (lg) {
      var recUser = lg.recordedBy || lg.userName || lg.operatorName || lg.sellerName || "—";
      return (
        '<tr>' +
          '<td>' + ERP.esc(lg.txDate || lg.date || "—") + '</td>' +
          '<td><strong>' + ERP.esc(lg.type || "Pago") + '</strong> · ' + ERP.esc(recUser) + '</td>' +
          '<td colspan="2">' + ERP.esc(lg.detail || "") + '</td>' +
        '</tr>'
      );
    }).join("");

    return (
      '<div class="hl-sheet">' +
        '<div class="hl-header">' +
          '<div>' +
            '<h4 class="hl-company">' + ERP.esc(comp.name || "DistriFood ERP") + '</h4>' +
            '<div class="hl-sub">Estado de Cuenta / Historial de Cliente' + (comp.rif ? ' · RIF: ' + ERP.esc(comp.rif) : '') + '</div>' +
          '</div>' +
          '<div class="hl-doc-box">' +
            '<div class="hl-doc-title">' + ERP.esc(client.name || "Cliente") + '</div>' +
            '<div class="hl-sub">RIF: ' + ERP.esc(client.rif || "—") + ' · ' + ERP.esc(client.clientType || "Normal") + ' · Zona: ' + ERP.esc(client.zone || "—") + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="hl-meta-grid">' +
          '<div class="hl-box">' +
            '<div class="hl-box-label">Saldo Pendiente</div>' +
            '<div class="hl-box-val">' + ERP.fmtUsd(debtUsd) + ' <span style="font-weight:500;color:#475569;">(' + ERP.fmtBs(debtUsd) + ')</span></div>' +
            '<div class="hl-sub">' + ERP.esc(debtSummary.dueText) + '</div>' +
          '</div>' +
          '<div class="hl-box">' +
            '<div class="hl-box-label">Casilleros en Cliente</div>' +
            '<div class="hl-box-val">' + ERP.formatClientCratesSummary(debtCrates) + '</div>' +
            '<div class="hl-sub">Facturas: ' + clientInvoices.length + ' · Pagos: ' + clientPayments.length + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="hl-table-wrap">' +
          '<table class="hl-table">' +
            '<thead><tr><th>Factura</th><th>Productos</th><th>Vigencia</th><th>Monto</th></tr></thead>' +
            '<tbody>' +
              (invRows || '<tr><td colspan="4">Sin facturas registradas.</td></tr>') +
              (payRows ? '<tr><td colspan="4" style="background:#f8fafc;font-weight:800;font-size:8px;color:#475569;text-transform:uppercase;">Pagos Recientes</td></tr>' + payRows : '') +
            '</tbody>' +
          '</table>' +
        '</div>' +
        '<div class="hl-footer">' +
          '<div class="hl-note">Comprobante resumen en media hoja carta (Ventas).</div>' +
          '<div class="hl-totals">' +
            '<div class="hl-total-usd">Saldo: ' + ERP.fmtUsd(debtUsd) + '</div>' +
            '<div class="hl-total-bs">' + ERP.fmtBs(debtUsd) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function triggerHalfLetterPrint(sheetHtml) {
    ensurePosVentasStyles();
    var host = document.getElementById("pos-print-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "pos-print-host";
      document.body.appendChild(host);
    }
    host.innerHTML = sheetHtml;

    document.body.classList.add("pos-printing-half-letter");

    var cleaned = false;
    function cleanupPrint() {
      if (cleaned) return;
      cleaned = true;
      document.body.classList.remove("pos-printing-half-letter");
      window.removeEventListener("afterprint", cleanupPrint);
    }

    window.addEventListener("afterprint", cleanupPrint);
    setTimeout(function () {
      try {
        window.print();
      } finally {
        setTimeout(cleanupPrint, 400);
      }
    }, 60);
  }

  function openInvoiceHalfLetterModal(invId) {
    ensurePosVentasStyles();
    var existing = document.getElementById("pos-invoice-print-modal");
    if (existing) existing.remove();

    var state = ERP.state;
    var inv = (state.invoices || []).filter(function (x) { return x.id === invId; })[0];
    if (!inv) return;

    var sheetHtml = buildInvoiceHalfLetterHtml(inv, state);

    var backdrop = document.createElement("div");
    backdrop.id = "pos-invoice-print-modal";
    backdrop.className = "pos-modal-backdrop";
    backdrop.innerHTML =
      '<div class="pos-modal-card" style="max-width:790px;" role="dialog" aria-modal="true">' +
        '<div class="pos-modal-head">' +
          '<div>' +
            '<h3 style="margin:0;font-size:17px;">Vista Previa Media Hoja Carta · ' + ERP.esc(inv.id) + '</h3>' +
            '<div class="muted" style="margin-top:3px;">Pie anclado en ~5.15 in (mitad superior de la hoja carta).</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button type="button" class="primary sm" id="btn-do-print-inv-hl">Imprimir Media Carta</button>' +
            '<button type="button" class="danger sm" id="btn-close-inv-hl">Cerrar</button>' +
          '</div>' +
        '</div>' +
        '<div id="pos-inv-hl-preview">' + sheetHtml + '</div>' +
      '</div>';

    document.body.appendChild(backdrop);

    function closeInvModal() {
      backdrop.remove();
    }

    document.getElementById("btn-do-print-inv-hl").onclick = function () {
      triggerHalfLetterPrint(sheetHtml);
    };
    document.getElementById("btn-close-inv-hl").onclick = closeInvModal;
    backdrop.onclick = function (ev) {
      if (ev.target === backdrop) closeInvModal();
    };
  }

  function parseIsoDateLocal(isoStr) {
    if (!isoStr || typeof isoStr !== "string") return null;
    var parts = isoStr.slice(0, 10).split("-");
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m, d);
  }

  function getTodayLocalMidnight() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function computeInvoiceTermInfo(inv, client) {
    var baseDate = parseIsoDateLocal(inv.date) || getTodayLocalMidnight();
    var today = getTodayLocalMidnight();
    var msPerDay = 1000 * 60 * 60 * 24;
    var elapsedDays = Math.max(0, Math.floor((today.getTime() - baseDate.getTime()) / msPerDay));
    var creditDays = Math.max(0, parseInt(client && client.creditDays != null ? client.creditDays : 0, 10) || 0);

    if (inv.status === "Entregada" || inv.status === "Devuelta Total") {
      return {
        creditDays: creditDays,
        elapsedDays: elapsedDays,
        remainingDays: 0,
        expiredDays: 0,
        label: inv.status === "Entregada" ? "Liquidada / Entregada (" + elapsedDays + "d)" : "Devuelta Total",
        badgeClass: "b-ok"
      };
    }

    if (creditDays <= 0) {
      return {
        creditDays: 0,
        elapsedDays: elapsedDays,
        remainingDays: 0,
        expiredDays: elapsedDays,
        label: elapsedDays > 0 ? "Contado / " + elapsedDays + "d transcurridos" : "Contado (Hoy)",
        badgeClass: elapsedDays > 0 ? "b-warn" : "b-info"
      };
    }

    var diffFromDue = elapsedDays - creditDays;
    if (diffFromDue > 0) {
      return {
        creditDays: creditDays,
        elapsedDays: elapsedDays,
        remainingDays: 0,
        expiredDays: diffFromDue,
        label: "Vencida hace " + diffFromDue + " día(s) (" + elapsedDays + "/" + creditDays + "d)",
        badgeClass: "b-bad"
      };
    }

    var remDays = Math.max(0, creditDays - elapsedDays);
    return {
      creditDays: creditDays,
      elapsedDays: elapsedDays,
      remainingDays: remDays,
      expiredDays: 0,
      label: "Vigente · " + remDays + " día(s) restantes (" + elapsedDays + "/" + creditDays + "d)",
      badgeClass: remDays <= 3 ? "b-warn" : "b-ok"
    };
  }

  function getClientDebtAndDueSummary(clientId, client, invoicesList, balanceUsd) {
    var debtVal = Number(balanceUsd || 0);
    var creditDays = Math.max(0, parseInt(client && client.creditDays != null ? client.creditDays : 0, 10) || 0);
    var clientInvs = (invoicesList || []).filter(function (inv) { return inv.clientId === clientId; });

    var maxExpired = 0;
    var minRemaining = null;
    for (var i = 0; i < clientInvs.length; i++) {
      var info = computeInvoiceTermInfo(clientInvs[i], client);
      if (info.expiredDays > maxExpired) {
        maxExpired = info.expiredDays;
      }
      if (info.remainingDays > 0 && (minRemaining === null || info.remainingDays < minRemaining)) {
        minRemaining = info.remainingDays;
      }
    }

    var dueText = "";
    var dueBadge = "b-info";
    if (debtVal <= 0) {
      dueText = "Sin deuda pendiente · Crédito asignado: " + creditDays + " día(s)";
      dueBadge = "b-ok";
    } else if (maxExpired > 0) {
      dueText = "Vencida hace " + maxExpired + " día(s) (Plazo crédito: " + creditDays + " día(s))";
      dueBadge = "b-bad";
    } else if (minRemaining !== null) {
      dueText = "Vigente · Vence en " + minRemaining + " día(s) (Plazo crédito: " + creditDays + " día(s))";
      dueBadge = minRemaining <= 3 ? "b-warn" : "b-ok";
    } else {
      dueText = "Plazo de crédito: " + creditDays + " día(s)";
      dueBadge = creditDays > 0 ? "b-info" : "b-warn";
    }

    return {
      hasDebt: debtVal > 0,
      debtUsd: debtVal,
      creditDays: creditDays,
      maxExpired: maxExpired,
      minRemaining: minRemaining,
      dueText: dueText,
      dueBadge: dueBadge
    };
  }

  function openClientHistoryModal(clientId) {
    ensurePosVentasStyles();
    var existing = document.getElementById("pos-client-history-modal");
    if (existing) existing.remove();

    var state = ERP.state;
    var client = ERP.getClient(clientId);
    ERP.ensureClientDebt(clientId);
    var debtUsd = Number(state.clientBalanceUsd[clientId] || 0);
    var debtCrates = state.clientCrateDebt[clientId];
    var debtSummary = getClientDebtAndDueSummary(clientId, client, state.invoices, debtUsd);

    var clientInvoices = (state.invoices || []).filter(function (inv) { return inv.clientId === clientId; });
    var clientPayments = (state.collectionLog || []).filter(function (lg) { return lg.clientId === clientId; });

    var invTableRows = clientInvoices.map(function (inv) {
      var term = computeInvoiceTermInfo(inv, client);
      var itemsTxt = (inv.items || []).map(function (it) { return it.qty + "x " + it.sku; }).join(", ");
      var sellerTxt = inv.sellerName || inv.billedBy || "—";
      return (
        '<tr>' +
          '<td><strong>' + ERP.esc(inv.id) + '</strong><div class="muted">' + ERP.esc(inv.date || "—") + '</div></td>' +
          '<td><strong>' + ERP.esc(sellerTxt) + '</strong></td>' +
          '<td>' + ERP.esc(itemsTxt || "—") + '</td>' +
          '<td><strong>' + ERP.fmtUsd(inv.totalUsd) + '</strong><div class="muted">' + ERP.fmtBs(inv.totalUsd) + '</div></td>' +
          '<td><span class="badge ' + term.badgeClass + '">' + ERP.esc(term.label) + '</span></td>' +
          '<td>' + ERP.esc(inv.status || "—") + '</td>' +
        '</tr>'
      );
    }).join("");

    var payTableRows = clientPayments.map(function (lg) {
      var recUser = lg.recordedBy || lg.userName || lg.operatorName || lg.sellerName || "—";
      return (
        '<tr>' +
          '<td><strong>' + ERP.esc(lg.txDate || lg.date || "—") + '</strong></td>' +
          '<td><span class="badge b-info">' + ERP.esc(lg.type || "Pago") + '</span></td>' +
          '<td><strong>' + ERP.esc(recUser) + '</strong></td>' +
          '<td>' + ERP.esc(lg.detail || "") + '</td>' +
        '</tr>'
      );
    }).join("");

    var backdrop = document.createElement("div");
    backdrop.id = "pos-client-history-modal";
    backdrop.className = "pos-modal-backdrop";
    backdrop.innerHTML =
      '<div class="pos-modal-card" role="dialog" aria-modal="true">' +
        '<div class="pos-modal-head">' +
          '<div>' +
            '<h3 style="margin:0;font-size:18px;">Historial de Facturas y Pagos · ' + ERP.esc(client.name || "Cliente") + '</h3>' +
            '<div class="muted" style="margin-top:4px;">RIF: ' + ERP.esc(client.rif || "—") + ' · Tipo: ' + ERP.esc(client.clientType || "Normal") + ' · Ruta: ' + ERP.esc(client.zone || "—") + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button type="button" class="primary sm" id="btn-print-client-history-hl">Imprimir</button>' +
            '<button type="button" class="danger sm" id="btn-close-client-history">Cerrar</button>' +
          '</div>' +
        '</div>' +
        '<div class="grid-3" style="margin-bottom:14px;">' +
          '<div class="kpi">' +
            '<div class="kpi-label">Deuda Actual</div>' +
            '<div class="kpi-val">' + ERP.fmtUsd(debtUsd) + '</div>' +
            '<div class="kpi-sub">' + ERP.fmtBs(debtUsd) + '</div>' +
          '</div>' +
          '<div class="kpi">' +
            '<div class="kpi-label">Vencimiento y Crédito</div>' +
            '<div style="margin-top:6px;"><span class="badge ' + debtSummary.dueBadge + '">' + ERP.esc(debtSummary.dueText) + '</span></div>' +
            '<div class="kpi-sub" style="margin-top:6px;">Días de crédito: <strong>' + debtSummary.creditDays + '</strong></div>' +
          '</div>' +
          '<div class="kpi">' +
            '<div class="kpi-label">Casilleros en Poder del Cliente</div>' +
            '<div style="font-size:13.5px;font-weight:700;margin-top:6px;">' + ERP.formatClientCratesSummary(debtCrates) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pos-section-title">Facturas del Cliente (' + clientInvoices.length + ')</div>' +
        '<div class="table-wrap" style="margin-bottom:16px;">' +
          '<table><thead><tr><th>Factura</th><th>Facturó</th><th>Productos</th><th>Monto</th><th>Vigencia / Vencimiento</th><th>Estado</th></tr></thead><tbody>' +
          (invTableRows || '<tr><td colspan="6" class="muted">Este cliente no tiene facturas registradas.</td></tr>') +
          '</tbody></table>' +
        '</div>' +
        '<div class="pos-section-title">Historial de Pagos y Movimientos (' + clientPayments.length + ')</div>' +
        '<div class="table-wrap">' +
          '<table><thead><tr><th>Fecha</th><th>Tipo / Forma de Pago</th><th>Registrado Por</th><th>Detalle</th></tr></thead><tbody>' +
          (payTableRows || '<tr><td colspan="4" class="muted">No hay pagos registrados para este cliente.</td></tr>') +
          '</tbody></table>' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);

    function closeModal() {
      backdrop.remove();
    }

    document.getElementById("btn-print-client-history-hl").onclick = function () {
      triggerHalfLetterPrint(buildClientHistoryHalfLetterHtml(clientId, state));
    };
    document.getElementById("btn-close-client-history").onclick = closeModal;
    backdrop.onclick = function (ev) {
      if (ev.target === backdrop) closeModal();
    };
  }

  function getSkuCategory(skuObj) {
    if (!skuObj) return "Sin Categoría";
    var cat = (skuObj.category || skuObj.brand || "").trim();
    return cat ? cat : "Sin Categoría";
  }

  function computeDraftCratesByType(draftLines) {
    var totals = {};
    var lines = Array.isArray(draftLines) ? draftLines : [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var skuObj = ERP.getSku(line.sku);
      var crateKey = ERP.normalizeCrateKey(skuObj.crateType);
      if (crateKey && crateKey !== "none") {
        totals[crateKey] = (totals[crateKey] || 0) + Math.max(0, Number(line.qty || 0));
      }
    }
    return totals;
  }

  function renderVentasView(root) {
    ensurePosVentasStyles();

    var state = ERP.state;
    var cTypes = ERP.getCrateTypes();
    var clientsList = ERP.getClients();
    var allSkus = ERP.getSkus();
    var activeUserName = getActiveUserName();

    var selectedClientId = state.selectedSaleClientId || (clientsList[0] ? clientsList[0].id : "");
    ERP.ensureClientDebt(selectedClientId);
    var currentDebtCrates = state.clientCrateDebt[selectedClientId];
    var currentDebtUsd = Number(state.clientBalanceUsd[selectedClientId] || 0);

    var selectedSkuCode = state.selectedSaleSkuCode || (allSkus[0] ? allSkus[0].sku : "PEP-2L");
    var selectedSkuObj = ERP.getSku(selectedSkuCode);
    var selectedSkuCrateKey = ERP.normalizeCrateKey(selectedSkuObj.crateType);
    var hasCrate = selectedSkuCrateKey !== "none";
    var selectedSkuCrateObj = ERP.getCrateType(selectedSkuCrateKey);
    var initialQtyVal = (typeof state.draftSaleQty === "number" && state.draftSaleQty > 0) ? state.draftSaleQty : 1;

    var autoCratesDelivered = computeDraftCratesByType(state.draftSaleLines);

    var activeCategory = state.posSelectedCategory || "Todo";
    var searchQuery = String(state.posSearchQuery || "").trim().toLowerCase();

    var categories = ["Todo"];
    var seenCat = { "Todo": true };
    for (var i = 0; i < allSkus.length; i++) {
      var cName = getSkuCategory(allSkus[i]);
      if (!seenCat[cName]) {
        seenCat[cName] = true;
        categories.push(cName);
      }
    }
    if (!seenCat["Sin Categoría"]) {
      categories.push("Sin Categoría");
    }

    var catChipsHtml = categories.map(function (cat) {
      var isAct = activeCategory === cat;
      return '<button type="button" class="pos-cat-chip' + (isAct ? " active" : "") + '" data-pos-cat="' + ERP.esc(cat) + '">' + ERP.esc(cat) + '</button>';
    }).join("");

    var clientOpts = clientsList.map(function (c) {
      var cType = c.clientType || "Normal";
      return '<option value="' + ERP.esc(c.id) + '"' + (c.id === selectedClientId ? " selected" : "") + '>' + ERP.esc(c.name) + ' (' + ERP.esc(c.rif) + ' · ' + ERP.esc(cType) + ')</option>';
    }).join("");

    var activeClient = ERP.getClient(selectedClientId);
    var activeType = (activeClient && activeClient.clientType) ? activeClient.clientType : "Normal";
    var debtInfo = getClientDebtAndDueSummary(selectedClientId, activeClient, state.invoices, currentDebtUsd);

    var clientStatusHtml = activeClient
      ? (
        '<div class="pos-debt-box ' + (debtInfo.hasDebt ? "has-debt" : "no-debt") + '" id="sale-client-debt-box">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">' +
            '<div>' +
              '<strong>' + (debtInfo.hasDebt ? "Tiene deuda pendiente" : "Sin deuda pendiente") + ':</strong> ' +
              '<strong>' + ERP.fmtUsd(debtInfo.debtUsd) + '</strong> <span class="muted">(' + ERP.fmtBs(debtInfo.debtUsd) + ')</span>' +
            '</div>' +
            '<button type="button" class="sm" id="btn-open-client-history">Historial de Facturas y Pagos</button>' +
          '</div>' +
          '<div style="margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
            '<span class="badge ' + debtInfo.dueBadge + '">' + ERP.esc(debtInfo.dueText) + '</span>' +
            '<span class="muted">Escala: <strong>' + ERP.esc(activeType) + '</strong> · Ruta: <strong>' + ERP.esc(activeClient.zone || "—") + '</strong> · Vacíos: <strong>' + ERP.formatClientCratesSummary(currentDebtCrates) + '</strong></span>' +
          '</div>' +
        '</div>'
      )
      : "";

    var recentSkus = Array.isArray(state.posRecentSkus) && state.posRecentSkus.length
      ? state.posRecentSkus.map(function (code) { return ERP.getSku(code); }).filter(function (s) { return s && s.name; }).slice(0, 6)
      : allSkus.slice(0, 5);

    var filteredSkus = allSkus.filter(function (s) {
      var sCat = getSkuCategory(s);
      if (activeCategory !== "Todo" && sCat !== activeCategory) return false;
      if (searchQuery) {
        var hay = (String(s.sku) + " " + String(s.name) + " " + sCat).toLowerCase();
        if (hay.indexOf(searchQuery) === -1) return false;
      }
      return true;
    });

    function buildProductCardHtml(s) {
      var stockQty = ERP.getSkuFefoStock(s.sku);
      var isSoldOut = stockQty <= 0;
      var isSelected = s.sku === selectedSkuCode;
      var priceVal = ERP.getSkuPriceForClientType(s.sku, activeType);
      var customThumb = getSkuThumbnailSrc(s, state);
      var fallbackThumb = buildFallbackSkuSvgDataUrl(s);
      var thumbSrc = customThumb || fallbackThumb;

      return (
        '<button type="button" class="pos-card' + (isSoldOut ? " sold-out" : "") + (isSelected ? " selected" : "") + '" data-pos-sku="' + ERP.esc(s.sku) + '">' +
          '<div class="pos-card-top">' +
            (isSoldOut ? '<span class="pos-sold-out-tag">Agotado</span>' : '<span>' + stockQty + ' Und.</span>') +
            '<span>' + ERP.esc(s.sku) + '</span>' +
          '</div>' +
          '<div class="pos-card-thumb-wrap">' +
            '<img class="pos-card-thumb" src="' + ERP.esc(thumbSrc) + '" alt="' + ERP.esc(s.name || s.sku) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + ERP.esc(fallbackThumb) + '\';" />' +
          '</div>' +
          '<div class="pos-card-name">' + ERP.esc(s.name) + '</div>' +
          '<div class="pos-card-price">' + ERP.fmtUsd(priceVal) + '</div>' +
        '</button>'
      );
    }

    var recentCardsHtml = recentSkus.map(buildProductCardHtml).join("");
    var catalogCardsHtml = filteredSkus.map(buildProductCardHtml).join("");

    var draftRows = state.draftSaleLines.map(function (line, idx) {
      var s = ERP.getSku(line.sku);
      var unitP = ERP.getSkuPriceForClientType(line.sku, activeType);
      var sub = Number(line.qty || 0) * unitP;
      return (
        '<tr>' +
          '<td><strong>' + ERP.esc(s.sku) + '</strong> · ' + ERP.esc(s.name) + '</td>' +
          '<td>' + ERP.getSkuFefoStock(s.sku) + '</td>' +
          '<td><input type="number" min="1" data-draft-qty="' + idx + '" value="' + Number(line.qty || 1) + '" style="width:68px;padding:5px;border:1px solid #cbd5e1;border-radius:6px;" /></td>' +
          '<td>' + ERP.fmtUsd(unitP) + '</td>' +
          '<td><strong>' + ERP.fmtUsd(sub) + '</strong> <span class="muted">(' + ERP.fmtBs(sub) + ')</span></td>' +
          '<td><button type="button" class="danger sm" data-del-draft="' + idx + '">Quitar</button></td>' +
        '</tr>'
      );
    }).join("");

    var draftTotal = state.draftSaleLines.reduce(function (acc, line) {
      return acc + Number(line.qty || 0) * ERP.getSkuPriceForClientType(line.sku, activeType);
    }, 0);

    var crateBoxHtml = cTypes.map(function (ct) {
      var keyId = ERP.normalizeCrateKey(ct.id);
      var cDebt = Number(currentDebtCrates[keyId] || 0);
      var preDel = Number(autoCratesDelivered[keyId] || 0);
      var hasAutoCrates = preDel > 0;
      var netInit = preDel;
      var projInit = Math.max(0, cDebt + netInit);
      return (
        '<div class="kpi" style="' + (hasAutoCrates ? 'border-color:var(--accent);background:#f0f9ff;' : '') + '">' +
          '<strong>' + ERP.esc(ct.name) + '</strong>' + (hasAutoCrates ? ' <span class="badge b-info">' + preDel + ' en pedido</span>' : '') +
          '<div class="muted" style="margin-top:2px;">Almacén: ' + Number((state.crateStock && state.crateStock[keyId]) || 0) + ' · Cliente tiene: <strong>' + cDebt + '</strong></div>' +
          '<div class="grid-2" style="margin-top:8px;gap:8px;">' +
            '<div class="field" style="margin-bottom:0;"><label>Entregados (Casilleros)</label><input type="number" min="0" class="crate-calc-inp" data-crate-id="' + ERP.esc(keyId) + '" id="c-del-' + ERP.esc(keyId) + '" value="' + preDel + '" /></div>' +
            '<div class="field" style="margin-bottom:0;"><label>Devueltos (Vacíos)</label><input type="number" min="0" class="crate-calc-inp" data-crate-id="' + ERP.esc(keyId) + '" id="c-ret-' + ERP.esc(keyId) + '" value="0" /></div>' +
          '</div>' +
          '<div class="muted" id="c-net-preview-' + ERP.esc(keyId) + '" style="margin-top:6px;">Neto a sumar al cliente: <strong>' + (netInit > 0 ? "+" + netInit : netInit) + '</strong> → Nuevo total cliente: <strong>' + projInit + '</strong></div>' +
        '</div>'
      );
    }).join("");

    var invRows = state.invoices.map(function (inv) {
      var cl = ERP.getClient(inv.clientId);
      var itemsTxt = inv.items.map(function (it) { return it.qty + "x " + it.sku + " (" + ERP.fmtUsd(it.unitPriceUsd) + ")"; }).join(", ");
      var stClass = inv.status === "Entregada" ? "b-ok" : (inv.status.indexOf("Devolución") !== -1 ? "b-warn" : "b-info");
      var billedUser = inv.sellerName || inv.billedBy || "—";
      var payLabel = inv.payCond || inv.condition || "—";
      return (
        '<tr>' +
          '<td><strong>' + ERP.esc(inv.id) + '</strong><div class="muted">' + ERP.esc(inv.date) + ' · <span class="badge b-info">' + ERP.esc(payLabel) + '</span></div></td>' +
          '<td><strong>' + ERP.esc(cl.name) + '</strong><div class="muted">Facturó: <strong>' + ERP.esc(billedUser) + '</strong> · ' + ERP.esc(cl.clientType || "Normal") + '</div></td>' +
          '<td>' + ERP.esc(itemsTxt) + '<div class="nota-marginal">' + ERP.esc(inv.marginalNote || "") + '</div></td>' +
          '<td><strong>' + ERP.fmtUsd(inv.totalUsd) + '</strong><div class="muted">' + ERP.fmtBs(inv.totalUsd) + '</div></td>' +
          '<td><span class="badge ' + stClass + '">' + ERP.esc(inv.status) + '</span></td>' +
          '<td>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
              '<button type="button" class="primary sm" data-print-inv-hl="' + ERP.esc(inv.id) + '">Imprimir</button>' +
              '<button type="button" class="sm" data-go-despacho="1">Despacho / Devolución</button>' +
            '</div>' +
          '</td>' +
        '</tr>'
      );
    }).join("");

    var hintText = hasCrate
      ? ('Producto seleccionado: <strong>' + ERP.esc(selectedSkuObj.sku) + '</strong> · Envase asociado: <strong>' + ERP.esc(selectedSkuCrateObj.name) + '</strong> (Cliente tiene: <strong>' + Number(currentDebtCrates[selectedSkuCrateKey] || 0) + '</strong>)')
      : ('Producto seleccionado: <strong>' + ERP.esc(selectedSkuObj.sku) + '</strong> · <strong>Sin casillero</strong> (no lleva envase retornable)');

    root.innerHTML =
      '<div class="card">' +
        '<div class="card-header">' +
          '<div><h2 class="card-title">Punto de Venta Interactivo · Facturación FEFO y Nota Marginal</h2><p class="muted">Usuario facturando: <strong>' + ERP.esc(activeUserName) + '</strong> · Toca un cuadrito de producto para seleccionarlo y sumarlo rápido al pedido.</p></div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button type="button" class="primary sm" id="btn-open-new-client">+ Agregar Nuevo Cliente</button>' +
            '<button type="button" class="warn sm" id="btn-go-despacho">Despacho / Devoluciones</button>' +
          '</div>' +
        '</div>' +
        '<div class="grid-2">' +
          '<div>' +
            '<div class="grid-2">' +
              '<div class="field"><label>Cliente</label><select id="sale-client">' + clientOpts + '</select></div>' +
              '<div class="field"><label>Condición</label><select id="sale-pay"><option value="Crédito">Crédito</option><option value="Contado">Contado</option></select></div>' +
            '</div>' +
            clientStatusHtml +
            '<div class="pos-cat-bar">' + catChipsHtml + '</div>' +
            '<div class="pos-search-row">' +
              '<input type="text" class="pos-search-input" id="pos-search-inp" value="' + ERP.esc(state.posSearchQuery || "") + '" placeholder="Buscar productos por nombre o SKU..." />' +
              '<button type="button" class="sm" id="btn-pos-clear-search">Limpiar</button>' +
            '</div>' +
            '<div class="pos-section-title">Recientes</div>' +
            '<div class="pos-prod-grid">' + (recentCardsHtml || '<p class="muted">Sin recientes.</p>') + '</div>' +
            '<div class="pos-section-title">Productos (' + filteredSkus.length + ')</div>' +
            '<div class="pos-prod-grid">' + (catalogCardsHtml || '<p class="muted">No hay productos que coincidan con el filtro.</p>') + '</div>' +
          '</div>' +
          '<div>' +
            '<div class="kpi" style="margin-bottom:12px;">' +
              '<div class="kpi-label">Producto Seleccionado</div>' +
              '<div style="font-size:15px;font-weight:800;margin-top:4px;">' + ERP.esc(selectedSkuObj.sku) + ' — ' + ERP.esc(selectedSkuObj.name) + '</div>' +
              '<div class="muted" style="margin-top:2px;">Precio (' + ERP.esc(activeType) + '): <strong>' + ERP.fmtUsd(ERP.getSkuPriceForClientType(selectedSkuObj.sku, activeType)) + '</strong> · Stock FEFO: <strong>' + ERP.getSkuFefoStock(selectedSkuObj.sku) + ' und.</strong></div>' +
              '<div class="grid-2" style="margin-top:10px;gap:8px;align-items:end;">' +
                '<div class="field" style="margin-bottom:0;"><label>Cantidad a Agregar</label><input type="number" min="1" id="sale-qty" value="' + initialQtyVal + '" /></div>' +
                '<button type="button" class="primary" id="btn-add-line">+ Añadir al Pedido</button>' +
              '</div>' +
            '</div>' +
            '<div class="muted" id="sale-sku-crate-hint" style="margin-bottom:10px;">' + hintText + '</div>' +
            '<div class="table-wrap" style="margin-bottom:12px;"><table><thead><tr><th>SKU</th><th>FEFO</th><th>Cant.</th><th>Precio</th><th>Subtotal</th><th></th></tr></thead><tbody>' + (draftRows || '<tr><td colspan="6" class="muted">Sin líneas.</td></tr>') + '</tbody></table></div>' +
            '<div class="kpi" style="margin-bottom:12px;"><div class="kpi-label">Total Factura</div><div class="kpi-val">' + ERP.fmtUsd(draftTotal) + ' · ' + ERP.fmtBs(draftTotal) + '</div></div>' +
            '<button type="button" class="success" style="width:100%;height:40px;" id="btn-emit-inv">Emitir Factura y Descontar FEFO</button>' +
          '</div>' +
        '</div>' +
        '<div class="pos-crates-full-section">' +
          '<label style="font-size:13px;font-weight:800;color:#0f172a;display:block;margin-bottom:8px;">Retornables / Casilleros (Calculados automáticamente del pedido)</label>' +
          '<div class="grid-3">' + crateBoxHtml + '</div>' +
          '<div class="field" style="margin-top:12px;margin-bottom:0;"><label>Nota Marginal Adicional</label><input type="text" id="sale-note" placeholder="Observación de envases en ruta" /></div>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-header"><h3 class="card-title">Facturas Emitidas (' + state.invoices.length + ')</h3></div>' +
        '<div class="table-wrap"><table><thead><tr><th>Factura</th><th>Cliente / Facturador</th><th>Mercancía y Nota Marginal</th><th>Total</th><th>Estado</th><th>Acción</th></tr></thead><tbody>' + (invRows || '<tr><td colspan="6" class="muted">Sin facturas.</td></tr>') + '</tbody></table></div>' +
      '</div>';

    function pushRecentSku(code) {
      if (!code) return;
      var list = Array.isArray(state.posRecentSkus) ? state.posRecentSkus.slice() : [];
      list = list.filter(function (x) { return x !== code; });
      list.unshift(code);
      state.posRecentSkus = list.slice(0, 6);
    }

    function addSkuQtyToDraft(code, qtyToAdd) {
      var q = Math.max(1, parseInt(qtyToAdd, 10) || 1);
      var found = false;
      for (var i = 0; i < state.draftSaleLines.length; i++) {
        if (state.draftSaleLines[i].sku === code) {
          state.draftSaleLines[i].qty = Number(state.draftSaleLines[i].qty) + q;
          found = true;
          break;
        }
      }
      if (!found) {
        state.draftSaleLines.push({ sku: code, qty: q });
      }
      pushRecentSku(code);
    }

    function refreshCrateLivePreviews() {
      var listC = ERP.getCrateTypes();
      for (var c = 0; c < listC.length; c++) {
        var ct = listC[c];
        var keyId = ERP.normalizeCrateKey(ct.id);
        var elDel = document.getElementById("c-del-" + keyId);
        var elRet = document.getElementById("c-ret-" + keyId);
        var elPrev = document.getElementById("c-net-preview-" + keyId);
        var dVal = Math.max(0, parseInt(elDel ? elDel.value : "0", 10) || 0);
        var rVal = Math.max(0, parseInt(elRet ? elRet.value : "0", 10) || 0);
        var net = dVal - rVal;
        var baseDebt = Number((state.clientCrateDebt[selectedClientId] && state.clientCrateDebt[selectedClientId][keyId]) || 0);
        var projected = Math.max(0, baseDebt + net);
        if (elPrev) {
          var signStr = net > 0 ? ("+" + net) : String(net);
          elPrev.innerHTML = "Neto a sumar al cliente: <strong>" + signStr + "</strong> → Nuevo total cliente: <strong>" + projected + "</strong>";
        }
      }
    }

    var historyBtn = document.getElementById("btn-open-client-history");
    if (historyBtn) {
      historyBtn.onclick = function () {
        openClientHistoryModal(selectedClientId);
      };
    }

    var printInvBtns = root.querySelectorAll("button[data-print-inv-hl]");
    for (var pb = 0; pb < printInvBtns.length; pb++) {
      printInvBtns[pb].onclick = function () {
        openInvoiceHalfLetterModal(this.getAttribute("data-print-inv-hl"));
      };
    }

    var catBtns = root.querySelectorAll("button[data-pos-cat]");
    for (var cb = 0; cb < catBtns.length; cb++) {
      catBtns[cb].onclick = function () {
        state.posSelectedCategory = this.getAttribute("data-pos-cat");
        ERP.saveState();
        ERP.render();
      };
    }

    var searchInp = document.getElementById("pos-search-inp");
    if (searchInp) {
      searchInp.oninput = function () {
        state.posSearchQuery = this.value;
        ERP.saveState();
        ERP.render();
      };
    }

    var clearSearchBtn = document.getElementById("btn-pos-clear-search");
    if (clearSearchBtn) {
      clearSearchBtn.onclick = function () {
        state.posSearchQuery = "";
        state.posSelectedCategory = "Todo";
        ERP.saveState();
        ERP.render();
      };
    }

    var prodCards = root.querySelectorAll("button[data-pos-sku]");
    for (var pc = 0; pc < prodCards.length; pc++) {
      prodCards[pc].onclick = function () {
        var clickedCode = this.getAttribute("data-pos-sku");
        var qVal = Math.max(1, parseInt((document.getElementById("sale-qty") && document.getElementById("sale-qty").value) || state.draftSaleQty || 1, 10) || 1);
        state.selectedSaleSkuCode = clickedCode;
        state.draftSaleQty = qVal;
        addSkuQtyToDraft(clickedCode, qVal);
        ERP.saveState();
        ERP.render();
      };
    }

    var crateInputs = root.querySelectorAll("input.crate-calc-inp");
    for (var ci = 0; ci < crateInputs.length; ci++) {
      crateInputs[ci].oninput = refreshCrateLivePreviews;
      crateInputs[ci].onchange = refreshCrateLivePreviews;
    }

    var saleQtyInp = document.getElementById("sale-qty");
    if (saleQtyInp) {
      saleQtyInp.oninput = function () {
        state.draftSaleQty = Math.max(1, parseInt(this.value, 10) || 1);
      };
    }

    document.getElementById("btn-open-new-client").onclick = function () {
      ERP.openNewClientModal(function (created) { state.selectedSaleClientId = created.id; ERP.saveState(); });
    };
    document.getElementById("sale-client").onchange = function () { state.selectedSaleClientId = this.value; ERP.saveState(); ERP.render(); };

    function goDespacho() { state.activeTab = "despacho"; ERP.saveState(); ERP.render(); }
    document.getElementById("btn-go-despacho").onclick = goDespacho;
    var goBtns = root.querySelectorAll("button[data-go-despacho]");
    for (var g = 0; g < goBtns.length; g++) goBtns[g].onclick = goDespacho;

    document.getElementById("btn-add-line").onclick = function () {
      var code = state.selectedSaleSkuCode || selectedSkuCode;
      var qty = Math.max(1, parseInt(document.getElementById("sale-qty").value, 10) || 1);
      addSkuQtyToDraft(code, qty);
      ERP.saveState();
      ERP.render();
    };

    var qInputs = root.querySelectorAll("input[data-draft-qty]");
    for (var q = 0; q < qInputs.length; q++) {
      qInputs[q].onchange = function () {
        var idx = parseInt(this.getAttribute("data-draft-qty"), 10);
        if (state.draftSaleLines[idx]) state.draftSaleLines[idx].qty = Math.max(1, parseInt(this.value, 10) || 1);
        ERP.saveState();
        ERP.render();
      };
    }

    var dBtns = root.querySelectorAll("button[data-del-draft]");
    for (var d = 0; d < dBtns.length; d++) {
      dBtns[d].onclick = function () { state.draftSaleLines.splice(parseInt(this.getAttribute("data-del-draft"), 10), 1); ERP.saveState(); ERP.render(); };
    }

    document.getElementById("btn-emit-inv").onclick = function () {
      if (!state.draftSaleLines.length) { ERP.setNotice("bad", "Agregue al menos un SKU a la factura."); ERP.render(); return; }
      var clientId = document.getElementById("sale-client").value;
      state.selectedSaleClientId = clientId;
      var payCond = document.getElementById("sale-pay").value;
      var extraNote = document.getElementById("sale-note").value.trim();
      var clObj = ERP.getClient(clientId);
      var clType = (clObj && clObj.clientType) ? clObj.clientType : "Normal";
      var currentBiller = getActiveUserName();

      var listC = ERP.getCrateTypes();
      var delMap = {};
      var retMap = {};
      for (var c = 0; c < listC.length; c++) {
        var ct = listC[c];
        var cKey = ERP.normalizeCrateKey(ct.id);
        var elDel = document.getElementById("c-del-" + cKey);
        var elRet = document.getElementById("c-ret-" + cKey);
        var dVal = Math.max(0, parseInt(elDel ? elDel.value : "0", 10) || 0);
        var rVal = Math.max(0, parseInt(elRet ? elRet.value : "0", 10) || 0);
        if (dVal > Number((state.crateStock && state.crateStock[cKey]) || 0)) {
          ERP.setNotice("bad", "Stock insuficiente de '" + ct.name + "' (disponible: " + (state.crateStock[cKey] || 0) + ").");
          ERP.render();
          return;
        }
        delMap[cKey] = dVal;
        retMap[cKey] = rVal;
      }

      var items = [];
      var totalUsd = 0;
      for (var i = 0; i < state.draftSaleLines.length; i++) {
        var line = state.draftSaleLines[i];
        var unitPrice = ERP.getSkuPriceForClientType(line.sku, clType);
        var alloc = ERP.allocateFefo(line.sku, Number(line.qty));
        if (!alloc.ok) { ERP.setNotice("bad", alloc.error); ERP.render(); return; }
        totalUsd += Number(line.qty) * unitPrice;
        items.push({ sku: line.sku, qty: Number(line.qty), unitPriceUsd: unitPrice, lotAllocations: alloc.allocations });
      }

      ERP.ensureClientDebt(clientId);
      if (!state.crateStock || typeof state.crateStock !== "object") state.crateStock = {};
      var addedCratesSummary = [];
      for (var k = 0; k < listC.length; k++) {
        var cType = listC[k];
        var keyId = ERP.normalizeCrateKey(cType.id);
        var dNum = Number(delMap[keyId] || 0);
        var rNum = Number(retMap[keyId] || 0);
        var netCrates = dNum - rNum;
        state.crateStock[keyId] = Math.max(0, Number(state.crateStock[keyId] || 0) - dNum + rNum);
        var prevClientCrates = Number(state.clientCrateDebt[clientId][keyId] || 0);
        var nextClientCrates = Math.max(0, prevClientCrates + netCrates);
        state.clientCrateDebt[clientId][keyId] = nextClientCrates;
        if (netCrates !== 0) {
          addedCratesSummary.push((netCrates > 0 ? "+" : "") + netCrates + " " + cType.name + " (Total cliente: " + nextClientCrates + ")");
        }
      }
      if (payCond === "Crédito") {
        state.clientBalanceUsd[clientId] = Number((Number(state.clientBalanceUsd[clientId] || 0) + totalUsd).toFixed(2));
      }

      var note = ERP.buildMarginalNote(clientId, delMap, retMap);
      if (extraNote) note += " Obs: " + extraNote;

      var newId = "FAC-" + (1000 + state.invoices.length + state.deletedInvoices.length + 1);
      var todayIso = new Date().toISOString().slice(0, 10);
      state.invoices.unshift({
        id: newId, date: todayIso, clientId: clientId,
        sellerName: currentBiller, billedBy: currentBiller,
        payCond: payCond, condition: payCond,
        status: "En Despacho", items: items,
        cratesDelivered: delMap, cratesReturned: retMap, marginalNote: note,
        totalUsd: Number(totalUsd.toFixed(2)), returnsLog: []
      });

      if (!Array.isArray(state.collectionLog)) state.collectionLog = [];
      if (payCond === "Contado") {
        state.collectionLog.unshift({
          clientId: clientId,
          txDate: todayIso,
          date: todayIso,
          type: "Pago Factura",
          paymentMethod: "Contado",
          amountUsd: Number(totalUsd.toFixed(2)),
          recordedBy: currentBiller,
          userName: currentBiller,
          detail: "Factura " + newId + " cobrada de contado por $" + Number(totalUsd).toFixed(2) + " · Facturó: " + currentBiller
        });
      }

      state.draftSaleLines = [];
      state.draftSaleQty = 1;
      var cratesMsg = addedCratesSummary.length ? " · Vacíos sumados al estado de cuenta: " + addedCratesSummary.join(", ") : "";
      ERP.setNotice("ok", "Factura " + newId + " emitida por " + currentBiller + " (" + clType + " · " + payCond + ") por " + ERP.fmtUsd(totalUsd) + cratesMsg + ".");
      ERP.saveState();
      ERP.render();
      openInvoiceHalfLetterModal(newId);
    };
  }

  ERP.registerMenuModule("ventas", renderVentasView);
})();
