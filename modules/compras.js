(function () {
  "use strict";

  var ERP = window.DistriFoodERP;
  if (!ERP || typeof ERP.registerMenuModule !== "function") return;

  function escSafe(v) {
    if (typeof ERP.esc === "function") return ERP.esc(v);
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ensureComprasState(state) {
    if (!Array.isArray(state.draftPurchaseLines)) state.draftPurchaseLines = [];
    if (!Array.isArray(state.purchases)) state.purchases = [];
    if (!Array.isArray(state.lots)) state.lots = [];
    if (!Array.isArray(state.supplierCrateDebts)) state.supplierCrateDebts = [];
    if (!state.cratePricesBs || typeof state.cratePricesBs !== "object") state.cratePricesBs = {};
    if (!state.purchaseReportFilters || typeof state.purchaseReportFilters !== "object") {
      state.purchaseReportFilters = {
        fromDate: "",
        toDate: "",
        supplier: "ALL",
        sku: "ALL",
        crateStatus: "ALL"
      };
    }
  }

  function normalizeCrateKeySafe(rawVal) {
    if (typeof ERP.normalizeCrateKey === "function") {
      return ERP.normalizeCrateKey(rawVal);
    }
    var clean = String(rawVal || "none").trim().toLowerCase();
    return clean || "none";
  }

  function getCrateNameSafe(crateKey) {
    if (!crateKey || crateKey === "none") return "";
    if (typeof ERP.getCrateType === "function") {
      var ct = ERP.getCrateType(crateKey);
      if (ct && ct.name) return String(ct.name);
    }
    return String(crateKey);
  }

  function getCratePriceBsSafe(state, crateId) {
    if (state.cratePricesBs && state.cratePricesBs[crateId] != null && state.cratePricesBs[crateId] !== "") {
      var v1 = parseFloat(state.cratePricesBs[crateId]);
      if (!isNaN(v1) && v1 >= 0) return Number(v1.toFixed(2));
    }
    if (typeof ERP.getCrateType === "function") {
      var ct = ERP.getCrateType(crateId);
      if (ct && ct.priceBs != null && ct.priceBs !== "") {
        var v2 = parseFloat(ct.priceBs);
        if (!isNaN(v2) && v2 >= 0) return Number(v2.toFixed(2));
      }
      if (ct && ct.fixedPriceBs != null && ct.fixedPriceBs !== "") {
        var v3 = parseFloat(ct.fixedPriceBs);
        if (!isNaN(v3) && v3 >= 0) return Number(v3.toFixed(2));
      }
    }
    return 0;
  }

  function formatBsSafe(val) {
    var num = Number(val || 0);
    return "Bs. " + num.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtUsdSafe(val) {
    if (typeof ERP.fmtUsd === "function") return ERP.fmtUsd(val);
    return "$" + Number(val || 0).toFixed(2);
  }

  function fmtBsFromUsdSafe(usdVal) {
    if (typeof ERP.fmtBs === "function") return ERP.fmtBs(usdVal);
    var rate = Number((ERP.state && ERP.state.rateBs) || 1);
    return formatBsSafe(Number(usdVal || 0) * rate);
  }

  function getTodayIsoSafe() {
    if (typeof ERP.getTodayIsoDate === "function") return ERP.getTodayIsoDate();
    return new Date().toISOString().slice(0, 10);
  }

  function openPurchaseInvoiceModal(purchase) {
    if (!purchase || typeof ERP.openModal !== "function") return;
    var state = ERP.state || {};
    var comp = (typeof ERP.getCompany === "function" ? ERP.getCompany() : null) || {};
    var lines = Array.isArray(purchase.lines) ? purchase.lines : [];

    var lineRows = lines.map(function (ln) {
      var skuObj = (typeof ERP.getSku === "function" ? ERP.getSku(ln.sku) : null) || { sku: ln.sku, name: ln.sku };
      var cKey = normalizeCrateKeySafe(skuObj.crateType);
      var cName = cKey !== "none" ? getCrateNameSafe(cKey) : "-";
      var subUsd = Number(ln.qty || 0) * Number(ln.costUsd || 0);
      return (
        "<tr>" +
          "<td><strong>" + escSafe(ln.sku) + "</strong> - " + escSafe(skuObj.name || ln.sku) + "</td>" +
          "<td>" + escSafe(ln.lotId || "-") + "</td>" +
          "<td>" + escSafe(ln.expiry || "-") + "</td>" +
          "<td>" + escSafe(cName) + "</td>" +
          "<td>" + Number(ln.qty || 0) + "</td>" +
          "<td>" + fmtUsdSafe(ln.costUsd) + "</td>" +
          "<td><strong>" + fmtUsdSafe(subUsd) + "</strong></td>" +
        "</tr>"
      );
    }).join("");

    var relatedDebts = (Array.isArray(state.supplierCrateDebts) ? state.supplierCrateDebts : []).filter(function (d) {
      if (!Array.isArray(d.history)) return false;
      return d.history.some(function (h) { return String(h.purchaseId) === String(purchase.id); });
    });

    var crateSummaryHtml = relatedDebts.length
      ? '<div style="margin-top:12px;"><div class="muted" style="margin-bottom:6px;"><strong>Casilleros asociados a este proveedor:</strong></div>' +
        relatedDebts.map(function (d) {
          return '<span class="badge b-info" style="margin-right:6px;">' +
            escSafe(d.crateName || d.crateId) + ": " + Number(d.totalQty || 0) + " recibidos · " + Number(d.pendingQty || 0) + " pendientes" +
          "</span>";
        }).join("") + "</div>"
      : "";

    ERP.openModal(
      '<div class="card-header">' +
        "<div>" +
          '<h3 class="card-title">Factura / Soporte de Compra - ' + escSafe(purchase.id) + "</h3>" +
          '<p class="muted">' + escSafe(comp.name || "Empresa") + (comp.rif ? " · RIF: " + escSafe(comp.rif) : "") + "</p>" +
        "</div>" +
        '<button type="button" class="sm" onclick="closeModal()">Cerrar</button>' +
      "</div>" +
      '<div class="grid-3" style="margin-bottom:12px;">' +
        '<div><span class="muted">Proveedor:</span><br /><strong>' + escSafe(purchase.supplier || "Proveedor") + "</strong></div>" +
        '<div><span class="muted">Fecha de Compra:</span><br /><strong>' + escSafe(purchase.date || "-") + "</strong></div>" +
        '<div><span class="muted">Tasa de Referencia:</span><br /><strong>Bs. ' + Number(state.rateBs || 0).toFixed(4) + "</strong></div>" +
      "</div>" +
      '<div class="table-wrap">' +
        "<table><thead><tr><th>SKU / Producto</th><th>Lote</th><th>Caducidad</th><th>Casillero</th><th>Cant.</th><th>Costo Unit.</th><th>Subtotal</th></tr></thead><tbody>" +
        (lineRows || '<tr><td colspan="7" class="muted">Sin lineas en esta compra.</td></tr>') +
        "</tbody></table>" +
      "</div>" +
      crateSummaryHtml +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border,#e5e7eb);">' +
        '<div><span class="muted">Total Compra:</span> <strong>' + fmtUsdSafe(purchase.totalUsd) + '</strong> <span class="muted">(' + fmtBsFromUsdSafe(purchase.totalUsd) + ")</span></div>" +
        '<div style="display:flex;gap:8px;">' +
          (typeof window.print === "function" ? '<button type="button" class="sm" onclick="window.print()">Imprimir</button>' : "") +
          '<button type="button" class="primary sm" onclick="closeModal()">Listo</button>' +
        "</div>" +
      "</div>"
    );
  }

  function registerSupplierCratePayable(state, purchaseId, dateStr, supplierName, lines) {
    ensureComprasState(state);
    var supClean = String(supplierName || "Proveedor").trim() || "Proveedor";
    var supKey = supClean.toLowerCase();

    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      var skuObj = typeof ERP.getSku === "function" ? ERP.getSku(ln.sku) : null;
      var crateKey = normalizeCrateKeySafe(skuObj && skuObj.crateType);
      if (!crateKey || crateKey === "none") continue;

      var qty = Number(ln.qty || 0);
      if (qty <= 0) continue;

      var crateName = getCrateNameSafe(crateKey);
      var existing = null;

      for (var j = 0; j < state.supplierCrateDebts.length; j++) {
        var row = state.supplierCrateDebts[j];
        if (
          row &&
          String(row.supplierKey || "").toLowerCase() === supKey &&
          String(row.crateId || "") === crateKey &&
          Number(row.pendingQty || 0) > 0
        ) {
          existing = row;
          break;
        }
      }

      var logItem = {
        purchaseId: purchaseId,
        sku: ln.sku,
        qty: qty,
        date: dateStr
      };

      if (existing) {
        existing.pendingQty = Number((Number(existing.pendingQty || 0) + qty).toFixed(2));
        existing.totalQty = Number((Number(existing.totalQty || 0) + qty).toFixed(2));
        existing.status = "Pendiente";
        existing.updatedAt = dateStr;
        if (!Array.isArray(existing.history)) existing.history = [];
        existing.history.push(logItem);
      } else {
        state.supplierCrateDebts.push({
          id: "CXP-CAS-" + Date.now() + "-" + Math.floor(100 + Math.random() * 900),
          supplierKey: supKey,
          supplierName: supClean,
          crateId: crateKey,
          crateName: crateName,
          totalQty: qty,
          pendingQty: qty,
          allowedSettlements: ["CASILLEROS", "BS"],
          status: "Pendiente",
          createdAt: dateStr,
          updatedAt: dateStr,
          history: [logItem],
          settlements: []
        });
      }
    }
  }

  function renderComprasView(root) {
    if (!root || !ERP.state) return;
    try {
      var state = ERP.state;
      ensureComprasState(state);

      var flt = state.purchaseReportFilters;
      var skus = typeof ERP.getSkus === "function" ? ERP.getSkus() : [];

      var skuOpts = skus.map(function (s) {
        var cKey = normalizeCrateKeySafe(s.crateType);
        var cName = getCrateNameSafe(cKey);
        var suffix = cKey !== "none" ? " · [Casillero: " + cName + "]" : "";
        return '<option value="' + escSafe(s.sku) + '">' + escSafe(s.sku) + " - " + escSafe(s.name) + escSafe(suffix) + "</option>";
      }).join("");

      var rows = state.draftPurchaseLines.map(function (ln, idx) {
        var s = (typeof ERP.getSku === "function" ? ERP.getSku(ln.sku) : null) || { sku: ln.sku, name: ln.sku };
        var cKey = normalizeCrateKeySafe(s.crateType);
        var cName = getCrateNameSafe(cKey);
        var cInfo = cKey !== "none"
          ? '<div class="muted">Genera deuda casillero: <strong>' + escSafe(cName) + "</strong></div>"
          : "";
        return (
          "<tr>" +
            "<td><strong>" + escSafe(s.sku) + "</strong> - " + escSafe(s.name) + cInfo + "</td>" +
            "<td>" + ln.qty + "</td>" +
            "<td>" + fmtUsdSafe(ln.costUsd) + "</td>" +
            "<td>" + escSafe(ln.expiry) + "</td>" +
            "<td><strong>" + fmtUsdSafe(ln.qty * ln.costUsd) + "</strong></td>" +
            '<td><button type="button" class="danger sm" data-delp="' + idx + '">Quitar</button></td>' +
          "</tr>"
        );
      }).join("");

      var supplierDebtRows = state.supplierCrateDebts.map(function (d) {
        var pending = Number(d.pendingQty || 0);
        var unitBs = getCratePriceBsSafe(state, d.crateId);
        var totalBs = Number((pending * unitBs).toFixed(2));
        var badge = pending <= 0
          ? '<span class="badge b-ok">Saldada</span>'
          : '<span class="badge b-warn">' + escSafe(d.status || "Pendiente") + "</span>";

        return (
          "<tr>" +
            "<td><strong>" + escSafe(d.supplierName || "Proveedor") + "</strong></td>" +
            "<td><strong>" + escSafe(d.crateName || d.crateId) + '</strong><div class="muted">' + escSafe(d.crateId) + "</div></td>" +
            "<td>" + Number(d.totalQty || 0) + " und.</td>" +
            "<td><strong>" + pending + " und.</strong></td>" +
            "<td><strong>" + formatBsSafe(totalBs) + '</strong><div class="muted">Precio del dia/fijo: ' + formatBsSafe(unitBs) + "</div></td>" +
            "<td>" + badge + "</td>" +
            "<td>" +
              (pending > 0
                ? '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' +
                    '<input type="number" min="1" max="' + pending + '" value="' + pending + '" data-settle-crate-qty="' + escSafe(d.id) + '" style="max-width:80px;" />' +
                    '<select data-settle-crate-mode="' + escSafe(d.id) + '" style="max-width:145px;">' +
                      '<option value="CASILLEROS">En Casilleros</option>' +
                      '<option value="BS">En Bs. (' + escSafe(formatBsSafe(unitBs)) + " c/u)</option>" +
                    "</select>" +
                    '<button type="button" class="success sm" data-btn-settle-crate="' + escSafe(d.id) + '">Pagar</button>' +
                  "</div>"
                : '<span class="muted">Saldada</span>') +
            "</td>" +
          "</tr>"
        );
      }).join("");

      var supplierFilterMap = {};
      var supplierFilterList = [];
      for (var pIdx = 0; pIdx < state.purchases.length; pIdx++) {
        var supItem = String(state.purchases[pIdx].supplier || "").trim();
        if (supItem && !supplierFilterMap[supItem.toLowerCase()]) {
          supplierFilterMap[supItem.toLowerCase()] = true;
          supplierFilterList.push(supItem);
        }
      }
      supplierFilterList.sort();

      var supplierFilterOpts = '<option value="ALL">Todos los proveedores</option>' +
        supplierFilterList.map(function (sp) {
          return '<option value="' + escSafe(sp) + '"' + (String(flt.supplier).toLowerCase() === sp.toLowerCase() ? " selected" : "") + ">" + escSafe(sp) + "</option>";
        }).join("");

      var skuFilterOpts = '<option value="ALL">Todos los SKU</option>' +
        skus.map(function (s) {
          return '<option value="' + escSafe(s.sku) + '"' + (String(flt.sku) === String(s.sku) ? " selected" : "") + ">" + escSafe(s.sku) + " - " + escSafe(s.name) + "</option>";
        }).join("");

      function purchaseHasCrate(p) {
        var pLines = Array.isArray(p.lines) ? p.lines : [];
        for (var k = 0; k < pLines.length; k++) {
          var sObj = typeof ERP.getSku === "function" ? ERP.getSku(pLines[k].sku) : null;
          if (normalizeCrateKeySafe(sObj && sObj.crateType) !== "none") return true;
        }
        return false;
      }

      var filteredPurchases = state.purchases.filter(function (p) {
        var dStr = String(p.date || "").slice(0, 10);
        if (flt.fromDate && (!dStr || dStr < flt.fromDate)) return false;
        if (flt.toDate && (!dStr || dStr > flt.toDate)) return false;
        if (flt.supplier && flt.supplier !== "ALL") {
          if (String(p.supplier || "").trim().toLowerCase() !== String(flt.supplier).trim().toLowerCase()) return false;
        }
        if (flt.sku && flt.sku !== "ALL") {
          var hasSku = (Array.isArray(p.lines) ? p.lines : []).some(function (l) {
            return String(l.sku) === String(flt.sku);
          });
          if (!hasSku) return false;
        }
        if (flt.crateStatus === "WITH_CRATES" && !purchaseHasCrate(p)) return false;
        if (flt.crateStatus === "NO_CRATES" && purchaseHasCrate(p)) return false;
        return true;
      });

      var repTotalUsd = 0;
      var repTotalUnits = 0;
      for (var fp = 0; fp < filteredPurchases.length; fp++) {
        repTotalUsd += Number(filteredPurchases[fp].totalUsd || 0);
        var fLines = Array.isArray(filteredPurchases[fp].lines) ? filteredPurchases[fp].lines : [];
        for (var fl = 0; fl < fLines.length; fl++) {
          repTotalUnits += Number(fLines[fl].qty || 0);
        }
      }

      var hist = filteredPurchases.map(function (p) {
        var detailText = (p.lines || []).map(function (l) {
          return l.qty + "x " + l.sku + " @" + fmtUsdSafe(l.costUsd);
        }).join(", ");
        return (
          "<tr>" +
            "<td><strong>" + escSafe(p.id) + '</strong><div class="muted">' + escSafe(p.date) + "</div></td>" +
            "<td><strong>" + escSafe(p.supplier) + "</strong></td>" +
            "<td>" + escSafe(detailText) + "</td>" +
            "<td><strong>" + fmtUsdSafe(p.totalUsd) + '</strong><div class="muted">' + fmtBsFromUsdSafe(p.totalUsd) + "</div></td>" +
            '<td><button type="button" class="primary sm" data-view-purchase="' + escSafe(p.id) + '">Ver Factura</button></td>' +
          "</tr>"
        );
      }).join("");

      root.innerHTML =
        '<div class="card"><div class="card-header"><h2 class="card-title">Compras Multi-SKU (Ingreso FEFO)</h2></div>' +
          '<div class="grid-2"><div><div class="field"><label>Proveedor</label><input type="text" id="pur-sup" value="Alimentos Polar / Pepsi" /></div><div class="grid-3"><div class="field"><label>SKU</label><select id="pur-sku">' + skuOpts + '</select></div><div class="field"><label>Cantidad</label><input type="number" min="1" id="pur-qty" value="15" /></div><div class="field"><label>Costo ($)</label><input type="number" step="0.01" id="pur-cost" value="4.80" /></div></div><div class="grid-2"><div class="field"><label>Caducidad</label><input type="date" id="pur-exp" value="2027-06-15" /></div><div class="field" style="justify-content:flex-end;"><button type="button" class="primary" id="btn-add-pur">+ Agregar SKU</button></div></div></div>' +
          '<div><div class="table-wrap"><table><thead><tr><th>SKU</th><th>Cant.</th><th>Costo</th><th>Vence</th><th>Total</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" class="muted">Sin lineas.</td></tr>') + '</tbody></table></div><button type="button" class="success" style="width:100%;margin-top:12px;" id="btn-save-pur">Guardar Compra y Crear Lotes FEFO</button></div></div></div>' +
        '<div class="card">' +
          '<div class="card-header">' +
            '<div><h2 class="card-title">Cuentas por Pagar de Casilleros a Proveedores (' + state.supplierCrateDebts.length + ')</h2><p class="muted">Pague en <strong>Casilleros</strong> o en <strong>Bs.</strong> al precio vigente de cada tipo de casillero.</p></div>' +
          "</div>" +
          '<div class="table-wrap"><table><thead><tr><th>Proveedor</th><th>Tipo de Casillero</th><th>Recibido</th><th>Pendiente</th><th>Monto en Bs.</th><th>Estado</th><th>Pago de Casilleros</th></tr></thead><tbody>' +
            (supplierDebtRows || '<tr><td colspan="7" class="muted">No hay cuentas por pagar de casilleros con proveedores.</td></tr>') +
          "</tbody></table></div>" +
        "</div>" +
        '<div class="card">' +
          '<div class="card-header">' +
            '<div><h3 class="card-title">Reportes e Historial de Compras (' + filteredPurchases.length + " de " + state.purchases.length + ')</h3><p class="muted">Filtre compras por fecha, proveedor, SKU o casilleros y abra el soporte de cada compra.</p></div>' +
            '<button type="button" class="sm" id="btn-pur-flt-clear">Limpiar Filtros</button>' +
          "</div>" +
          '<div class="filter-bar" style="margin-bottom:12px;">' +
            '<div class="grid-3">' +
              '<div class="field" style="margin-bottom:0;"><label>Fecha Desde</label><input type="date" id="pur-flt-from" value="' + escSafe(flt.fromDate || "") + '" /></div>' +
              '<div class="field" style="margin-bottom:0;"><label>Fecha Hasta</label><input type="date" id="pur-flt-to" value="' + escSafe(flt.toDate || "") + '" /></div>' +
              '<div class="field" style="margin-bottom:0;"><label>Proveedor</label><select id="pur-flt-sup">' + supplierFilterOpts + "</select></div>" +
            "</div>" +
            '<div class="grid-2" style="margin-top:8px;">' +
              '<div class="field" style="margin-bottom:0;"><label>SKU</label><select id="pur-flt-sku">' + skuFilterOpts + "</select></div>" +
              '<div class="field" style="margin-bottom:0;"><label>Casilleros en Compra</label><select id="pur-flt-crates">' +
                '<option value="ALL"' + (flt.crateStatus === "ALL" ? " selected" : "") + ">Todas las compras</option>" +
                '<option value="WITH_CRATES"' + (flt.crateStatus === "WITH_CRATES" ? " selected" : "") + ">Con casilleros retornables</option>" +
                '<option value="NO_CRATES"' + (flt.crateStatus === "NO_CRATES" ? " selected" : "") + ">Sin casilleros</option>" +
              "</select></div>" +
            "</div>" +
          "</div>" +
          '<div class="grid-3" style="margin-bottom:12px;">' +
            '<div class="kpi"><div class="kpi-label">Compras Filtradas</div><div class="kpi-val">' + filteredPurchases.length + '</div><div class="kpi-sub">Total unidades: ' + repTotalUnits + " und.</div></div>" +
            '<div class="kpi"><div class="kpi-label">Total Comprado ($)</div><div class="kpi-val">' + fmtUsdSafe(repTotalUsd) + '</div><div class="kpi-sub">En rango filtrado</div></div>' +
            '<div class="kpi"><div class="kpi-label">Equivalente (Bs.)</div><div class="kpi-val">' + fmtBsFromUsdSafe(repTotalUsd) + '</div><div class="kpi-sub">A tasa actual</div></div>' +
          "</div>" +
          '<div class="table-wrap"><table><thead><tr><th>Compra</th><th>Proveedor</th><th>Detalle</th><th>Total</th><th>Factura</th></tr></thead><tbody>' +
            (hist || '<tr><td colspan="5" class="muted">No hay compras que coincidan con los filtros.</td></tr>') +
          "</tbody></table></div>" +
        "</div>";

      var settleBtns = root.querySelectorAll("button[data-btn-settle-crate]");
      for (var sb = 0; sb < settleBtns.length; sb++) {
        settleBtns[sb].onclick = function () {
          var debtId = this.getAttribute("data-btn-settle-crate");
          var debt = null;
          for (var dIdx = 0; dIdx < state.supplierCrateDebts.length; dIdx++) {
            if (state.supplierCrateDebts[dIdx].id === debtId) {
              debt = state.supplierCrateDebts[dIdx];
              break;
            }
          }
          if (!debt) return;

          var qtyInp = root.querySelector('input[data-settle-crate-qty="' + debtId + '"]');
          var modeSel = root.querySelector('select[data-settle-crate-mode="' + debtId + '"]');
          var qty = parseInt(qtyInp ? qtyInp.value : "0", 10) || 0;
          var mode = modeSel ? modeSel.value : "CASILLEROS";
          var pending = Number(debt.pendingQty || 0);
          var todayStr = getTodayIsoSafe();

          if (mode !== "CASILLEROS" && mode !== "BS") {
            if (typeof ERP.setNotice === "function") ERP.setNotice("bad", "Solo se permite pagar en Casilleros o en Bs.");
            if (typeof ERP.render === "function") ERP.render();
            return;
          }
          if (qty <= 0 || qty > pending) {
            if (typeof ERP.setNotice === "function") ERP.setNotice("bad", "Cantidad invalida. Maximo pendiente: " + pending + ".");
            if (typeof ERP.render === "function") ERP.render();
            return;
          }

          var amountBs = 0;
          if (mode === "BS") {
            var unitBs = getCratePriceBsSafe(state, debt.crateId);
            if (!unitBs || unitBs <= 0) {
              if (typeof ERP.setNotice === "function") ERP.setNotice("bad", "Configure primero el precio en Bs. de '" + (debt.crateName || debt.crateId) + "' en Administracion.");
              if (typeof ERP.render === "function") ERP.render();
              return;
            }
            amountBs = Number((qty * unitBs).toFixed(2));
          } else {
            if (!state.crateStock || typeof state.crateStock !== "object") state.crateStock = {};
            var stockAvail = Number(state.crateStock[debt.crateId] || 0);
            if (stockAvail < qty) {
              if (typeof ERP.setNotice === "function") ERP.setNotice("bad", "Existencia insuficiente de '" + (debt.crateName || debt.crateId) + "' en almacen (" + stockAvail + " disp.).");
              if (typeof ERP.render === "function") ERP.render();
              return;
            }
            state.crateStock[debt.crateId] = stockAvail - qty;
          }

          debt.pendingQty = Number((pending - qty).toFixed(2));
          debt.status = debt.pendingQty <= 0 ? "Saldada" : "Parcial";
          debt.updatedAt = todayStr;
          if (!Array.isArray(debt.settlements)) debt.settlements = [];
          debt.settlements.push({
            date: todayStr,
            mode: mode,
            qty: qty,
            amountBs: amountBs,
            by: (typeof ERP.getUser === "function" && ERP.getUser() && ERP.getUser().name) || "Usuario"
          });

          if (typeof ERP.setNotice === "function") {
            ERP.setNotice(
              "ok",
              "Pagados " + qty + " casillero(s) de '" + (debt.crateName || debt.crateId) + "' en " +
              (mode === "BS" ? ("Bs. (" + formatBsSafe(amountBs) + ")") : "Casilleros") + "."
            );
          }
          if (typeof ERP.saveState === "function") ERP.saveState();
          if (typeof ERP.render === "function") ERP.render();
        };
      }

      var viewPurBtns = root.querySelectorAll("button[data-view-purchase]");
      for (var vp = 0; vp < viewPurBtns.length; vp++) {
        viewPurBtns[vp].onclick = function () {
          var purId = this.getAttribute("data-view-purchase");
          var found = null;
          for (var k = 0; k < state.purchases.length; k++) {
            if (String(state.purchases[k].id) === String(purId)) {
              found = state.purchases[k];
              break;
            }
          }
          if (found) openPurchaseInvoiceModal(found);
        };
      }

      function updatePurchaseFilters() {
        state.purchaseReportFilters = {
          fromDate: document.getElementById("pur-flt-from").value,
          toDate: document.getElementById("pur-flt-to").value,
          supplier: document.getElementById("pur-flt-sup").value,
          sku: document.getElementById("pur-flt-sku").value,
          crateStatus: document.getElementById("pur-flt-crates").value
        };
        if (typeof ERP.saveState === "function") ERP.saveState();
        if (typeof ERP.render === "function") ERP.render();
      }

      document.getElementById("pur-flt-from").onchange = updatePurchaseFilters;
      document.getElementById("pur-flt-to").onchange = updatePurchaseFilters;
      document.getElementById("pur-flt-sup").onchange = updatePurchaseFilters;
      document.getElementById("pur-flt-sku").onchange = updatePurchaseFilters;
      document.getElementById("pur-flt-crates").onchange = updatePurchaseFilters;
      document.getElementById("btn-pur-flt-clear").onclick = function () {
        state.purchaseReportFilters = {
          fromDate: "",
          toDate: "",
          supplier: "ALL",
          sku: "ALL",
          crateStatus: "ALL"
        };
        if (typeof ERP.saveState === "function") ERP.saveState();
        if (typeof ERP.render === "function") ERP.render();
      };

      var btnAddPur = document.getElementById("btn-add-pur");
      if (btnAddPur) {
        btnAddPur.onclick = function () {
          state.draftPurchaseLines.push({
            sku: document.getElementById("pur-sku").value,
            qty: Math.max(1, parseInt(document.getElementById("pur-qty").value, 10) || 1),
            costUsd: Math.max(0.01, parseFloat(document.getElementById("pur-cost").value) || 1),
            expiry: document.getElementById("pur-exp").value || "2027-06-30"
          });
          if (typeof ERP.saveState === "function") ERP.saveState();
          if (typeof ERP.render === "function") ERP.render();
        };
      }

      var delP = root.querySelectorAll("button[data-delp]");
      for (var i = 0; i < delP.length; i++) {
        delP[i].onclick = function () {
          state.draftPurchaseLines.splice(parseInt(this.getAttribute("data-delp"), 10), 1);
          if (typeof ERP.saveState === "function") ERP.saveState();
          if (typeof ERP.render === "function") ERP.render();
        };
      }

      var btnSavePur = document.getElementById("btn-save-pur");
      if (btnSavePur) {
        btnSavePur.onclick = function () {
          if (!state.draftPurchaseLines.length) {
            if (typeof ERP.setNotice === "function") ERP.setNotice("bad", "Agregue una linea.");
            if (typeof ERP.render === "function") ERP.render();
            return;
          }
          var total = 0;
          var lines = [];
          for (var j = 0; j < state.draftPurchaseLines.length; j++) {
            var ln = state.draftPurchaseLines[j];
            var lotId = "L-" + Math.floor(1000 + Math.random() * 9000);
            state.lots.push({ id: lotId, sku: ln.sku, qty: Number(ln.qty), expiry: ln.expiry, warehouse: "Almacén Principal" });
            total += Number(ln.qty) * Number(ln.costUsd);
            lines.push({ sku: ln.sku, qty: Number(ln.qty), costUsd: Number(ln.costUsd), lotId: lotId, expiry: ln.expiry });
          }
          var id = "CMP-" + (500 + state.purchases.length + 1);
          var dateStr = getTodayIsoSafe();
          var supName = (document.getElementById("pur-sup").value || "").trim() || "Proveedor";

          state.purchases.unshift({
            id: id,
            date: dateStr,
            supplier: supName,
            lines: lines,
            totalUsd: Number(total.toFixed(2))
          });

          registerSupplierCratePayable(state, id, dateStr, supName, lines);

          state.draftPurchaseLines = [];
          if (typeof ERP.setNotice === "function") ERP.setNotice("ok", "Compra " + id + " registrada.");
          if (typeof ERP.saveState === "function") ERP.saveState();
          if (typeof ERP.render === "function") ERP.render();
        };
      }
    } catch (err) {
      root.innerHTML =
        '<div class="card"><h3 class="card-title">Error en Compras</h3><p class="muted">' +
        escSafe(err && err.message ? err.message : err) +
        "</p></div>";
    }
  }

  ERP.registerMenuModule("compras", renderComprasView);
})();