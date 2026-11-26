(function () {
  "use strict";

  var ERP = window.DistriFoodERP;
  if (!ERP) return;

  function openSingleInvoiceModal(invId) {
    var state = ERP.state;
    var inv = state.invoices.filter(function (x) { return x.id === invId; })[0];
    if (!inv) return;
    var cl = ERP.getClient(inv.clientId);
    var rows = (inv.items || []).map(function (it) {
      var s = ERP.getSku(it.sku);
      var sub = Number(it.qty || 0) * Number(it.unitPriceUsd || 0);
      return '<tr><td><strong>' + ERP.esc(it.sku) + '</strong></td><td>' + ERP.esc(s.name) + '</td><td><strong>' + Number(it.qty || 0) + '</strong></td><td>' + ERP.fmtUsd(it.unitPriceUsd) + '</td><td><strong>' + ERP.fmtUsd(sub) + '</strong> <span class="muted">(' + ERP.fmtBs(sub) + ')</span></td></tr>';
    }).join("");

    ERP.openModal(
      '<div class="card-header"><div><h3 class="card-title">Factura ' + ERP.esc(inv.id) + ' — Sin Transporte Asignado</h3><p class="muted">Fecha: ' + ERP.esc(inv.date) + ' · Vendedor: ' + ERP.esc(inv.sellerName) + ' · Estado: ' + ERP.esc(inv.status) + '</p></div><button type="button" class="sm" onclick="closeModal()">Cerrar</button></div>' +
      '<div class="grid-2" style="margin-bottom:12px;"><div class="kpi"><div class="kpi-label">Cliente</div><div style="font-size:15px;font-weight:700;margin-top:4px;">' + ERP.esc(cl.name) + '</div><div class="kpi-sub">RIF: ' + ERP.esc(cl.rif || "—") + ' · Tipo: ' + ERP.esc(cl.clientType || "Normal") + '</div></div><div class="kpi"><div class="kpi-label">Ruta y Dirección</div><div style="font-size:14px;font-weight:700;margin-top:4px;">' + ERP.esc(cl.zone || "—") + '</div><div class="kpi-sub">' + ERP.esc(cl.address || "—") + '</div></div></div>' +
      '<div class="table-wrap"><table><thead><tr><th>SKU</th><th>Producto</th><th>Cant.</th><th>Precio Unit.</th><th>Subtotal</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="muted">Sin líneas.</td></tr>') + '</tbody></table></div>' +
      '<div class="nota-marginal" style="margin-top:12px;">' + ERP.esc(inv.marginalNote || "Sin nota marginal.") + '</div>' +
      '<div class="kpi" style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;"><span class="kpi-label">Total Factura</span><strong>' + ERP.fmtUsd(inv.totalUsd) + ' · ' + ERP.fmtBs(inv.totalUsd) + '</strong></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;" class="no-print"><button type="button" class="primary sm" onclick="window.print()">Imprimir Factura</button></div>'
    );
  }

  function openConsModal(consId) {
    var state = ERP.state;
    var cons = state.consolidations.filter(function (c) { return c.id === consId; })[0];
    if (!cons) return;
    var invIds = cons.invoiceIds || [];
    var live = ERP.calcConsSkuTotals(invIds);
    var totalClients = ERP.countUniqueClientsForInvoices(invIds);

    var rows = live.skuTotals.map(function (r) {
      return '<tr><td><strong>' + ERP.esc(r.sku) + '</strong></td><td>' + ERP.esc(r.name) + '</td><td><strong>' + r.qty + '</strong></td><td>' + Number(r.weightKg).toFixed(2) + ' kg</td><td><strong>' + ERP.fmtUsd(r.totalUsd) + '</strong> (' + ERP.fmtBs(r.totalUsd) + ')</td></tr>';
    }).join("");

    var invDetailRows = invIds.map(function (id) {
      var inv = state.invoices.filter(function (x) { return x.id === id; })[0];
      if (!inv) return '<tr><td><strong>' + ERP.esc(id) + '</strong></td><td colspan="4" class="muted">Factura no encontrada en registro activo</td></tr>';
      var cl = ERP.getClient(inv.clientId);
      var itemsTxt = (inv.items || []).map(function (it) { return it.qty + "x " + it.sku; }).join(", ");
      return '<tr><td><strong>' + ERP.esc(inv.id) + '</strong><div class="muted">' + ERP.esc(inv.date) + '</div></td><td><strong>' + ERP.esc(cl.name) + '</strong><div class="muted">' + ERP.esc(cl.zone || "—") + '</div></td><td>' + ERP.esc(itemsTxt) + '</td><td><span class="badge b-info">' + ERP.esc(inv.status) + '</span></td><td><strong>' + ERP.fmtUsd(inv.totalUsd) + '</strong></td></tr>';
    }).join("");

    ERP.openModal(
      '<div class="card-header"><div><h3 class="card-title">Reporte de Totales por SKU — ' + ERP.esc(cons.id) + '</h3><p class="muted">' + ERP.esc(cons.truck) + ' · Chofer: ' + ERP.esc(cons.driver) + ' · Ruta: ' + ERP.esc(cons.routeZone) + '</p></div><button type="button" class="sm" onclick="closeModal()">Cerrar</button></div>' +
      '<div class="grid-4" style="margin-bottom:12px;"><div class="kpi"><div class="kpi-label">Clientes a Despachar</div><div class="kpi-val">' + totalClients + '</div><div class="kpi-sub">' + invIds.length + ' factura(s)</div></div><div class="kpi"><div class="kpi-label">Unidades</div><div class="kpi-val">' + live.grandUnits + '</div></div><div class="kpi"><div class="kpi-label">Peso</div><div class="kpi-val">' + live.grandWeightKg.toFixed(2) + ' kg</div></div><div class="kpi"><div class="kpi-label">Total</div><div class="kpi-val">' + ERP.fmtUsd(live.grandUsd) + '</div></div></div>' +
      '<h4 style="margin:0 0 8px;font-size:14px;">Facturas Incluidas en la Consolidación</h4>' +
      '<div class="table-wrap" style="margin-bottom:14px;"><table><thead><tr><th>Factura</th><th>Cliente</th><th>SKUs</th><th>Estado</th><th>Monto</th></tr></thead><tbody>' + (invDetailRows || '<tr><td colspan="5" class="muted">Sin facturas.</td></tr>') + '</tbody></table></div>' +
      '<h4 style="margin:0 0 8px;font-size:14px;">Totales por SKU</h4>' +
      '<div class="table-wrap"><table><thead><tr><th>SKU</th><th>Producto</th><th>Unidades</th><th>Peso</th><th>Monto</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="muted">Sin SKUs.</td></tr>') + '</tbody></table></div>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:12px;" class="no-print"><button type="button" class="primary sm" onclick="window.print()">Imprimir / PDF</button></div>'
    );
  }

  function openEditConsModal(consId) {
    var state = ERP.state;
    var cons = state.consolidations.filter(function (c) { return c.id === consId; })[0];
    if (!cons) return;
    var usedByOthers = ERP.getConsolidatedInvoiceIdsSet(cons.id);
    var currentSet = {};
    (cons.invoiceIds || []).forEach(function (id) { currentSet[id] = true; });
    var candidates = state.invoices.filter(function (inv) { return currentSet[inv.id] || !usedByOthers[inv.id]; });

    var checksHtml = candidates.map(function (inv) {
      var checked = currentSet[inv.id] ? " checked" : "";
      return '<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;margin-bottom:6px;background:#f8fafc;"><input type="checkbox" class="edit-cons-chk" value="' + ERP.esc(inv.id) + '"' + checked + ' /><span><strong>' + ERP.esc(inv.id) + '</strong> · ' + ERP.esc(ERP.getClient(inv.clientId).name) + ' (' + ERP.fmtUsd(inv.totalUsd) + ')</span></label>';
    }).join("");

    var truckOpts = ERP.getPresets("truck").map(function (t) { return '<option value="' + ERP.esc(t) + '"' + (cons.truck === t ? " selected" : "") + '>' + ERP.esc(t) + '</option>'; }).join("");
    var driverOpts = ERP.getPresets("driver").map(function (d) { return '<option value="' + ERP.esc(d) + '"' + (cons.driver === d ? " selected" : "") + '>' + ERP.esc(d) + '</option>'; }).join("");
    var routeOpts = ERP.getPresets("route").map(function (r) { return '<option value="' + ERP.esc(r) + '"' + (cons.routeZone === r ? " selected" : "") + '>' + ERP.esc(r) + '</option>'; }).join("");

    ERP.openModal(
      '<div class="card-header"><div><h3 class="card-title">Modificar Consolidación — ' + ERP.esc(cons.id) + '</h3><p class="muted">Corrija camión, chofer, ruta o facturas asignadas.</p></div><button type="button" class="sm" onclick="closeModal()">Cerrar</button></div>' +
      '<div class="grid-2">' +
        '<div class="field"><label>Camión</label><input type="text" id="edit-cons-truck" value="' + ERP.esc(cons.truck) + '" /><div class="preset-row"><select id="edit-sel-truck">' + truckOpts + '</select><button type="button" class="primary sm" id="edit-add-truck">+</button><button type="button" class="warn sm" id="edit-mod-truck">Editar</button><button type="button" class="danger sm" id="edit-del-truck">×</button></div></div>' +
        '<div class="field"><label>Chofer</label><input type="text" id="edit-cons-driver" value="' + ERP.esc(cons.driver) + '" /><div class="preset-row"><select id="edit-sel-driver">' + driverOpts + '</select><button type="button" class="primary sm" id="edit-add-driver">+</button><button type="button" class="warn sm" id="edit-mod-driver">Editar</button><button type="button" class="danger sm" id="edit-del-driver">×</button></div></div>' +
      '</div>' +
      '<div class="field"><label>Ruta</label><input type="text" id="edit-cons-zone" value="' + ERP.esc(cons.routeZone) + '" /><div class="preset-row"><select id="edit-sel-route">' + routeOpts + '</select><button type="button" class="primary sm" id="edit-add-route">+</button><button type="button" class="warn sm" id="edit-mod-route">Editar</button><button type="button" class="danger sm" id="edit-del-route">×</button></div></div>' +
      '<div class="field"><label>Facturas en esta Consolidación</label>' + (checksHtml || '<div class="muted">No hay facturas disponibles.</div>') + '</div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;"><button type="button" class="sm" onclick="closeModal()">Cancelar</button><button type="button" class="success sm" id="btn-save-edit-cons">Guardar Cambios</button></div>'
    );

    document.getElementById("edit-sel-truck").onchange = function () { document.getElementById("edit-cons-truck").value = this.value; };
    document.getElementById("edit-sel-driver").onchange = function () { document.getElementById("edit-cons-driver").value = this.value; };
    document.getElementById("edit-sel-route").onchange = function () { document.getElementById("edit-cons-zone").value = this.value; };

    document.getElementById("edit-add-truck").onclick = function () { ERP.openAddPresetModal("truck", function (saved) { cons.truck = saved; openEditConsModal(cons.id); }); };
    document.getElementById("edit-add-driver").onclick = function () { ERP.openAddPresetModal("driver", function (saved) { cons.driver = saved; openEditConsModal(cons.id); }); };
    document.getElementById("edit-add-route").onclick = function () { ERP.openAddPresetModal("route", function (saved) { cons.routeZone = saved; openEditConsModal(cons.id); }); };

    document.getElementById("edit-mod-truck").onclick = function () { ERP.openEditPresetModal("truck", document.getElementById("edit-sel-truck").value, function (updated) { cons.truck = updated; openEditConsModal(cons.id); }); };
    document.getElementById("edit-mod-driver").onclick = function () { ERP.openEditPresetModal("driver", document.getElementById("edit-sel-driver").value, function (updated) { cons.driver = updated; openEditConsModal(cons.id); }); };
    document.getElementById("edit-mod-route").onclick = function () { ERP.openEditPresetModal("route", document.getElementById("edit-sel-route").value, function (updated) { cons.routeZone = updated; openEditConsModal(cons.id); }); };

    document.getElementById("edit-del-truck").onclick = function () { ERP.handleDeletePreset("truck", document.getElementById("edit-sel-truck").value, function (nextVal) { cons.truck = nextVal; openEditConsModal(cons.id); }); };
    document.getElementById("edit-del-driver").onclick = function () { ERP.handleDeletePreset("driver", document.getElementById("edit-sel-driver").value, function (nextVal) { cons.driver = nextVal; openEditConsModal(cons.id); }); };
    document.getElementById("edit-del-route").onclick = function () { ERP.handleDeletePreset("route", document.getElementById("edit-sel-route").value, function (nextVal) { cons.routeZone = nextVal; openEditConsModal(cons.id); }); };

    document.getElementById("btn-save-edit-cons").onclick = function () {
      var selIds = [];
      var boxes = document.querySelectorAll("input.edit-cons-chk:checked");
      for (var i = 0; i < boxes.length; i++) selIds.push(boxes[i].value);
      if (!selIds.length) { ERP.setNotice("bad", "La consolidación debe tener al menos una factura."); ERP.closeModal(); ERP.render(); return; }
      var live = ERP.calcConsSkuTotals(selIds);
      cons.truck = ERP.addPresetValue("truck", document.getElementById("edit-cons-truck").value.trim() || cons.truck);
      cons.driver = ERP.addPresetValue("driver", document.getElementById("edit-cons-driver").value.trim() || cons.driver);
      cons.routeZone = ERP.addPresetValue("route", document.getElementById("edit-cons-zone").value.trim() || cons.routeZone);
      cons.invoiceIds = selIds;
      cons.skuTotals = live.skuTotals;
      cons.grandUnits = live.grandUnits;
      cons.grandWeightKg = live.grandWeightKg;
      cons.grandUsd = live.grandUsd;
      ERP.closeModal();
      ERP.setNotice("ok", "Consolidación " + cons.id + " actualizada correctamente.");
      ERP.saveState();
      ERP.render();
    };
  }

  function renderConsolidadoView(root) {
    var state = ERP.state;
    var usedSet = ERP.getConsolidatedInvoiceIdsSet();
    var availableInvoices = state.invoices.filter(function (inv) { return !usedSet[inv.id]; });
    var trucks = ERP.getPresets("truck");
    var drivers = ERP.getPresets("driver");
    var routes = ERP.getPresets("route");

    var curTruck = (state.draftConsTruck && trucks.indexOf(state.draftConsTruck) !== -1) ? state.draftConsTruck : (trucks[0] || "");
    var curDriver = (state.draftConsDriver && drivers.indexOf(state.draftConsDriver) !== -1) ? state.draftConsDriver : (drivers[0] || "");
    var curRoute = (state.draftConsRoute && routes.indexOf(state.draftConsRoute) !== -1) ? state.draftConsRoute : (routes[0] || "");

    var truckOpts = trucks.map(function (t) { return '<option value="' + ERP.esc(t) + '"' + (curTruck === t ? " selected" : "") + '>' + ERP.esc(t) + '</option>'; }).join("");
    var driverOpts = drivers.map(function (d) { return '<option value="' + ERP.esc(d) + '"' + (curDriver === d ? " selected" : "") + '>' + ERP.esc(d) + '</option>'; }).join("");
    var routeOpts = routes.map(function (r) { return '<option value="' + ERP.esc(r) + '"' + (curRoute === r ? " selected" : "") + '>' + ERP.esc(r) + '</option>'; }).join("");

    var checks = availableInvoices.map(function (inv) {
      return (
        '<div class="avail-inv-item">' +
          '<label class="avail-inv-check"><input type="checkbox" class="cons-chk" value="' + ERP.esc(inv.id) + '" checked /><span><strong>' + ERP.esc(inv.id) + '</strong> · ' + ERP.esc(ERP.getClient(inv.clientId).name) + ' (' + ERP.fmtUsd(inv.totalUsd) + ') <span class="badge b-warn">Sin transporte</span></span></label>' +
          '<button type="button" class="sm" data-view-inv="' + ERP.esc(inv.id) + '">Ver / Imprimir</button>' +
        '</div>'
      );
    }).join("");

    var listHtml = state.consolidations.map(function (cons) {
      var live = ERP.calcConsSkuTotals(cons.invoiceIds || []);
      var rows = live.skuTotals.map(function (r) {
        return '<tr><td><strong>' + ERP.esc(r.sku) + '</strong></td><td>' + ERP.esc(r.name) + '</td><td><strong>' + r.qty + '</strong></td><td>' + Number(r.weightKg).toFixed(2) + ' kg</td><td>' + ERP.fmtUsd(r.totalUsd) + '</td></tr>';
      }).join("");
      return (
        '<div class="card">' +
          '<div class="card-header">' +
            '<div><h3 class="card-title">' + ERP.esc(cons.id) + ' — ' + ERP.esc(cons.truck) + '</h3><p class="muted">Chofer: ' + ERP.esc(cons.driver) + ' · Ruta: ' + ERP.esc(cons.routeZone) + ' · Facturas consolidadas: ' + ERP.esc((cons.invoiceIds || []).join(", ")) + '</p></div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="primary sm" data-rep="' + ERP.esc(cons.id) + '">Emitir Reporte SKU</button><button type="button" class="warn sm" data-edit-cons="' + ERP.esc(cons.id) + '">Modificar</button><button type="button" class="danger sm" data-del-cons="' + ERP.esc(cons.id) + '">Eliminar</button></div>' +
          '</div>' +
          '<div class="grid-3" style="margin-bottom:12px;"><div class="kpi"><div class="kpi-label">Unidades SKU</div><div class="kpi-val">' + live.grandUnits + '</div></div><div class="kpi"><div class="kpi-label">Peso Carga</div><div class="kpi-val">' + live.grandWeightKg.toFixed(2) + ' kg</div></div><div class="kpi"><div class="kpi-label">Total Carga</div><div class="kpi-val">' + ERP.fmtUsd(live.grandUsd) + '</div></div></div>' +
          '<div class="table-wrap"><table><thead><tr><th>SKU</th><th>Producto</th><th>Total a Despachar</th><th>Peso</th><th>Subtotal</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="muted">Sin SKUs.</td></tr>') + '</tbody></table></div>' +
        '</div>'
      );
    }).join("");

    root.innerHTML =
      '<div class="card">' +
        '<div class="card-header"><h2 class="card-title">Consolidación de Carga con Reporte por SKU</h2><span class="badge b-info">' + availableInvoices.length + ' facturas disponibles</span></div>' +
        '<div class="grid-2">' +
          '<div>' +
            '<div class="grid-2">' +
              '<div class="field"><label>Camión</label><input type="text" id="cons-truck" value="' + ERP.esc(curTruck) + '" /><div class="preset-row"><select id="cons-sel-truck">' + truckOpts + '</select><button type="button" class="primary sm" id="cons-add-truck">+</button><button type="button" class="warn sm" id="cons-mod-truck">Editar</button><button type="button" class="danger sm" id="cons-del-truck">×</button></div></div>' +
              '<div class="field"><label>Chofer</label><input type="text" id="cons-driver" value="' + ERP.esc(curDriver) + '" /><div class="preset-row"><select id="cons-sel-driver">' + driverOpts + '</select><button type="button" class="primary sm" id="cons-add-driver">+</button><button type="button" class="warn sm" id="cons-mod-driver">Editar</button><button type="button" class="danger sm" id="cons-del-driver">×</button></div></div>' +
            '</div>' +
            '<div class="field"><label>Ruta</label><input type="text" id="cons-zone" value="' + ERP.esc(curRoute) + '" /><div class="preset-row"><select id="cons-sel-route">' + routeOpts + '</select><button type="button" class="primary sm" id="cons-add-route">+</button><button type="button" class="warn sm" id="cons-mod-route">Editar</button><button type="button" class="danger sm" id="cons-del-route">×</button></div></div>' +
            '<button type="button" class="success" id="btn-gen-cons" ' + (availableInvoices.length ? '' : 'disabled') + '>Generar Consolidación y Retirar Facturas</button>' +
          '</div>' +
          '<div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px;">Facturas Disponibles (sin transporte asignado)</label>' + (checks || '<div class="notice notice-info">Todas las facturas ya fueron consolidadas. Emita una nueva factura en Ventas para consolidar más carga.</div>') + '</div>' +
        '</div>' +
      '</div>' + listHtml;

    var viewInvBtns = root.querySelectorAll("button[data-view-inv]");
    for (var vi = 0; vi < viewInvBtns.length; vi++) { viewInvBtns[vi].onclick = function () { openSingleInvoiceModal(this.getAttribute("data-view-inv")); }; }

    document.getElementById("cons-sel-truck").onchange = function () { state.draftConsTruck = this.value; document.getElementById("cons-truck").value = this.value; ERP.saveState(); };
    document.getElementById("cons-sel-driver").onchange = function () { state.draftConsDriver = this.value; document.getElementById("cons-driver").value = this.value; ERP.saveState(); };
    document.getElementById("cons-sel-route").onchange = function () { state.draftConsRoute = this.value; document.getElementById("cons-zone").value = this.value; ERP.saveState(); };
    document.getElementById("cons-truck").oninput = function () { state.draftConsTruck = this.value; ERP.saveState(); };
    document.getElementById("cons-driver").oninput = function () { state.draftConsDriver = this.value; ERP.saveState(); };
    document.getElementById("cons-zone").oninput = function () { state.draftConsRoute = this.value; ERP.saveState(); };

    document.getElementById("cons-add-truck").onclick = function () { ERP.openAddPresetModal("truck", function (saved) { state.draftConsTruck = saved; ERP.saveState(); ERP.render(); }); };
    document.getElementById("cons-add-driver").onclick = function () { ERP.openAddPresetModal("driver", function (saved) { state.draftConsDriver = saved; ERP.saveState(); ERP.render(); }); };
    document.getElementById("cons-add-route").onclick = function () { ERP.openAddPresetModal("route", function (saved) { state.draftConsRoute = saved; ERP.saveState(); ERP.render(); }); };

    document.getElementById("cons-mod-truck").onclick = function () { ERP.openEditPresetModal("truck", document.getElementById("cons-sel-truck").value, function (updated) { state.draftConsTruck = updated; ERP.saveState(); ERP.render(); }); };
    document.getElementById("cons-mod-driver").onclick = function () { ERP.openEditPresetModal("driver", document.getElementById("cons-sel-driver").value, function (updated) { state.draftConsDriver = updated; ERP.saveState(); ERP.render(); }); };
    document.getElementById("cons-mod-route").onclick = function () { ERP.openEditPresetModal("route", document.getElementById("cons-sel-route").value, function (updated) { state.draftConsRoute = updated; ERP.saveState(); ERP.render(); }); };

    document.getElementById("cons-del-truck").onclick = function () { ERP.handleDeletePreset("truck", document.getElementById("cons-sel-truck").value, function (nextVal) { state.draftConsTruck = nextVal; ERP.saveState(); ERP.render(); }); };
    document.getElementById("cons-del-driver").onclick = function () { ERP.handleDeletePreset("driver", document.getElementById("cons-sel-driver").value, function (nextVal) { state.draftConsDriver = nextVal; ERP.saveState(); ERP.render(); }); };
    document.getElementById("cons-del-route").onclick = function () { ERP.handleDeletePreset("route", document.getElementById("cons-sel-route").value, function (nextVal) { state.draftConsRoute = nextVal; ERP.saveState(); ERP.render(); }); };

    var btnGen = document.getElementById("btn-gen-cons");
    if (btnGen) {
      btnGen.onclick = function () {
        var ids = [];
        var boxes = root.querySelectorAll("input.cons-chk:checked");
        for (var i = 0; i < boxes.length; i++) ids.push(boxes[i].value);
        if (!ids.length) { ERP.setNotice("bad", "Seleccione al menos una factura disponible."); ERP.render(); return; }
        var live = ERP.calcConsSkuTotals(ids);
        var truckFinal = ERP.addPresetValue("truck", document.getElementById("cons-truck").value.trim() || "Camión");
        var driverFinal = ERP.addPresetValue("driver", document.getElementById("cons-driver").value.trim() || "Chofer");
        var routeFinal = ERP.addPresetValue("route", document.getElementById("cons-zone").value.trim() || "Ruta");
        state.draftConsTruck = truckFinal; state.draftConsDriver = driverFinal; state.draftConsRoute = routeFinal;
        var id = "CONS-" + new Date().toISOString().slice(0, 10) + "-" + (state.consolidations.length + 1);
        state.consolidations.unshift({
          id: id, date: new Date().toISOString().slice(0, 10), truck: truckFinal, driver: driverFinal, routeZone: routeFinal,
          invoiceIds: ids, skuTotals: live.skuTotals, grandUnits: live.grandUnits, grandWeightKg: live.grandWeightKg, grandUsd: live.grandUsd
        });
        ERP.setNotice("ok", "Consolidación " + id + " generada. Las facturas (" + ids.join(", ") + ") se retiraron de disponibles.");
        ERP.saveState();
        ERP.render();
      };
    }

    var repBtns = root.querySelectorAll("button[data-rep]");
    for (var r = 0; r < repBtns.length; r++) repBtns[r].onclick = function () { openConsModal(this.getAttribute("data-rep")); };
    var editBtns = root.querySelectorAll("button[data-edit-cons]");
    for (var eb = 0; eb < editBtns.length; eb++) editBtns[eb].onclick = function () { openEditConsModal(this.getAttribute("data-edit-cons")); };
    var delConsBtns = root.querySelectorAll("button[data-del-cons]");
    for (var dc = 0; dc < delConsBtns.length; dc++) {
      delConsBtns[dc].onclick = function () {
        var targetId = this.getAttribute("data-del-cons");
        var idx = -1;
        for (var k = 0; k < state.consolidations.length; k++) { if (state.consolidations[k].id === targetId) { idx = k; break; } }
        if (idx === -1) return;
        var removed = state.consolidations[idx];
        state.consolidations.splice(idx, 1);
        ERP.setNotice("ok", "Consolidación " + removed.id + " eliminada. Sus facturas (" + (removed.invoiceIds || []).join(", ") + ") volvieron a estar disponibles.");
        ERP.saveState();
        ERP.render();
      };
    }
  }

  ERP.registerMenuModule("consolidado", renderConsolidadoView);
})();