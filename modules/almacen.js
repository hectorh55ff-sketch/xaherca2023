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

  function fmtUsdSafe(val) {
    if (typeof ERP.fmtUsd === "function") return ERP.fmtUsd(val);
    return "$" + Number(val || 0).toFixed(2);
  }

  function fmtBsSafe(val) {
    if (typeof ERP.fmtBs === "function") return ERP.fmtBs(val);
    var rate = Number((ERP.state && ERP.state.rateBs) || 1);
    return "Bs. " + (Number(val || 0) * rate).toFixed(2);
  }

  function formatFixedBsSafe(val) {
    var num = Number(val || 0);
    return "Bs. " + num.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getCratePriceBsSafe(state, crateId) {
    if (state && state.cratePricesBs && state.cratePricesBs[crateId] != null && state.cratePricesBs[crateId] !== "") {
      var v1 = parseFloat(state.cratePricesBs[crateId]);
      if (!isNaN(v1) && v1 >= 0) return Number(v1.toFixed(2));
    }
    var ct = getCrateTypeSafe(crateId);
    if (ct) {
      if (ct.priceBs != null && ct.priceBs !== "") {
        var v2 = parseFloat(ct.priceBs);
        if (!isNaN(v2) && v2 >= 0) return Number(v2.toFixed(2));
      }
      if (ct.fixedPriceBs != null && ct.fixedPriceBs !== "") {
        var v3 = parseFloat(ct.fixedPriceBs);
        if (!isNaN(v3) && v3 >= 0) return Number(v3.toFixed(2));
      }
    }
    return 0;
  }

  function getCrateTypeSafe(crateId) {
    if (typeof ERP.getCrateType === "function") {
      var ct = ERP.getCrateType(crateId);
      if (ct && ct.name) return ct;
    }
    var list = Array.isArray(ERP.DEFAULT_CRATE_TYPES) ? ERP.DEFAULT_CRATE_TYPES : [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(crateId)) return list[i];
    }
    return { id: crateId || "none", name: crateId || "Sin casillero" };
  }

  function getSupplierCrateDebtsSafe() {
    var state = ERP.state || {};
    return Array.isArray(state.supplierCrateDebts) ? state.supplierCrateDebts : [];
  }

  function getSupplierCratePayableById(crateId) {
    var debts = getSupplierCrateDebtsSafe();
    var targetId = String(crateId || "");
    var total = 0;
    for (var i = 0; i < debts.length; i++) {
      var d = debts[i];
      if (!d) continue;
      if (!targetId || String(d.crateId || "") === targetId) {
        total += Number(d.pendingQty || 0);
      }
    }
    return total;
  }

  function getCrateMovementsSafe() {
    var state = ERP.state || {};
    var list = [];
    var sources = [
      state.crateHistory,
      state.crateMovements,
      state.crateLogs,
      state.crateLoans
    ];
    for (var i = 0; i < sources.length; i++) {
      if (Array.isArray(sources[i])) {
        for (var j = 0; j < sources[i].length; j++) {
          list.push(sources[i][j]);
        }
      }
    }
    return list;
  }

  function findClientByIdSafe(clientId) {
    var clients = typeof ERP.getClients === "function" ? ERP.getClients() : [];
    for (var i = 0; i < clients.length; i++) {
      if (String(clients[i].id) === String(clientId)) {
        return clients[i];
      }
    }
    return null;
  }

  function getClientNameSafe(clientId) {
    var cl = findClientByIdSafe(clientId);
    if (cl) return cl.name || cl.razonSocial || cl.id;
    return clientId || "Cliente";
  }

  function getClientSellerSafe(cl, m) {
    if (m && (m.seller || m.sellerName || m.vendedor || m.vendor || m.salesperson)) {
      return String(m.seller || m.sellerName || m.vendedor || m.vendor || m.salesperson).trim();
    }
    if (cl && (cl.seller || cl.sellerName || cl.vendedor || cl.vendor || cl.salesperson || cl.assignedSeller)) {
      return String(cl.seller || cl.sellerName || cl.vendedor || cl.vendor || cl.salesperson || cl.assignedSeller).trim();
    }
    return "Sin vendedor";
  }

  function getClientZoneSafe(cl, m) {
    if (m && (m.zone || m.zona || m.route || m.ruta || m.sector)) {
      return String(m.zone || m.zona || m.route || m.ruta || m.sector).trim();
    }
    if (cl && (cl.zone || cl.zona || cl.route || cl.ruta || cl.sector || cl.area)) {
      return String(cl.zone || cl.zona || cl.route || cl.ruta || cl.sector || cl.area).trim();
    }
    return "Sin zona";
  }

  function normalizeDateOnly(rawDate) {
    if (!rawDate) return "";
    var s = String(rawDate).trim();
    var mIso = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (mIso) return mIso[1];
    var mLat = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (mLat) return mLat[3] + "-" + mLat[2] + "-" + mLat[1];
    return "";
  }

  function matchesDateRange(rawDate, fromDate, toDate) {
    if (!fromDate && !toDate) return true;
    var d = normalizeDateOnly(rawDate);
    if (!d) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  }

  function openCrateReportModal(reportType, customFilters) {
    if (typeof ERP.openModal !== "function") return;
    var state = ERP.state || {};
    var cTypes = typeof ERP.getCrateTypes === "function" ? ERP.getCrateTypes() : [];
    var clients = typeof ERP.getClients === "function" ? ERP.getClients() : [];
    var movements = getCrateMovementsSafe();
    var supplierDebts = getSupplierCrateDebtsSafe();

    if (!state.crateReportFilters || typeof state.crateReportFilters !== "object") {
      state.crateReportFilters = {
        fromDate: "",
        toDate: "",
        clientId: "ALL",
        crateType: "ALL",
        seller: "ALL",
        zone: "ALL",
        supplier: "ALL",
        payableStatus: "ALL"
      };
    }
    if (customFilters && typeof customFilters === "object") {
      state.crateReportFilters = Object.assign({}, state.crateReportFilters, customFilters);
    }
    var flt = state.crateReportFilters;

    var sellerSet = {};
    var sellersList = [];
    var zoneSet = {};
    var zonesList = [];
    var supplierSet = {};
    var suppliersList = [];

    function registerSellerZone(sVal, zVal) {
      if (sVal && !sellerSet[sVal]) {
        sellerSet[sVal] = true;
        sellersList.push(sVal);
      }
      if (zVal && !zoneSet[zVal]) {
        zoneSet[zVal] = true;
        zonesList.push(zVal);
      }
    }

    for (var ci = 0; ci < clients.length; ci++) {
      registerSellerZone(getClientSellerSafe(clients[ci], null), getClientZoneSafe(clients[ci], null));
    }
    for (var mi = 0; mi < movements.length; mi++) {
      var mvCl = findClientByIdSafe(movements[mi].clientId || movements[mi].clienteId);
      registerSellerZone(getClientSellerSafe(mvCl, movements[mi]), getClientZoneSafe(mvCl, movements[mi]));
    }
    for (var si = 0; si < supplierDebts.length; si++) {
      var supName = String((supplierDebts[si] && supplierDebts[si].supplierName) || "").trim();
      if (supName && !supplierSet[supName.toLowerCase()]) {
        supplierSet[supName.toLowerCase()] = true;
        suppliersList.push(supName);
      }
    }
    if (Array.isArray(state.purchases)) {
      for (var pi = 0; pi < state.purchases.length; pi++) {
        var pSup = String((state.purchases[pi] && state.purchases[pi].supplier) || "").trim();
        if (pSup && !supplierSet[pSup.toLowerCase()]) {
          supplierSet[pSup.toLowerCase()] = true;
          suppliersList.push(pSup);
        }
      }
    }
    if (Array.isArray(state.users)) {
      for (var ui = 0; ui < state.users.length; ui++) {
        var u = state.users[ui];
        if (u && u.name) registerSellerZone(String(u.name).trim(), null);
      }
    }
    sellersList.sort();
    zonesList.sort();
    suppliersList.sort();

    var clientOpts = '<option value="ALL">Todos los clientes</option>' +
      clients.map(function (cl) {
        return '<option value="' + escSafe(cl.id) + '"' + (String(flt.clientId) === String(cl.id) ? " selected" : "") + ">" + escSafe(cl.name || cl.id) + "</option>";
      }).join("");

    var crateOpts = '<option value="ALL">Todos los tipos</option>' +
      cTypes.map(function (ct) {
        return '<option value="' + escSafe(ct.id) + '"' + (String(flt.crateType) === String(ct.id) ? " selected" : "") + ">" + escSafe(ct.name) + "</option>";
      }).join("");

    var sellerOpts = '<option value="ALL">Todos los vendedores</option>' +
      sellersList.map(function (sl) {
        return '<option value="' + escSafe(sl) + '"' + (String(flt.seller) === String(sl) ? " selected" : "") + ">" + escSafe(sl) + "</option>";
      }).join("");

    var zoneOpts = '<option value="ALL">Todas las zonas</option>' +
      zonesList.map(function (zn) {
        return '<option value="' + escSafe(zn) + '"' + (String(flt.zone) === String(zn) ? " selected" : "") + ">" + escSafe(zn) + "</option>";
      }).join("");

    var supplierOpts = '<option value="ALL">Todos los proveedores</option>' +
      suppliersList.map(function (sp) {
        return '<option value="' + escSafe(sp) + '"' + (String(flt.supplier || "ALL").toLowerCase() === sp.toLowerCase() ? " selected" : "") + ">" + escSafe(sp) + "</option>";
      }).join("");

    var payableStatusVal = flt.payableStatus || "ALL";

    var filterBarHtml =
      '<div class="filter-bar" style="margin-bottom:12px;">' +
        '<div class="grid-4">' +
          '<div class="field" style="margin-bottom:0;"><label>Fecha Desde</label><input type="date" id="cr-flt-from" value="' + escSafe(flt.fromDate || "") + '" /></div>' +
          '<div class="field" style="margin-bottom:0;"><label>Fecha Hasta</label><input type="date" id="cr-flt-to" value="' + escSafe(flt.toDate || "") + '" /></div>' +
          '<div class="field" style="margin-bottom:0;"><label>Proveedor</label><select id="cr-flt-supplier">' + supplierOpts + "</select></div>" +
          '<div class="field" style="margin-bottom:0;"><label>Tipo de Casillero</label><select id="cr-flt-crate">' + crateOpts + "</select></div>" +
        "</div>" +
        '<div class="grid-4" style="margin-top:8px;">' +
          '<div class="field" style="margin-bottom:0;"><label>Cliente</label><select id="cr-flt-client">' + clientOpts + "</select></div>" +
          '<div class="field" style="margin-bottom:0;"><label>Vendedor</label><select id="cr-flt-seller">' + sellerOpts + "</select></div>" +
          '<div class="field" style="margin-bottom:0;"><label>Zona</label><select id="cr-flt-zone">' + zoneOpts + "</select></div>" +
          '<div class="field" style="margin-bottom:0;"><label>Estado CxP Casillero</label><select id="cr-flt-paystatus">' +
            '<option value="ALL"' + (payableStatusVal === "ALL" ? " selected" : "") + ">Todos los estados</option>" +
            '<option value="OPEN"' + (payableStatusVal === "OPEN" ? " selected" : "") + ">Pendiente / Parcial (&gt; 0)</option>" +
            '<option value="Pendiente"' + (payableStatusVal === "Pendiente" ? " selected" : "") + ">Pendiente</option>" +
            '<option value="Parcial"' + (payableStatusVal === "Parcial" ? " selected" : "") + ">Parcial</option>" +
            '<option value="Saldada"' + (payableStatusVal === "Saldada" ? " selected" : "") + ">Saldada</option>" +
          "</select></div>" +
        "</div>" +
        '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">' +
          '<button type="button" class="sm" id="btn-cr-flt-clear">Limpiar Filtros</button>' +
        "</div>" +
      "</div>";

    function filterPayable(d) {
      if (!d) return false;
      var rawDate = d.updatedAt || d.createdAt || "";
      if (!matchesDateRange(rawDate, flt.fromDate, flt.toDate)) return false;
      if (flt.supplier && flt.supplier !== "ALL") {
        if (String(d.supplierName || "").trim().toLowerCase() !== String(flt.supplier).trim().toLowerCase()) return false;
      }
      var dCrateId = typeof ERP.normalizeCrateKey === "function"
        ? ERP.normalizeCrateKey(d.crateId || "")
        : String(d.crateId || "");
      if (flt.crateType !== "ALL" && String(dCrateId) !== String(flt.crateType)) return false;
      var pend = Number(d.pendingQty || 0);
      var stStr = String(d.status || (pend <= 0 ? "Saldada" : "Pendiente"));
      if (payableStatusVal === "OPEN" && pend <= 0) return false;
      if (payableStatusVal !== "ALL" && payableStatusVal !== "OPEN" && stStr !== payableStatusVal) return false;
      return true;
    }

    function filterMovement(m) {
      var rawDate = m.date || m.fecha || m.createdAt || "";
      if (!matchesDateRange(rawDate, flt.fromDate, flt.toDate)) return false;
      var mClientId = m.clientId || m.clienteId || "";
      if (flt.clientId !== "ALL" && String(mClientId) !== String(flt.clientId)) return false;
      var mCrateId = typeof ERP.normalizeCrateKey === "function"
        ? ERP.normalizeCrateKey(m.crateType || m.crateId || m.crate || "")
        : String(m.crateType || m.crateId || m.crate || "");
      if (flt.crateType !== "ALL" && String(mCrateId) !== String(flt.crateType)) return false;
      if (flt.supplier && flt.supplier !== "ALL") {
        var mSup = String(m.supplier || m.supplierName || m.proveedor || "").trim().toLowerCase();
        if (mSup && mSup !== String(flt.supplier).trim().toLowerCase()) return false;
      }
      var clObj = findClientByIdSafe(mClientId);
      var mSeller = getClientSellerSafe(clObj, m);
      if (flt.seller !== "ALL" && mSeller !== flt.seller) return false;
      var mZone = getClientZoneSafe(clObj, m);
      if (flt.zone !== "ALL" && mZone !== flt.zone) return false;
      return true;
    }

    function filterClient(cl) {
      if (flt.clientId !== "ALL" && String(cl.id) !== String(flt.clientId)) return false;
      if (flt.seller !== "ALL" && getClientSellerSafe(cl, null) !== flt.seller) return false;
      if (flt.zone !== "ALL" && getClientZoneSafe(cl, null) !== flt.zone) return false;
      if (flt.fromDate || flt.toDate) {
        var hasMovInDate = movements.some(function (m) {
          return String(m.clientId || m.clienteId || "") === String(cl.id) &&
            matchesDateRange(m.date || m.fecha || m.createdAt || "", flt.fromDate, flt.toDate);
        });
        var clLastDate = cl.lastCrateDate || cl.updatedAt || cl.lastOrderDate || "";
        if (!hasMovInDate && !matchesDateRange(clLastDate, flt.fromDate, flt.toDate)) return false;
      }
      return true;
    }

    var title = "Reporte de Casilleros";
    var subtitle = "";
    var bodyHtml = "";

    if (reportType === "payables") {
      title = "Reporte de Cuentas por Pagar de Casilleros a Proveedores";
      subtitle = "Detalle de casilleros adeudados a proveedores, monto en Bs. al precio del dia/fijo y estado.";

      var filteredPayables = supplierDebts.filter(filterPayable);
      var totRec = 0;
      var totPend = 0;
      var totBs = 0;

      var payRows = filteredPayables.map(function (d, idx) {
        var recQty = Number(d.totalQty || 0);
        var pendQty = Number(d.pendingQty || 0);
        var unitBs = getCratePriceBsSafe(state, d.crateId);
        var debtBs = Number((pendQty * unitBs).toFixed(2));
        totRec += recQty;
        totPend += pendQty;
        totBs = Number((totBs + debtBs).toFixed(2));
        var stLabel = d.status || (pendQty <= 0 ? "Saldada" : "Pendiente");
        var badgeCls = pendQty <= 0 ? "b-ok" : "b-warn";

        return (
          "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td><strong>" + escSafe(d.supplierName || "Proveedor") + "</strong></td>" +
            "<td><strong>" + escSafe(d.crateName || getCrateTypeSafe(d.crateId).name) + '</strong><div class="muted">' + escSafe(d.crateId) + "</div></td>" +
            "<td>" + recQty + " und.</td>" +
            "<td><strong>" + pendQty + " und.</strong></td>" +
            "<td><strong>" + formatFixedBsSafe(debtBs) + '</strong><div class="muted">Unitario: ' + formatFixedBsSafe(unitBs) + "</div></td>" +
            '<td><span class="badge ' + badgeCls + '">' + escSafe(stLabel) + "</span></td>" +
            "<td>" + escSafe(d.updatedAt || d.createdAt || "-") + "</td>" +
          "</tr>"
        );
      }).join("");

      bodyHtml =
        '<div class="grid-4" style="margin-bottom:12px;">' +
          '<div class="kpi"><div class="kpi-label">Registros CxP Filtrados</div><div class="kpi-val">' + filteredPayables.length + '</div><div class="kpi-sub">De ' + supplierDebts.length + " registrados</div></div>" +
          '<div class="kpi"><div class="kpi-label">Total Recibido</div><div class="kpi-val">' + totRec + ' und.</div><div class="kpi-sub">Casilleros ingresados</div></div>' +
          '<div class="kpi"><div class="kpi-label">Pendiente por Pagar</div><div class="kpi-val">-' + totPend + ' und.</div><div class="kpi-sub">Descontado del total neto</div></div>' +
          '<div class="kpi"><div class="kpi-label">Monto Pendiente (Bs.)</div><div class="kpi-val">' + formatFixedBsSafe(totBs) + '</div><div class="kpi-sub">Segun precio configurado</div></div>' +
        "</div>" +
        '<div class="table-wrap"><table><thead><tr><th>#</th><th>Proveedor</th><th>Tipo de Casillero</th><th>Recibido</th><th>Pendiente</th><th>Monto (Bs.)</th><th>Estado</th><th>Actualizado</th></tr></thead><tbody>' +
          (payRows || '<tr><td colspan="8" class="muted">No hay cuentas por pagar de casilleros que coincidan con los filtros.</td></tr>') +
        "</tbody></table></div>";
    } else if (reportType === "loans") {
      title = "Reporte de Prestamos / Casilleros en Poder de Clientes";
      subtitle = "Detalle actual de casilleros asignados o adeudados por cliente, vendedor, zona y tipo de envase.";

      var filteredClients = clients.filter(filterClient);
      var visibleCrateTypes = flt.crateType === "ALL"
        ? cTypes
        : cTypes.filter(function (ct) { return String(ct.id) === String(flt.crateType); });

      var totalAllClients = 0;
      var clientRows = filteredClients.map(function (cl) {
        if (typeof ERP.ensureClientDebt === "function") ERP.ensureClientDebt(cl.id);
        var debtObj = (state.clientCrateDebt && state.clientCrateDebt[cl.id]) || {};
        var clientTotal = 0;
        var breakdownParts = [];

        for (var i = 0; i < visibleCrateTypes.length; i++) {
          var ct = visibleCrateTypes[i];
          var qty = Number(debtObj[ct.id] || 0);
          if (qty !== 0) {
            clientTotal += qty;
            breakdownParts.push(escSafe(ct.name) + ": <strong>" + qty + "</strong>");
          }
        }
        totalAllClients += clientTotal;

        return (
          "<tr>" +
            "<td><strong>" + escSafe(cl.name || cl.id) + "</strong></td>" +
            "<td>" + escSafe(getClientSellerSafe(cl, null)) + "</td>" +
            "<td>" + escSafe(getClientZoneSafe(cl, null)) + "</td>" +
            "<td>" + (breakdownParts.length ? breakdownParts.join(" · ") : '<span class="muted">Sin casilleros prestados</span>') + "</td>" +
            "<td><strong>" + clientTotal + " und.</strong></td>" +
          "</tr>"
        );
      }).join("");

      bodyHtml =
        '<div class="grid-2" style="margin-bottom:12px;">' +
          '<div class="kpi"><div class="kpi-label">Total Casilleros en Clientes (Filtrado)</div><div class="kpi-val">' + totalAllClients + ' und.</div><div class="kpi-sub">Suma de prestamos segun filtros</div></div>' +
          '<div class="kpi"><div class="kpi-label">Clientes Mostrados</div><div class="kpi-val">' + filteredClients.length + '</div><div class="kpi-sub">De ' + clients.length + " registrados</div></div>" +
        "</div>" +
        '<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Vendedor</th><th>Zona</th><th>Detalle por Tipo de Casillero</th><th>Total en Cliente</th></tr></thead><tbody>' +
          (clientRows || '<tr><td colspan="5" class="muted">Ningun cliente coincide con los filtros seleccionados.</td></tr>') +
        "</tbody></table></div>";
    } else if (reportType === "returned") {
      title = "Reporte de Casilleros Entregados por Clientes";
      subtitle = "Registro de devoluciones y entregas de envases retornables realizadas por clientes.";

      var returnedItems = movements.filter(function (m) {
        if (!filterMovement(m)) return false;
        var t = String((m && (m.type || m.action || m.kind || m.event || ""))).toLowerCase();
        var qty = Number((m && (m.returnedQty || m.qtyReturned || m.returned || 0)) || 0);
        return qty > 0 || t.indexOf("devol") !== -1 || t.indexOf("entreg") !== -1 || t.indexOf("return") !== -1 || t.indexOf("recib") !== -1;
      });

      var totalReturnedQty = 0;
      var retRows = returnedItems.map(function (m, idx) {
        var qtyVal = Math.abs(Number((m.returnedQty || m.qtyReturned || m.qty || m.amount || 0) || 0));
        totalReturnedQty += qtyVal;
        var crateId = m.crateType || m.crateId || m.crate || "";
        var crateObj = getCrateTypeSafe(crateId);
        var crateLabel = crateObj.name || "Casillero";
        var clId = m.clientId || m.clienteId || "";
        var clObj = findClientByIdSafe(clId);
        var clientLabel = m.clientName || getClientNameSafe(clId);
        var sellerLabel = getClientSellerSafe(clObj, m);
        var zoneLabel = getClientZoneSafe(clObj, m);
        var dateLabel = m.date || m.fecha || m.createdAt || "-";
        var refLabel = m.invoiceId || m.ref || m.note || m.observacion || "-";

        return (
          "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td>" + escSafe(dateLabel) + "</td>" +
            "<td><strong>" + escSafe(clientLabel) + "</strong></td>" +
            "<td>" + escSafe(sellerLabel) + "</td>" +
            "<td>" + escSafe(zoneLabel) + "</td>" +
            "<td>" + escSafe(crateLabel) + "</td>" +
            "<td><strong>" + qtyVal + " und.</strong></td>" +
            '<td><span class="muted">' + escSafe(refLabel) + "</span></td>" +
          "</tr>"
        );
      }).join("");

      bodyHtml =
        '<div class="kpi" style="margin-bottom:12px;"><div class="kpi-label">Total Devuelto / Entregado por Clientes</div><div class="kpi-val">' + totalReturnedQty + ' und.</div><div class="kpi-sub">' + returnedItems.length + " movimiento(s) filtrado(s)</div></div>" +
        '<div class="table-wrap"><table><thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Zona</th><th>Tipo de Casillero</th><th>Cantidad</th><th>Referencia / Nota</th></tr></thead><tbody>' +
          (retRows || '<tr><td colspan="8" class="muted">No hay registros de entregas/devoluciones para los filtros seleccionados.</td></tr>') +
        "</tbody></table></div>";
    } else if (reportType === "history") {
      title = "Historial General de Movimientos de Casilleros";
      subtitle = "Bitacora cronologica de prestamos, entregas de clientes, ajustes y existencias.";

      var filteredHistory = movements.filter(filterMovement);
      var histRows = filteredHistory.map(function (m, idx) {
        var dateLabel = m.date || m.fecha || m.createdAt || "-";
        var typeLabel = m.type || m.action || m.kind || m.event || "Movimiento";
        var clId = m.clientId || m.clienteId || "";
        var clObj = findClientByIdSafe(clId);
        var clientLabel = m.clientName || (clId ? getClientNameSafe(clId) : "Almacen / General");
        var sellerLabel = getClientSellerSafe(clObj, m);
        var zoneLabel = getClientZoneSafe(clObj, m);
        var crateId = m.crateType || m.crateId || m.crate || "";
        var crateObj = getCrateTypeSafe(crateId);
        var crateLabel = crateObj.name || "Casillero";
        var qtyVal = Number((m.qty !== undefined ? m.qty : (m.amount !== undefined ? m.amount : 0)) || 0);
        var refLabel = m.invoiceId || m.ref || m.note || m.observacion || "-";

        return (
          "<tr>" +
            "<td>" + (idx + 1) + "</td>" +
            "<td>" + escSafe(dateLabel) + "</td>" +
            '<td><span class="badge b-info">' + escSafe(String(typeLabel)) + "</span></td>" +
            "<td>" + escSafe(clientLabel) + "</td>" +
            "<td>" + escSafe(sellerLabel) + "</td>" +
            "<td>" + escSafe(zoneLabel) + "</td>" +
            "<td><strong>" + escSafe(crateLabel) + "</strong></td>" +
            "<td><strong>" + qtyVal + " und.</strong></td>" +
            '<td><span class="muted">' + escSafe(refLabel) + "</span></td>" +
          "</tr>"
        );
      }).join("");

      bodyHtml =
        '<div class="kpi" style="margin-bottom:12px;"><div class="kpi-label">Movimientos en Historial (Filtrado)</div><div class="kpi-val">' + filteredHistory.length + '</div><div class="kpi-sub">De ' + movements.length + " registros totales</div></div>" +
        '<div class="table-wrap"><table><thead><tr><th>#</th><th>Fecha</th><th>Tipo</th><th>Cliente / Origen</th><th>Vendedor</th><th>Zona</th><th>Casillero</th><th>Cantidad</th><th>Referencia</th></tr></thead><tbody>' +
          (histRows || '<tr><td colspan="9" class="muted">No hay movimientos historicos que coincidan con los filtros.</td></tr>') +
        "</tbody></table></div>";
    } else {
      title = "Resumen Integral de Casilleros (Almacen, Clientes y Proveedores)";
      subtitle = "Consolidado por tipo de casillero descontando cuentas por pagar a proveedores.";

      var filteredSumClients = clients.filter(filterClient);
      var filteredSumPayables = supplierDebts.filter(filterPayable);
      var visibleSumTypes = flt.crateType === "ALL"
        ? cTypes
        : cTypes.filter(function (ct) { return String(ct.id) === String(flt.crateType); });

      var sumStock = 0;
      var sumClients = 0;
      var sumPayable = 0;
      var sumNet = 0;

      var sumRows = visibleSumTypes.map(function (ct) {
        var st = Number((state.crateStock && state.crateStock[ct.id]) || 0);
        var clSum = filteredSumClients.reduce(function (acc, cl) {
          if (typeof ERP.ensureClientDebt === "function") ERP.ensureClientDebt(cl.id);
          return acc + Number((state.clientCrateDebt && state.clientCrateDebt[cl.id] && state.clientCrateDebt[cl.id][ct.id]) || 0);
        }, 0);
        var paySum = filteredSumPayables.reduce(function (acc, d) {
          return String(d.crateId || "") === String(ct.id) ? acc + Number(d.pendingQty || 0) : acc;
        }, 0);
        var netTot = (st + clSum) - paySum;
        sumStock += st;
        sumClients += clSum;
        sumPayable += paySum;
        sumNet += netTot;

        return (
          "<tr>" +
            "<td><strong>" + escSafe(ct.name) + "</strong></td>" +
            '<td><span class="muted">' + escSafe(ct.id) + "</span></td>" +
            "<td><strong>" + st + " und.</strong></td>" +
            "<td><strong>" + clSum + " und.</strong></td>" +
            "<td><strong>-" + paySum + " und.</strong></td>" +
            "<td><strong>" + netTot + " und.</strong></td>" +
          "</tr>"
        );
      }).join("");

      bodyHtml =
        '<div class="grid-4" style="margin-bottom:12px;">' +
          '<div class="kpi"><div class="kpi-label">En Almacen</div><div class="kpi-val">' + sumStock + ' und.</div><div class="kpi-sub">Disponibles en deposito</div></div>' +
          '<div class="kpi"><div class="kpi-label">En Clientes (Filtrado)</div><div class="kpi-val">' + sumClients + ' und.</div><div class="kpi-sub">En ' + filteredSumClients.length + " cliente(s)</div></div>" +
          '<div class="kpi"><div class="kpi-label">Por Pagar Proveedor</div><div class="kpi-val">-' + sumPayable + ' und.</div><div class="kpi-sub">Descontado del total</div></div>' +
          '<div class="kpi"><div class="kpi-label">Total Neto Casilleros</div><div class="kpi-val">' + sumNet + ' und.</div><div class="kpi-sub">(Almacen + Clientes) - Proveedor</div></div>' +
        "</div>" +
        '<div class="table-wrap"><table><thead><tr><th>Tipo de Casillero</th><th>Codigo</th><th>En Almacen</th><th>En Clientes</th><th>Por Pagar Proveedor</th><th>Total Neto</th></tr></thead><tbody>' +
          (sumRows || '<tr><td colspan="6" class="muted">Sin tipos de casilleros para los filtros seleccionados.</td></tr>') +
        "</tbody></table></div>";
    }

    ERP.openModal(
      '<div class="card-header"><div><h3 class="card-title">' + escSafe(title) + '</h3><p class="muted">' + escSafe(subtitle) + '</p></div><button type="button" class="sm" onclick="closeModal()">Cerrar</button></div>' +
      filterBarHtml +
      bodyHtml +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:14px;">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button type="button" class="' + (reportType === "history" ? "primary " : "") + 'sm" id="btn-rep-tab-history">Historial Casilleros</button>' +
          '<button type="button" class="' + (reportType === "returned" ? "primary " : "") + 'sm" id="btn-rep-tab-returned">Entregados por Clientes</button>' +
          '<button type="button" class="' + (reportType === "loans" ? "primary " : "") + 'sm" id="btn-rep-tab-loans">Prestamos Clientes</button>' +
          '<button type="button" class="' + (reportType === "payables" ? "primary " : "") + 'sm" id="btn-rep-tab-payables">Cuentas por Pagar</button>' +
          '<button type="button" class="' + (reportType === "summary" ? "primary " : "") + 'sm" id="btn-rep-tab-summary">Resumen Casilleros</button>' +
        "</div>" +
        '<button type="button" class="primary sm" onclick="closeModal()">Listo</button>' +
      "</div>"
    );

    function applyFilterChange() {
      openCrateReportModal(reportType, {
        fromDate: document.getElementById("cr-flt-from").value,
        toDate: document.getElementById("cr-flt-to").value,
        supplier: document.getElementById("cr-flt-supplier").value,
        clientId: document.getElementById("cr-flt-client").value,
        crateType: document.getElementById("cr-flt-crate").value,
        seller: document.getElementById("cr-flt-seller").value,
        zone: document.getElementById("cr-flt-zone").value,
        payableStatus: document.getElementById("cr-flt-paystatus").value
      });
    }

    document.getElementById("cr-flt-from").onchange = applyFilterChange;
    document.getElementById("cr-flt-to").onchange = applyFilterChange;
    document.getElementById("cr-flt-supplier").onchange = applyFilterChange;
    document.getElementById("cr-flt-client").onchange = applyFilterChange;
    document.getElementById("cr-flt-crate").onchange = applyFilterChange;
    document.getElementById("cr-flt-seller").onchange = applyFilterChange;
    document.getElementById("cr-flt-zone").onchange = applyFilterChange;
    document.getElementById("cr-flt-paystatus").onchange = applyFilterChange;
    document.getElementById("btn-cr-flt-clear").onclick = function () {
      openCrateReportModal(reportType, {
        fromDate: "",
        toDate: "",
        clientId: "ALL",
        crateType: "ALL",
        seller: "ALL",
        zone: "ALL",
        supplier: "ALL",
        payableStatus: "ALL"
      });
    };

    var bSum = document.getElementById("btn-rep-tab-summary");
    var bLoans = document.getElementById("btn-rep-tab-loans");
    var bRet = document.getElementById("btn-rep-tab-returned");
    var bHist = document.getElementById("btn-rep-tab-history");
    var bPay = document.getElementById("btn-rep-tab-payables");
    if (bSum) bSum.onclick = function () { openCrateReportModal("summary"); };
    if (bLoans) bLoans.onclick = function () { openCrateReportModal("loans"); };
    if (bRet) bRet.onclick = function () { openCrateReportModal("returned"); };
    if (bHist) bHist.onclick = function () { openCrateReportModal("history"); };
    if (bPay) bPay.onclick = function () { openCrateReportModal("payables"); };
  }

  function openCrateTypeModal(existingCrateType) {
    if (typeof ERP.openModal !== "function") return;
    var state = ERP.state;
    var isEdit = !!existingCrateType;
    var ct = existingCrateType || { id: "", name: "" };
    var initialStock = isEdit ? Number((state.crateStock && state.crateStock[ct.id]) || 0) : 50;

    ERP.openModal(
      '<div class="card-header"><div><h3 class="card-title">' + (isEdit ? "Modificar Tipo de Casillero - " + escSafe(ct.name) : "Crear Nuevo Tipo de Casillero") + '</h3><p class="muted">Defina el nombre del envase retornable y su existencia inicial en almacen.</p></div><button type="button" class="sm" onclick="closeModal()">Cerrar</button></div>' +
      '<div class="grid-2"><div class="field"><label>Identificador / Codigo</label><input type="text" id="crt-id" value="' + escSafe(ct.id) + '" ' + (isEdit ? "readonly" : 'placeholder="Ej. cesta_malta_24"') + ' /></div><div class="field"><label>Nombre del Tipo de Casillero *</label><input type="text" id="crt-name" value="' + escSafe(ct.name) + '" placeholder="Ej. Cesta Malta 24x" /></div></div>' +
      '<div class="field"><label>Existencia en Almacen (Casilleros)</label><input type="number" min="0" step="1" id="crt-stock" value="' + escSafe(initialStock) + '" /></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;"><button type="button" class="sm" onclick="closeModal()">Cancelar</button><button type="button" class="success sm" id="btn-save-crate-type">' + (isEdit ? "Guardar Cambios" : "Crear Tipo de Casillero") + "</button></div>"
    );

    document.getElementById("btn-save-crate-type").onclick = function () {
      var rawId = (document.getElementById("crt-id").value || "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
      var nameVal = (document.getElementById("crt-name").value || "").trim();
      var stockVal = Math.max(0, parseInt(document.getElementById("crt-stock").value, 10) || 0);
      if (!nameVal) { if (typeof ERP.setNotice === "function") ERP.setNotice("bad", "Debe indicar el nombre del tipo de casillero."); if (typeof ERP.closeModal === "function") ERP.closeModal(); if (typeof ERP.render === "function") ERP.render(); return; }
      var defaults = Array.isArray(ERP.DEFAULT_CRATE_TYPES) ? ERP.DEFAULT_CRATE_TYPES : [];
      if (!Array.isArray(state.crateTypes)) state.crateTypes = defaults.map(function (item) { return { id: item.id, name: item.name }; });
      if (!state.crateStock || typeof state.crateStock !== "object") state.crateStock = {};
      if (!state.clientCrateDebt || typeof state.clientCrateDebt !== "object") state.clientCrateDebt = {};

      if (isEdit) {
        ct.name = nameVal; state.crateStock[ct.id] = stockVal;
        if (typeof ERP.closeModal === "function") ERP.closeModal(); if (typeof ERP.setNotice === "function") ERP.setNotice("ok", "Tipo de casillero '" + ct.name + "' actualizado (Stock: " + stockVal + ")."); if (typeof ERP.saveState === "function") ERP.saveState(); if (typeof ERP.render === "function") ERP.render(); return;
      }
      var finalId = rawId || ("casillero_" + (state.crateTypes.length + 1) + "_" + Math.floor(10 + Math.random() * 90));
      for (var i = 0; i < state.crateTypes.length; i++) {
        if (state.crateTypes[i].id === finalId) { finalId = finalId + "_" + Math.floor(10 + Math.random() * 90); break; }
      }
      state.crateTypes.push({ id: finalId, name: nameVal });
      state.crateStock[finalId] = stockVal;
      var clList = typeof ERP.getClients === "function" ? ERP.getClients() : [];
      for (var j = 0; j < clList.length; j++) {
        if (typeof ERP.ensureClientDebt === "function") ERP.ensureClientDebt(clList[j].id);
        if (!state.clientCrateDebt[clList[j].id]) state.clientCrateDebt[clList[j].id] = {};
        if (typeof state.clientCrateDebt[clList[j].id][finalId] !== "number") state.clientCrateDebt[clList[j].id][finalId] = 0;
      }
      if (typeof ERP.closeModal === "function") ERP.closeModal(); if (typeof ERP.setNotice === "function") ERP.setNotice("ok", "Nuevo tipo de casillero '" + nameVal + "' creado con existencia inicial de " + stockVal + "."); if (typeof ERP.saveState === "function") ERP.saveState(); if (typeof ERP.render === "function") ERP.render();
    };
  }

  function openSkuFormModal(existingSku, existingLotId) {
    if (typeof ERP.openModal !== "function") return;
    var state = ERP.state;
    var isEdit = !!existingSku;
    var cTypes = typeof ERP.getCrateTypes === "function" ? ERP.getCrateTypes() : [];
    var s = existingSku || { sku: "", name: "", brand: "", priceUsd: 6.50, pricesByType: { Normal: 6.50, Mayorista: 5.90, Distribuidor: 5.40 }, costUsd: 4.20, weightKg: 10.0, crateType: cTypes[0] ? cTypes[0].id : "none" };
    var pBy = Object.assign({ Normal: Number(s.priceUsd || 0), Mayorista: Number(s.priceUsd || 0), Distribuidor: Number(s.priceUsd || 0) }, s.pricesByType || {});

    var targetLot = null;
    var lotsArr = Array.isArray(state.lots) ? state.lots : [];
    if (existingLotId) {
      for (var i = 0; i < lotsArr.length; i++) { if (lotsArr[i].id === existingLotId) { targetLot = lotsArr[i]; break; } }
    } else if (isEdit) {
      for (var j = 0; j < lotsArr.length; j++) { if (lotsArr[j].sku === s.sku) { targetLot = lotsArr[j]; break; } }
    }

    var currentCrateId = typeof ERP.normalizeCrateKey === "function" ? ERP.normalizeCrateKey(s.crateType) : String(s.crateType || "none");
    var crateOpts = '<option value="none"' + (currentCrateId === "none" ? " selected" : "") + ">Sin casillero</option>" +
      cTypes.map(function (ct) { return '<option value="' + escSafe(ct.id) + '"' + (currentCrateId === ct.id ? " selected" : "") + ">" + escSafe(ct.name) + "</option>"; }).join("");

    ERP.openModal(
      '<div class="card-header"><div><h3 class="card-title">' + (isEdit ? "Modificar SKU y Datos - " + escSafe(s.sku) : "Agregar Nuevo SKU al Inventario") + '</h3><p class="muted">Configure nombre, proveedor/marca, precios de venta (Normal, Mayorista, Distribuidor), costo, peso y vencimiento.</p></div><button type="button" class="sm" onclick="closeModal()">Cerrar</button></div>' +
      '<div class="grid-3"><div class="field"><label>Codigo SKU *</label><input type="text" id="sf-code" value="' + escSafe(s.sku) + '" ' + (isEdit ? "readonly" : 'placeholder="Ej. MAL-2L"') + ' /></div><div class="field"><label>Nombre del Producto *</label><input type="text" id="sf-name" value="' + escSafe(s.name) + '" placeholder="Ej. Malta Polar 2L (6-Pack)" /></div><div class="field"><label>Proveedor / Marca *</label><input type="text" id="sf-brand" value="' + escSafe(s.brand || "") + '" placeholder="Ej. Alimentos Polar / Pepsi" /></div></div>' +
      '<div class="grid-4"><div class="field"><label>Precio Venta Normal ($)</label><input type="number" step="0.01" min="0" id="sf-p-norm" value="' + escSafe(pBy.Normal) + '" /></div><div class="field"><label>Precio Venta Mayorista ($)</label><input type="number" step="0.01" min="0" id="sf-p-may" value="' + escSafe(pBy.Mayorista) + '" /></div><div class="field"><label>Precio Venta Distribuidor ($)</label><input type="number" step="0.01" min="0" id="sf-p-dist" value="' + escSafe(pBy.Distribuidor) + '" /></div><div class="field"><label>Precio Compra / Costo ($)</label><input type="number" step="0.01" min="0" id="sf-cost" value="' + escSafe(s.costUsd || 0) + '" /></div></div>' +
      '<div class="grid-4"><div class="field"><label>Peso Unitario (kg)</label><input type="number" step="0.01" min="0" id="sf-weight" value="' + escSafe(s.weightKg || 0) + '" /></div><div class="field"><label>Envase Retornable</label><select id="sf-crate">' + crateOpts + "</select></div>" + '<div class="field"><label>Existencia Lote (' + (targetLot ? escSafe(targetLot.id) : "Nuevo Lote") + ')</label><input type="number" step="1" min="0" id="sf-qty" value="' + escSafe(targetLot ? targetLot.qty : (isEdit ? 0 : 25)) + '" /></div><div class="field"><label>Fecha de Vencimiento</label><input type="date" id="sf-expiry" value="' + escSafe(targetLot ? targetLot.expiry : "2027-06-30") + '" /></div></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;"><button type="button" class="sm" onclick="closeModal()">Cancelar</button><button type="button" class="success sm" id="btn-save-sku-form">' + (isEdit ? "Guardar Cambios del SKU" : "Guardar Nuevo SKU") + "</button></div>"
    );

    document.getElementById("btn-save-sku-form").onclick = function () {
      var codeVal = (document.getElementById("sf-code").value || "").trim().toUpperCase();
      var nameVal = (document.getElementById("sf-name").value || "").trim();
      var brandVal = (document.getElementById("sf-brand").value || "").trim();
      var pNorm = Math.max(0, parseFloat(document.getElementById("sf-p-norm").value) || 0);
      var pMay = Math.max(0, parseFloat(document.getElementById("sf-p-may").value) || 0);
      var pDist = Math.max(0, parseFloat(document.getElementById("sf-p-dist").value) || 0);
      var costVal = Math.max(0, parseFloat(document.getElementById("sf-cost").value) || 0);
      var weightVal = Math.max(0, parseFloat(document.getElementById("sf-weight").value) || 0);
      var crateVal = typeof ERP.normalizeCrateKey === "function" ? ERP.normalizeCrateKey(document.getElementById("sf-crate").value) : String(document.getElementById("sf-crate").value || "none");
      var qtyVal = Math.max(0, parseInt(document.getElementById("sf-qty").value, 10) || 0);
      var expVal = document.getElementById("sf-expiry").value || "2027-06-30";

      if (!codeVal || !nameVal) { if (typeof ERP.setNotice === "function") ERP.setNotice("bad", "Debe indicar el codigo SKU y el nombre del producto."); if (typeof ERP.closeModal === "function") ERP.closeModal(); if (typeof ERP.render === "function") ERP.render(); return; }
      if (!Array.isArray(state.skus)) state.skus = [];
      if (!Array.isArray(state.lots)) state.lots = [];
      var existingIdx = -1;
      for (var k = 0; k < state.skus.length; k++) { if (state.skus[k].sku === codeVal) { existingIdx = k; break; } }
      if (!isEdit && existingIdx !== -1) { if (typeof ERP.setNotice === "function") ERP.setNotice("bad", "El codigo SKU '" + codeVal + "' ya existe. Use Modificar para editarlo."); if (typeof ERP.closeModal === "function") ERP.closeModal(); if (typeof ERP.render === "function") ERP.render(); return; }

      var skuRecord = {
        sku: codeVal, name: nameVal, brand: brandVal || "General", priceUsd: Number(pNorm.toFixed(2)),
        pricesByType: { Normal: Number(pNorm.toFixed(2)), Mayorista: Number(pMay.toFixed(2)), Distribuidor: Number(pDist.toFixed(2)) },
        costUsd: Number(costVal.toFixed(2)), weightKg: Number(weightVal.toFixed(2)), crateType: crateVal
      };
      if (existingIdx !== -1) state.skus[existingIdx] = skuRecord;
      else state.skus.push(skuRecord);

      if (targetLot) { targetLot.qty = qtyVal; targetLot.expiry = expVal; }
      else if (qtyVal > 0) {
        state.lots.push({ id: "L-" + Math.floor(1000 + Math.random() * 9000), sku: codeVal, qty: qtyVal, expiry: expVal, warehouse: "Almacen Principal" });
      }

      if (typeof ERP.closeModal === "function") ERP.closeModal();
      if (typeof ERP.setNotice === "function") ERP.setNotice("ok", (isEdit ? "SKU '" + codeVal + "' actualizado" : "Nuevo SKU '" + codeVal + "' agregado al inventario") + " (" + nameVal + " · Envase: " + getCrateTypeSafe(crateVal).name + " · Vence: " + expVal + ").");
      if (typeof ERP.saveState === "function") ERP.saveState();
      if (typeof ERP.render === "function") ERP.render();
    };
  }

  function renderAlmacenView(root) {
    if (!root || !ERP.state) return;
    try {
      var state = ERP.state;
      var cTypes = typeof ERP.getCrateTypes === "function" ? ERP.getCrateTypes() : [];
      var allSkus = typeof ERP.getSkus === "function" ? ERP.getSkus() : [];
      var allClients = typeof ERP.getClients === "function" ? ERP.getClients() : [];
      var qText = String(state.skuFilterQuery || "").trim().toLowerCase();
      var fBrand = state.skuFilterBrand || "ALL";
      var fCrate = state.skuFilterCrate || "ALL";
      var fStock = state.skuFilterStock || "ALL";

      var brandSet = {}; var brandsList = [];
      for (var b = 0; b < allSkus.length; b++) { var br = allSkus[b].brand || "General"; if (!brandSet[br]) { brandSet[br] = true; brandsList.push(br); } }
      var brandOpts = '<option value="ALL">Todos los proveedores / marcas</option>' + brandsList.map(function (br) { return '<option value="' + escSafe(br) + '"' + (fBrand === br ? " selected" : "") + ">" + escSafe(br) + "</option>"; }).join("");
      var crateFilterOpts = '<option value="ALL">Todos los envases</option><option value="none"' + (fCrate === "none" ? " selected" : "") + ">Sin casillero</option>" +
        cTypes.map(function (ct) { return '<option value="' + escSafe(ct.id) + '"' + (fCrate === ct.id ? " selected" : "") + ">" + escSafe(ct.name) + "</option>"; }).join("");

      var filteredSkus = allSkus.filter(function (s) {
        var stockQty = typeof ERP.getSkuFefoStock === "function" ? ERP.getSkuFefoStock(s.sku) : 0;
        var crateKey = typeof ERP.normalizeCrateKey === "function" ? ERP.normalizeCrateKey(s.crateType) : String(s.crateType || "none");
        if (qText && (String(s.sku) + " " + String(s.name) + " " + String(s.brand || "")).toLowerCase().indexOf(qText) === -1) return false;
        if (fBrand !== "ALL" && (s.brand || "General") !== fBrand) return false;
        if (fCrate !== "ALL" && crateKey !== fCrate) return false;
        if (fStock === "IN_STOCK" && stockQty <= 0) return false;
        if (fStock === "OUT_STOCK" && stockQty > 0) return false;
        if (fStock === "LOW_STOCK" && stockQty > 20) return false;
        return true;
      });

      var totalMercanciaCostoUsd = typeof ERP.getTotalMercanciaCostoUsd === "function" ? ERP.getTotalMercanciaCostoUsd() : 0;
      var filteredMercanciaCostoUsd = 0; var filteredUnitsTotal = 0;
      var skuCatalogRows = filteredSkus.map(function (s) {
        var pNorm = typeof ERP.getSkuPriceForClientType === "function" ? ERP.getSkuPriceForClientType(s.sku, "Normal") : Number(s.priceUsd || 0);
        var pMay = typeof ERP.getSkuPriceForClientType === "function" ? ERP.getSkuPriceForClientType(s.sku, "Mayorista") : Number(s.priceUsd || 0);
        var pDist = typeof ERP.getSkuPriceForClientType === "function" ? ERP.getSkuPriceForClientType(s.sku, "Distribuidor") : Number(s.priceUsd || 0);
        var cKey = typeof ERP.normalizeCrateKey === "function" ? ERP.normalizeCrateKey(s.crateType) : String(s.crateType || "none");
        var ctName = getCrateTypeSafe(cKey).name;
        var stockQty = typeof ERP.getSkuFefoStock === "function" ? ERP.getSkuFefoStock(s.sku) : 0;
        var unitCost = Number(s.costUsd || 0);
        var subtotalCostoUsd = Number((stockQty * unitCost).toFixed(2));
        filteredMercanciaCostoUsd = Number((filteredMercanciaCostoUsd + subtotalCostoUsd).toFixed(2));
        filteredUnitsTotal += stockQty;
        return (
          "<tr>" +
            "<td><strong>" + escSafe(s.sku) + "</strong> · " + escSafe(s.name) + "</td>" +
            "<td>" + escSafe(s.brand || "General") + "</td>" +
            "<td><strong>" + fmtUsdSafe(unitCost) + "</strong></td>" +
            "<td>N: <strong>" + fmtUsdSafe(pNorm) + "</strong> · M: <strong>" + fmtUsdSafe(pMay) + "</strong> · D: <strong>" + fmtUsdSafe(pDist) + "</strong></td>" +
            '<td>' + Number(s.weightKg || 0).toFixed(2) + ' kg · <span class="muted">' + escSafe(ctName) + "</span></td>" +
            "<td><strong>" + stockQty + " und.</strong></td>" +
            "<td><strong>" + fmtUsdSafe(subtotalCostoUsd) + '</strong><div class="muted">' + fmtBsSafe(subtotalCostoUsd) + "</div></td>" +
            '<td><button type="button" class="warn sm" data-edit-sku="' + escSafe(s.sku) + '">Modificar SKU</button></td>' +
          "</tr>"
        );
      }).join("");

      var fromDate = state.topSkuFromDate || "2026-11-01";
      var toDate = state.topSkuToDate || "2026-11-30";
      var topReport = typeof ERP.computeTopSellingSkus === "function"
        ? ERP.computeTopSellingSkus(fromDate, toDate)
        : { items: [], matchedInvoices: 0, totalUnits: 0, totalRevenueUsd: 0 };
      var topRows = (topReport.items || []).map(function (row, idx) {
        var badgeCls = idx === 0 ? "b-ok" : (idx === 1 ? "b-info" : "b-warn");
        return '<tr><td><span class="badge ' + badgeCls + '">#' + (idx + 1) + "</span></td><td><strong>" + escSafe(row.sku) + "</strong> · " + escSafe(row.name) + "</td><td>" + escSafe(row.brand) + "</td><td><strong>" + row.units + " und.</strong></td><td>" + row.invoicesCount + "</td><td>" + Number(row.sharePct || 0).toFixed(1) + "%</td><td><strong>" + fmtUsdSafe(row.revenueUsd) + '</strong> <span class="muted">(' + fmtBsSafe(row.revenueUsd) + ")</span></td></tr>";
      }).join("");

      var totalCratesWarehouse = 0;
      var totalCratesInClients = 0;
      var totalCratesPayable = 0;
      var totalCratesNet = 0;

      var crateTypeRows = cTypes.map(function (ct) {
        var stQty = Number((state.crateStock && state.crateStock[ct.id]) || 0);
        var inClients = allClients.reduce(function (acc, cl) {
          if (typeof ERP.ensureClientDebt === "function") ERP.ensureClientDebt(cl.id);
          return acc + Number((state.clientCrateDebt && state.clientCrateDebt[cl.id] && state.clientCrateDebt[cl.id][ct.id]) || 0);
        }, 0);
        var payableQty = getSupplierCratePayableById(ct.id);
        var netQty = (stQty + inClients) - payableQty;

        totalCratesWarehouse += stQty;
        totalCratesInClients += inClients;
        totalCratesPayable += payableQty;
        totalCratesNet += netQty;

        return (
          "<tr>" +
            "<td><strong>" + escSafe(ct.name) + "</strong></td>" +
            '<td><span class="muted">' + escSafe(ct.id) + "</span></td>" +
            "<td><strong>" + stQty + " und.</strong></td>" +
            "<td><strong>" + inClients + " und.</strong></td>" +
            "<td><strong>-" + payableQty + " und.</strong></td>" +
            "<td><strong>" + netQty + " und.</strong></td>" +
            '<td><button type="button" class="warn sm" data-edit-crate-type="' + escSafe(ct.id) + '">Modificar</button></td>' +
          "</tr>"
        );
      }).join("");

      var sorted = (Array.isArray(state.lots) ? state.lots : []).slice().sort(function (a, b) { return String(a.expiry).localeCompare(String(b.expiry)); });
      var rows = sorted.map(function (l, idx) {
        var skuInfo = typeof ERP.getSku === "function" ? ERP.getSku(l.sku) : { name: l.sku };
        return "<tr><td><strong>" + escSafe(l.id) + "</strong></td><td><strong>" + escSafe(l.sku) + "</strong> · " + escSafe(skuInfo.name || l.sku) + "</td><td>" + escSafe(l.warehouse) + "</td><td><strong>" + escSafe(l.expiry) + "</strong></td><td><strong>" + Number(l.qty) + '</strong></td><td><span class="badge ' + (idx === 0 ? "b-warn" : "b-ok") + '">' + (idx === 0 ? "Prioridad FEFO" : "Disponible") + '</span></td><td><button type="button" class="warn sm" data-edit-lot-sku="' + escSafe(l.sku) + '" data-edit-lot-id="' + escSafe(l.id) + '">Modificar</button></td></tr>';
      }).join("");

      var qRows = (Array.isArray(state.quarantine) ? state.quarantine : []).map(function (q) {
        return "<tr><td>" + escSafe(q.id) + "</td><td>" + escSafe(q.date) + "</td><td>" + escSafe(q.invoiceId) + "</td><td>" + escSafe(q.sku) + "</td><td>" + q.qty + "</td><td>" + escSafe(q.reason) + "</td></tr>";
      }).join("");

      root.innerHTML =
        '<div class="card">' +
          '<div class="card-header"><div><h2 class="card-title">Productos Mas Vendidos por Rango de Fechas</h2><p class="muted">Evalue la rotacion de cada SKU segun las fechas seleccionadas (' + topReport.matchedInvoices + " factura(s) en el rango).</p></div>" + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;"><div class="field" style="margin-bottom:0;"><label>Desde</label><input type="date" id="top-sku-from" value="' + escSafe(fromDate) + '" /></div><div class="field" style="margin-bottom:0;"><label>Hasta</label><input type="date" id="top-sku-to" value="' + escSafe(toDate) + '" /></div><button type="button" class="sm" id="btn-top-sku-all">Todo el Periodo</button></div></div>' +
          '<div class="grid-3" style="margin-bottom:12px;"><div class="kpi"><div class="kpi-label">Unidades Vendidas</div><div class="kpi-val">' + topReport.totalUnits + ' und.</div><div class="kpi-sub">En rango seleccionado</div></div><div class="kpi"><div class="kpi-label">Facturacion Generada</div><div class="kpi-val">' + fmtUsdSafe(topReport.totalRevenueUsd) + '</div><div class="kpi-sub">' + fmtBsSafe(topReport.totalRevenueUsd) + '</div></div><div class="kpi"><div class="kpi-label">SKU Lider</div><div class="kpi-val">' + (topReport.items[0] && topReport.items[0].units > 0 ? escSafe(topReport.items[0].sku) : "-") + '</div><div class="kpi-sub">' + (topReport.items[0] && topReport.items[0].units > 0 ? topReport.items[0].units + " und. (" + Number(topReport.items[0].sharePct || 0).toFixed(1) + "%)" : "Sin ventas en rango") + "</div></div></div>" +
          '<div class="table-wrap"><table><thead><tr><th>Rank</th><th>SKU / Producto</th><th>Proveedor / Marca</th><th>Unidades</th><th>Facturas</th><th>Participacion</th><th>Monto Vendido</th></tr></thead><tbody>' + (topRows || '<tr><td colspan="7" class="muted">Sin datos.</td></tr>') + "</tbody></table></div>" +
        "</div>" +
        '<div class="card">' +
          '<div class="card-header"><div><h2 class="card-title">Catalogo de SKU e Inventario (' + filteredSkus.length + " de " + allSkus.length + ')</h2><p class="muted">Valor total en mercancia (al costo): <strong>' + fmtUsdSafe(totalMercanciaCostoUsd) + "</strong> (" + fmtBsSafe(totalMercanciaCostoUsd) + ") · Filtrado: <strong>" + fmtUsdSafe(filteredMercanciaCostoUsd) + "</strong> (" + filteredUnitsTotal + ' und.)</p></div><button type="button" class="primary sm" id="btn-almacen-new-sku">+ Agregar Nuevo SKU</button></div>' +
          '<div class="filter-bar"><div class="grid-4"><div class="field" style="margin-bottom:0;"><label>Busqueda Rapida</label><input type="text" id="flt-sku-q" value="' + escSafe(state.skuFilterQuery || "") + '" placeholder="Codigo, nombre o marca..." /></div><div class="field" style="margin-bottom:0;"><label>Proveedor / Marca</label><select id="flt-sku-brand">' + brandOpts + "</select></div>" + '<div class="field" style="margin-bottom:0;"><label>Tipo de Envase</label><select id="flt-sku-crate">' + crateFilterOpts + '</select></div><div class="field" style="margin-bottom:0;"><label>Estado de Existencia</label><select id="flt-sku-stock"><option value="ALL"' + (fStock === "ALL" ? " selected" : "") + '>Todos</option><option value="IN_STOCK"' + (fStock === "IN_STOCK" ? " selected" : "") + '>Con existencia (&gt; 0)</option><option value="LOW_STOCK"' + (fStock === "LOW_STOCK" ? " selected" : "") + '>Existencia baja (&lt;= 20)</option><option value="OUT_STOCK"' + (fStock === "OUT_STOCK" ? " selected" : "") + ">Sin existencia (0)</option></select></div></div>" + '<div style="display:flex;justify-content:flex-end;margin-top:8px;"><button type="button" class="sm" id="btn-clear-sku-filters">Limpiar Filtros</button></div></div>' +
          '<div class="table-wrap"><table><thead><tr><th>SKU / Producto</th><th>Proveedor / Marca</th><th>Costo Unit.</th><th>Ventas (N / M / D)</th><th>Peso / Envase</th><th>Existencia</th><th>Valor Mercancia (Subtotal)</th><th>Accion</th></tr></thead><tbody>' + (skuCatalogRows || '<tr><td colspan="8" class="muted">Ningun SKU coincide con los filtros seleccionados.</td></tr>') + "</tbody></table></div>" +
        "</div>" +
        '<div class="card">' +
          '<div class="card-header">' +
            "<div>" +
              '<h2 class="card-title">Casilleros / Envases Retornables (' + cTypes.length + ")</h2>" +
              '<p class="muted">Control de casilleros en almacen, prestamos en poder de clientes, cuentas por pagar a proveedores y total neto.</p>' +
            "</div>" +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
              '<button type="button" class="sm" id="btn-rep-crate-history">Historial de Casilleros</button>' +
              '<button type="button" class="sm" id="btn-rep-crate-returned">Entregados por Clientes</button>' +
              '<button type="button" class="sm" id="btn-rep-crate-loans">Prestamos de Clientes</button>' +
              '<button type="button" class="sm" id="btn-rep-crate-payables">Cuentas por Pagar</button>' +
              '<button type="button" class="sm" id="btn-rep-crate-summary">Resumen Casilleros</button>' +
              '<button type="button" class="primary sm" id="btn-almacen-new-crate">+ Nuevo Tipo de Casillero</button>' +
            "</div>" +
          "</div>" +
          '<div class="grid-4" style="margin-bottom:12px;">' +
            '<div class="kpi"><div class="kpi-label">CASILLEROS EN ALMACEN</div><div class="kpi-val">' + totalCratesWarehouse + ' und.</div><div class="kpi-sub">Disponibles actualmente en almacen</div></div>' +
            '<div class="kpi"><div class="kpi-label">EN CLIENTES (PRESTAMOS)</div><div class="kpi-val">' + totalCratesInClients + ' und.</div><div class="kpi-sub">Total casilleros en poder de clientes</div></div>' +
            '<div class="kpi"><div class="kpi-label">POR PAGAR PROVEEDOR</div><div class="kpi-val">-' + totalCratesPayable + ' und.</div><div class="kpi-sub">Descontado de los totales</div></div>' +
            '<div class="kpi"><div class="kpi-label">TOTAL NETO CASILLEROS</div><div class="kpi-val">' + totalCratesNet + ' und.</div><div class="kpi-sub">(Almacen + Clientes) - Proveedor</div></div>' +
          "</div>" +
          '<div class="table-wrap"><table><thead><tr><th>TIPO DE CASILLERO</th><th>CODIGO</th><th>EN ALMACEN</th><th>EN CLIENTES (PRESTAMOS)</th><th>POR PAGAR PROVEEDOR</th><th>TOTAL NETO</th><th>ACCION</th></tr></thead><tbody>' + crateTypeRows + "</tbody></table></div>" +
        "</div>" +
        '<div class="card">' +
          '<div class="card-header"><h3 class="card-title">Lotes en Almacen y Control FEFO (' + sorted.length + ')</h3></div>' +
          '<div class="table-wrap"><table><thead><tr><th>Lote</th><th>SKU</th><th>Ubicacion</th><th>Caducidad</th><th>Existencia</th><th>Estado</th><th>Accion</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
        "</div>" +
        '<div class="card">' +
          '<h3 class="card-title">Cuarentena / Merma (' + (Array.isArray(state.quarantine) ? state.quarantine.length : 0) + ')</h3>' +
          '<div class="table-wrap"><table><thead><tr><th>ID</th><th>Fecha</th><th>Factura</th><th>SKU</th><th>Cant.</th><th>Motivo</th></tr></thead><tbody>' + (qRows || '<tr><td colspan="6" class="muted">Sin registros.</td></tr>') + "</tbody></table></div>" +
        "</div>";

      document.getElementById("top-sku-from").onchange = function () { state.topSkuFromDate = this.value; if (typeof ERP.saveState === "function") ERP.saveState(); if (typeof ERP.render === "function") ERP.render(); };
      document.getElementById("top-sku-to").onchange = function () { state.topSkuToDate = this.value; if (typeof ERP.saveState === "function") ERP.saveState(); if (typeof ERP.render === "function") ERP.render(); };
      document.getElementById("btn-top-sku-all").onclick = function () { state.topSkuFromDate = "2000-01-01"; state.topSkuToDate = "2099-12-31"; if (typeof ERP.saveState === "function") ERP.saveState(); if (typeof ERP.render === "function") ERP.render(); };

      document.getElementById("flt-sku-q").oninput = function () { state.skuFilterQuery = this.value; if (typeof ERP.saveState === "function") ERP.saveState(); if (typeof ERP.render === "function") ERP.render(); };
      document.getElementById("flt-sku-brand").onchange = function () { state.skuFilterBrand = this.value; if (typeof ERP.saveState === "function") ERP.saveState(); if (typeof ERP.render === "function") ERP.render(); };
      document.getElementById("flt-sku-crate").onchange = function () { state.skuFilterCrate = this.value; if (typeof ERP.saveState === "function") ERP.saveState(); if (typeof ERP.render === "function") ERP.render(); };
      document.getElementById("flt-sku-stock").onchange = function () { state.skuFilterStock = this.value; if (typeof ERP.saveState === "function") ERP.saveState(); if (typeof ERP.render === "function") ERP.render(); };
      document.getElementById("btn-clear-sku-filters").onclick = function () { state.skuFilterQuery = ""; state.skuFilterBrand = "ALL"; state.skuFilterCrate = "ALL"; state.skuFilterStock = "ALL"; if (typeof ERP.saveState === "function") ERP.saveState(); if (typeof ERP.render === "function") ERP.render(); };

      document.getElementById("btn-rep-crate-history").onclick = function () { openCrateReportModal("history"); };
      document.getElementById("btn-rep-crate-returned").onclick = function () { openCrateReportModal("returned"); };
      document.getElementById("btn-rep-crate-loans").onclick = function () { openCrateReportModal("loans"); };
      document.getElementById("btn-rep-crate-payables").onclick = function () { openCrateReportModal("payables"); };
      document.getElementById("btn-rep-crate-summary").onclick = function () { openCrateReportModal("summary"); };

      document.getElementById("btn-almacen-new-crate").onclick = function () { openCrateTypeModal(null); };
      var editCrateBtns = root.querySelectorAll("button[data-edit-crate-type]");
      for (var cbi = 0; cbi < editCrateBtns.length; cbi++) {
        editCrateBtns[cbi].onclick = function () { openCrateTypeModal(getCrateTypeSafe(this.getAttribute("data-edit-crate-type"))); };
      }

      document.getElementById("btn-almacen-new-sku").onclick = function () { openSkuFormModal(null, null); };
      var editSkuBtns = root.querySelectorAll("button[data-edit-sku]");
      for (var i = 0; i < editSkuBtns.length; i++) {
        editSkuBtns[i].onclick = function () {
          var code = this.getAttribute("data-edit-sku");
          var foundSku = typeof ERP.getSku === "function" ? ERP.getSku(code) : null;
          openSkuFormModal(foundSku, null);
        };
      }
      var editLotBtns = root.querySelectorAll("button[data-edit-lot-sku]");
      for (var j = 0; j < editLotBtns.length; j++) {
        editLotBtns[j].onclick = function () {
          var code = this.getAttribute("data-edit-lot-sku");
          var foundSku = typeof ERP.getSku === "function" ? ERP.getSku(code) : null;
          openSkuFormModal(foundSku, this.getAttribute("data-edit-lot-id"));
        };
      }
    } catch (err) {
      root.innerHTML =
        '<div class="card"><h3 class="card-title">Error en Almacen</h3><p class="muted">' +
        escSafe(err && err.message ? err.message : err) +
        "</p></div>";
    }
  }

  ERP.registerMenuModule("almacen", renderAlmacenView);
})();