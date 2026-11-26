(function () {
  "use strict";

  var ERP = window.DistriFoodERP;
  if (!ERP) return;

  function renderReportesView(root) {
    var state = ERP.state;
    var mode = state.reportMode || "global";
    var sales = state.invoices.reduce(function (a, b) { return a + Number(b.totalUsd || 0); }, 0);
    var pur = state.purchases.reduce(function (a, b) { return a + Number(b.totalUsd || 0); }, 0);
    var fefo = state.lots.reduce(function (a, b) { return a + Number(b.qty || 0); }, 0);
    var debtUsd = ERP.getClients().reduce(function (a, c) { return a + Number(state.clientBalanceUsd[c.id] || 0); }, 0);
    var totalMercanciaCostoUsd = ERP.getTotalMercanciaCostoUsd();

    var repTabs = [
      { id: "global", label: "Global" },
      { id: "detallado", label: "Detallado" },
      { id: "est_ventas", label: "Estadísticas de Ventas" },
      { id: "clientes_rep", label: "Clientes y Cartera" },
      { id: "despachos_rep", label: "Despachos y Novedades" },
      { id: "cobranza_pagos", label: "Cobranza y Pagos" },
      { id: "proveedores_rep", label: "Proveedores y Compras" },
      { id: "est_cobranza", label: "Estadísticas de Cobranza" }
    ];

    var modeTitles = {
      global: "Reporte Global", detallado: "Reporte Detallado", est_ventas: "Estadísticas de Ventas",
      clientes_rep: "Reporte de Clientes y Cartera", despachos_rep: "Reporte de Despachos y Novedades",
      cobranza_pagos: "Reporte de Cobranza y Pagos", proveedores_rep: "Reporte de Proveedores y Compras",
      est_cobranza: "Estadísticas de Cobranza"
    };

    var consHtml = state.consolidations.map(function (c) {
      var live = ERP.calcConsSkuTotals(c.invoiceIds || []);
      var li = live.skuTotals.map(function (s) {
        return '<li><strong>' + ERP.esc(s.sku) + '</strong> (' + ERP.esc(s.name) + '): ' + s.qty + ' und. · ' + s.weightKg.toFixed(2) + ' kg · ' + ERP.fmtUsd(s.totalUsd) + '</li>';
      }).join("");
      return '<div class="kpi"><div class="kpi-label">' + ERP.esc(c.id) + ' · ' + ERP.esc(c.truck) + '</div><ul style="margin:6px 0 0 18px;padding:0;font-size:12.5px;">' + (li || '<li>Sin SKUs</li>') + '</ul></div>';
    }).join("");

    var globalBody =
      '<div class="grid-4" style="margin-bottom:14px;"><div class="kpi"><div class="kpi-label">Ventas Activas ($)</div><div class="kpi-val">' + ERP.fmtUsd(sales) + '</div><div class="kpi-sub">' + ERP.fmtBs(sales) + '</div></div><div class="kpi"><div class="kpi-label">Compras ($)</div><div class="kpi-val">' + ERP.fmtUsd(pur) + '</div><div class="kpi-sub">' + ERP.fmtBs(pur) + '</div></div><div class="kpi"><div class="kpi-label">Cartera por Cobrar</div><div class="kpi-val">' + ERP.fmtUsd(debtUsd) + '</div><div class="kpi-sub">' + ERP.fmtBs(debtUsd) + '</div></div><div class="kpi"><div class="kpi-label">Stock FEFO Total</div><div class="kpi-val">' + fefo + ' und.</div><div class="kpi-sub">' + state.lots.length + ' lotes activos</div></div></div>' +
      '<h3 class="card-title" style="margin-bottom:10px;">Totales por SKU en Consolidaciones</h3><div class="grid-2">' + (consHtml || '<p class="muted">Sin consolidaciones.</p>') + '</div>';

    var detInvoicesRows = state.invoices.map(function (inv) {
      var cl = ERP.getClient(inv.clientId);
      var itemsStr = inv.items.map(function (it) { return it.qty + "x " + it.sku + " @" + ERP.fmtUsd(it.unitPriceUsd); }).join(" | ");
      var devStr = (inv.returnsLog || []).map(function (rl) { return rl.qty + "x " + rl.sku + " (" + rl.disposition + ": " + rl.reason + ")"; }).join("; ");
      return '<tr><td><strong>' + ERP.esc(inv.id) + '</strong><div class="muted">' + ERP.esc(inv.date) + '</div></td><td><strong>' + ERP.esc(cl.name) + '</strong><div class="muted">Vend: ' + ERP.esc(inv.sellerName) + '</div></td><td>' + ERP.esc(itemsStr) + (devStr ? '<div class="badge b-warn" style="margin-top:4px;">Devoluciones: ' + ERP.esc(devStr) + '</div>' : '') + '<div class="nota-marginal">' + ERP.esc(inv.marginalNote || "") + '</div></td><td><strong>' + ERP.fmtUsd(inv.totalUsd) + '</strong><div class="muted">' + ERP.fmtBs(inv.totalUsd) + '</div></td><td><span class="badge b-info">' + ERP.esc(inv.status) + '</span></td></tr>';
    }).join("");

    var detDeletedRows = state.deletedInvoices.map(function (d) {
      return '<tr><td><strong>' + ERP.esc(d.id) + '</strong><div class="muted">' + ERP.esc(d.deletedAt) + '</div></td><td>' + ERP.esc(ERP.getClient(d.clientId).name) + '</td><td>' + ERP.esc(d.reason) + ' (' + ERP.esc(d.deletedBy) + ')</td><td><strong>' + ERP.fmtUsd(d.totalUsd) + '</strong></td></tr>';
    }).join("");

    var detalladoBody =
      '<h3 class="card-title" style="margin-bottom:8px;">Detalle de Facturas, Devoluciones y Nota Marginal</h3><div class="table-wrap" style="margin-bottom:16px;"><table><thead><tr><th>Factura</th><th>Cliente</th><th>SKUs, Devoluciones y Nota Marginal</th><th>Total</th><th>Estado</th></tr></thead><tbody>' + (detInvoicesRows || '<tr><td colspan="5" class="muted">Sin facturas.</td></tr>') + '</tbody></table></div>' +
      '<h3 class="card-title" style="margin-bottom:8px;">Detalle de Facturas Eliminadas por No Recepción</h3><div class="table-wrap"><table><thead><tr><th>Factura</th><th>Cliente</th><th>Motivo y Responsable</th><th>Monto Revertido</th></tr></thead><tbody>' + (detDeletedRows || '<tr><td colspan="4" class="muted">Sin facturas eliminadas.</td></tr>') + '</tbody></table></div>';

    var estVentasStats = ERP.computeTopSellingSkus("2000-01-01", "2099-12-31");
    var clientSalesMap = {};
    for (var vi = 0; vi < state.invoices.length; vi++) {
      var invV = state.invoices[vi];
      if (!clientSalesMap[invV.clientId]) clientSalesMap[invV.clientId] = { invCount: 0, totalUsd: 0 };
      clientSalesMap[invV.clientId].invCount += 1;
      clientSalesMap[invV.clientId].totalUsd = Number((clientSalesMap[invV.clientId].totalUsd + Number(invV.totalUsd || 0)).toFixed(2));
    }
    var estVentasClientRows = ERP.getClients().map(function (cl) {
      var cs = clientSalesMap[cl.id] || { invCount: 0, totalUsd: 0 };
      var avgTicket = cs.invCount > 0 ? (cs.totalUsd / cs.invCount) : 0;
      return '<tr><td><strong>' + ERP.esc(cl.name) + '</strong><div class="muted">' + ERP.esc(cl.clientType || "Normal") + ' · ' + ERP.esc(cl.zone || "—") + '</div></td><td>' + cs.invCount + '</td><td>' + ERP.fmtUsd(avgTicket) + '</td><td><strong>' + ERP.fmtUsd(cs.totalUsd) + '</strong> <span class="muted">(' + ERP.fmtBs(cs.totalUsd) + ')</span></td></tr>';
    }).join("");
    var estVentasSkuRows = estVentasStats.items.map(function (s) {
      return '<tr><td><strong>' + ERP.esc(s.sku) + '</strong> · ' + ERP.esc(s.name) + '</td><td><strong>' + s.units + ' und.</strong></td><td>' + s.sharePct.toFixed(1) + '%</td><td><strong>' + ERP.fmtUsd(s.revenueUsd) + '</strong> <span class="muted">(' + ERP.fmtBs(s.revenueUsd) + ')</span></td></tr>';
    }).join("");
    var estVentasBody =
      '<div class="grid-3" style="margin-bottom:14px;"><div class="kpi"><div class="kpi-label">Facturas Emitidas</div><div class="kpi-val">' + state.invoices.length + '</div><div class="kpi-sub">Unidades: ' + estVentasStats.totalUnits + '</div></div><div class="kpi"><div class="kpi-label">Venta Total Activa</div><div class="kpi-val">' + ERP.fmtUsd(sales) + '</div><div class="kpi-sub">' + ERP.fmtBs(sales) + '</div></div><div class="kpi"><div class="kpi-label">Ticket Promedio</div><div class="kpi-val">' + ERP.fmtUsd(state.invoices.length ? (sales / state.invoices.length) : 0) + '</div><div class="kpi-sub">Por factura activa</div></div></div>' +
      '<h3 class="card-title" style="margin-bottom:8px;">Ventas por Cliente</h3><div class="table-wrap" style="margin-bottom:16px;"><table><thead><tr><th>Cliente</th><th>Facturas</th><th>Ticket Prom.</th><th>Total Vendido</th></tr></thead><tbody>' + estVentasClientRows + '</tbody></table></div>' +
      '<h3 class="card-title" style="margin-bottom:8px;">Ventas por SKU</h3><div class="table-wrap"><table><thead><tr><th>SKU / Producto</th><th>Unidades</th><th>Participación</th><th>Monto Vendido</th></tr></thead><tbody>' + estVentasSkuRows + '</tbody></table></div>';

    var totalCreditLimitUsd = ERP.getClients().reduce(function (a, c) { return a + Number(c.creditUsd || 0); }, 0);
    var clientesRepRows = ERP.getClients().map(function (c) {
      ERP.ensureClientDebt(c.id);
      var bal = Number(state.clientBalanceUsd[c.id] || 0);
      var cred = Number(c.creditUsd || 0);
      var avail = Math.max(0, cred - bal);
      return '<tr><td><strong>' + ERP.esc(c.name) + '</strong><div class="muted">RIF: ' + ERP.esc(c.rif) + ' · ' + ERP.esc(c.zone || "—") + '</div></td><td><span class="badge ' + ERP.clientTypeBadgeClass(c.clientType || "Normal") + '">' + ERP.esc(c.clientType || "Normal") + '</span></td><td>' + ERP.fmtUsd(cred) + ' <div class="muted">' + Number(c.creditDays || 0) + ' días</div></td><td><strong>' + ERP.fmtUsd(bal) + '</strong> <div class="muted">' + ERP.fmtBs(bal) + '</div></td><td>' + ERP.fmtUsd(avail) + '</td><td>' + ERP.formatClientCratesSummary(state.clientCrateDebt[c.id]) + '</td></tr>';
    }).join("");
    var clientesRepBody =
      '<div class="grid-3" style="margin-bottom:14px;"><div class="kpi"><div class="kpi-label">Clientes Registrados</div><div class="kpi-val">' + ERP.getClients().length + '</div></div><div class="kpi"><div class="kpi-label">Límite Crédito Total</div><div class="kpi-val">' + ERP.fmtUsd(totalCreditLimitUsd) + '</div></div><div class="kpi"><div class="kpi-label">Saldo por Cobrar</div><div class="kpi-val">' + ERP.fmtUsd(debtUsd) + '</div><div class="kpi-sub">' + ERP.fmtBs(debtUsd) + '</div></div></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>Crédito</th><th>Deuda Actual</th><th>Crédito Disp.</th><th>Vacíos en Cuenta</th></tr></thead><tbody>' + clientesRepRows + '</tbody></table></div>';

    var despachosRepRows = state.invoices.map(function (inv) {
      var cl = ERP.getClient(inv.clientId);
      var devsTxt = (inv.returnsLog || []).length ? (inv.returnsLog || []).map(function (rl) { return rl.qty + "x " + rl.sku + " (" + rl.disposition + ": " + rl.reason + ")"; }).join("; ") : "Sin devoluciones";
      return '<tr><td><strong>' + ERP.esc(inv.id) + '</strong><div class="muted">' + ERP.esc(inv.date) + '</div></td><td><strong>' + ERP.esc(cl.name) + '</strong><div class="muted">' + ERP.esc(cl.zone || "—") + '</div></td><td><span class="badge ' + (inv.status === "Entregada" ? "b-ok" : "b-info") + '">' + ERP.esc(inv.status) + '</span></td><td>' + ERP.esc(devsTxt) + '</td><td><strong>' + ERP.fmtUsd(inv.totalUsd) + '</strong></td></tr>';
    }).join("");
    var despachosRepBody =
      '<div class="grid-3" style="margin-bottom:14px;"><div class="kpi"><div class="kpi-label">Consolidaciones Activas</div><div class="kpi-val">' + state.consolidations.length + '</div></div><div class="kpi"><div class="kpi-label">Facturas en Proceso</div><div class="kpi-val">' + state.invoices.length + '</div></div><div class="kpi"><div class="kpi-label">Eliminadas (No Recibe)</div><div class="kpi-val">' + state.deletedInvoices.length + '</div></div></div>' +
      '<h3 class="card-title" style="margin-bottom:8px;">Estado de Despachos y Devoluciones</h3><div class="table-wrap" style="margin-bottom:16px;"><table><thead><tr><th>Factura</th><th>Cliente</th><th>Estado</th><th>Devoluciones</th><th>Monto</th></tr></thead><tbody>' + (despachosRepRows || '<tr><td colspan="5" class="muted">Sin registros.</td></tr>') + '</tbody></table></div>' +
      '<h3 class="card-title" style="margin-bottom:8px;">Facturas Eliminadas por No Recepción</h3><div class="table-wrap"><table><thead><tr><th>Factura</th><th>Cliente</th><th>Motivo y Usuario</th><th>Monto Revertido</th></tr></thead><tbody>' + (detDeletedRows || '<tr><td colspan="4" class="muted">Sin eliminaciones.</td></tr>') + '</tbody></table></div>';

    var cobranzaPagosRows = state.collectionLog.map(function (lg) {
      return '<tr><td>' + ERP.esc(lg.txDate || lg.date) + '</td><td><strong>' + ERP.esc(ERP.getClient(lg.clientId).name) + '</strong></td><td><span class="badge b-ok">' + ERP.esc(lg.type) + '</span></td><td>' + ERP.esc(lg.detail) + '</td></tr>';
    }).join("");
    var cobranzaPagosBody = '<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Operación</th><th>Detalle de Pago / Vacíos</th></tr></thead><tbody>' + (cobranzaPagosRows || '<tr><td colspan="4" class="muted">No hay pagos o devoluciones registrados aún.</td></tr>') + '</tbody></table></div>';

    var supMap = {};
    for (var pi = 0; pi < state.purchases.length; pi++) {
      var pu = state.purchases[pi];
      var supName = pu.supplier || "Proveedor";
      if (!supMap[supName]) supMap[supName] = { orders: 0, units: 0, totalUsd: 0 };
      supMap[supName].orders += 1;
      supMap[supName].totalUsd = Number((supMap[supName].totalUsd + Number(pu.totalUsd || 0)).toFixed(2));
      for (var pl = 0; pl < (pu.lines || []).length; pl++) supMap[supName].units += Number(pu.lines[pl].qty || 0);
    }
    var supRows = [];
    for (var skey in supMap) {
      if (Object.prototype.hasOwnProperty.call(supMap, skey)) {
        var sm = supMap[skey];
        supRows.push('<tr><td><strong>' + ERP.esc(skey) + '</strong></td><td>' + sm.orders + '</td><td>' + sm.units + ' und.</td><td><strong>' + ERP.fmtUsd(sm.totalUsd) + '</strong> <span class="muted">(' + ERP.fmtBs(sm.totalUsd) + ')</span></td></tr>');
      }
    }
    var proveedoresRepBody =
      '<div class="grid-3" style="margin-bottom:14px;"><div class="kpi"><div class="kpi-label">Órdenes de Compra</div><div class="kpi-val">' + state.purchases.length + '</div></div><div class="kpi"><div class="kpi-label">Inversión en Compras</div><div class="kpi-val">' + ERP.fmtUsd(pur) + '</div><div class="kpi-sub">' + ERP.fmtBs(pur) + '</div></div><div class="kpi"><div class="kpi-label">Valor Mercancía en Almacén</div><div class="kpi-val">' + ERP.fmtUsd(totalMercanciaCostoUsd) + '</div><div class="kpi-sub">Al costo</div></div></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Proveedor</th><th>Compras</th><th>Unidades</th><th>Total Comprado</th></tr></thead><tbody>' + (supRows.join("") || '<tr><td colspan="4" class="muted">Sin compras.</td></tr>') + '</tbody></table></div>';

    var totalCollectedUsd = 0;
    for (var ci = 0; ci < state.collectionLog.length; ci++) {
      var detStr = String(state.collectionLog[ci].detail || "");
      var abonMatch = detStr.match(/Abonado:\s*\$([0-9]+(?:\.[0-9]+)?)/);
      if (abonMatch) totalCollectedUsd += parseFloat(abonMatch[1]) || 0;
      else {
        var abonoMatch = detStr.match(/Abono de \$([0-9]+(?:\.[0-9]+)?)/);
        if (abonoMatch) totalCollectedUsd += parseFloat(abonoMatch[1]) || 0;
      }
    }
    totalCollectedUsd = Number(totalCollectedUsd.toFixed(2));
    var totalCarteraGross = Number((debtUsd + totalCollectedUsd).toFixed(2));
    var recoveryPct = totalCarteraGross > 0 ? ((totalCollectedUsd / totalCarteraGross) * 100) : 0;

    var estCobRows = ERP.getClients().map(function (c) {
      ERP.ensureClientDebt(c.id);
      var bal = Number(state.clientBalanceUsd[c.id] || 0);
      var pctOfDebt = debtUsd > 0 ? ((bal / debtUsd) * 100) : 0;
      return '<tr><td><strong>' + ERP.esc(c.name) + '</strong><div class="muted">' + ERP.esc(c.zone || "—") + '</div></td><td><strong>' + ERP.fmtUsd(bal) + '</strong> <span class="muted">(' + ERP.fmtBs(bal) + ')</span></td><td>' + pctOfDebt.toFixed(1) + '%</td><td><span class="badge ' + (bal > 0 ? "b-warn" : "b-ok") + '">' + (bal > 0 ? "Pendiente" : "Solvente") + '</span></td></tr>';
    }).join("");

    var estCobranzaBody =
      '<div class="grid-4" style="margin-bottom:14px;"><div class="kpi"><div class="kpi-label">Saldo por Cobrar</div><div class="kpi-val">' + ERP.fmtUsd(debtUsd) + '</div><div class="kpi-sub">' + ERP.fmtBs(debtUsd) + '</div></div><div class="kpi"><div class="kpi-label">Abonos Registrados</div><div class="kpi-val">' + ERP.fmtUsd(totalCollectedUsd) + '</div><div class="kpi-sub">' + ERP.fmtBs(totalCollectedUsd) + '</div></div><div class="kpi"><div class="kpi-label">Cobertura / Recuperación</div><div class="kpi-val">' + recoveryPct.toFixed(1) + '%</div><div class="kpi-sub">Sobre cartera gestionada</div></div><div class="kpi"><div class="kpi-label">Clientes con Deuda</div><div class="kpi-val">' + ERP.getClients().filter(function (c) { return Number(state.clientBalanceUsd[c.id] || 0) > 0; }).length + ' / ' + ERP.getClients().length + '</div></div></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Saldo Pendiente</th><th>% de Cartera</th><th>Estatus</th></tr></thead><tbody>' + estCobRows + '</tbody></table></div>';

    var bodyByMode = {
      global: globalBody, detallado: detalladoBody, est_ventas: estVentasBody,
      clientes_rep: clientesRepBody, despachos_rep: despachosRepBody, cobranza_pagos: cobranzaPagosBody,
      proveedores_rep: proveedoresRepBody, est_cobranza: estCobranzaBody
    };

    var btnsHtml = repTabs.map(function (rt) {
      return '<button type="button" class="sm ' + (mode === rt.id ? "primary" : "") + '" data-rep-mode="' + rt.id + '">' + ERP.esc(rt.label) + '</button>';
    }).join("");

    root.innerHTML =
      '<div class="card">' +
        '<div class="card-header"><div><h2 class="card-title">Reportes — ' + ERP.esc(modeTitles[mode] || "Reporte Global") + '</h2><p class="muted">Seleccione el reporte operativo o estadístico para analizar ventas, clientes, despachos, cobranza, pagos y proveedores.</p></div><div style="display:flex;gap:6px;flex-wrap:wrap;" class="no-print">' + btnsHtml + '<button type="button" class="sm" onclick="window.print()">Imprimir</button></div></div>' +
        (bodyByMode[mode] || globalBody) +
      '</div>';

    var modeBtns = root.querySelectorAll("button[data-rep-mode]");
    for (var i = 0; i < modeBtns.length; i++) {
      modeBtns[i].onclick = function () { state.reportMode = this.getAttribute("data-rep-mode"); ERP.saveState(); ERP.render(); };
    }
  }

  ERP.registerMenuModule("reportes", renderReportesView);
})();