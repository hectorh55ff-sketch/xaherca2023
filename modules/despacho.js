(function () {
  "use strict";

  var ERP = window.DistriFoodERP;
  if (!ERP) return;

  function getInvoiceTransport(inv, state) {
    if (!inv) return "";
    if (inv.truck || inv.transport || inv.vehicle) {
      return String(inv.truck || inv.transport || inv.vehicle).trim();
    }
    var consList = Array.isArray(state.consolidations) ? state.consolidations : [];
    for (var i = 0; i < consList.length; i++) {
      var c = consList[i];
      var ids = Array.isArray(c.invoiceIds) ? c.invoiceIds : [];
      if (ids.indexOf(inv.id) !== -1 && c.truck) {
        return String(c.truck).trim();
      }
    }
    return "";
  }

  function getInvoiceSeller(inv) {
    if (!inv) return "Sin vendedor";
    return String(inv.sellerName || inv.billedBy || inv.vendor || inv.deletedBy || "Sin vendedor").trim();
  }

  function getInvoiceDate(inv, mode) {
    if (!inv) return "";
    if (mode === "delivered") {
      return String(inv.deliveredDate || inv.date || "").slice(0, 10);
    }
    if (mode === "deleted") {
      return String(inv.deletedAt || inv.date || "").slice(0, 10);
    }
    return String(inv.date || inv.deliveredDate || "").slice(0, 10);
  }

  function buildFilterOptions(list, state, mode) {
    var sellerMap = {};
    var zoneMap = {};
    var transportMap = {};

    for (var i = 0; i < list.length; i++) {
      var inv = list[i];
      var cl = ERP.getClient(inv.clientId) || {};
      var slr = getInvoiceSeller(inv);
      var zn = String(cl.zone || inv.zone || "").trim();
      var tr = getInvoiceTransport(inv, state);
      if (slr) sellerMap[slr] = true;
      if (zn) zoneMap[zn] = true;
      if (tr) transportMap[tr] = true;
    }

    return {
      sellers: Object.keys(sellerMap),
      zones: Object.keys(zoneMap),
      transports: Object.keys(transportMap)
    };
  }

  function filterInvoicesList(list, cfg, state, mode) {
    var q = String(cfg.search || "").trim().toLowerCase();
    var from = String(cfg.dateFrom || "");
    var to = String(cfg.dateTo || "");
    var seller = String(cfg.seller || "ALL");
    var zone = String(cfg.zone || "ALL");
    var transport = String(cfg.transport || "ALL");

    return list.filter(function (inv) {
      var cl = ERP.getClient(inv.clientId) || {};
      var d = getInvoiceDate(inv, mode);
      var slr = getInvoiceSeller(inv);
      var zn = String(cl.zone || inv.zone || "").trim();
      var tr = getInvoiceTransport(inv, state);

      if (from && (!d || d < from)) return false;
      if (to && (!d || d > to)) return false;
      if (seller !== "ALL" && slr !== seller) return false;
      if (zone !== "ALL" && zn !== zone) return false;
      if (transport !== "ALL" && tr !== transport) return false;

      if (!q) return true;
      var hay = (
        String(inv.id || "") + " " +
        String(cl.name || "") + " " +
        String(cl.rif || "") + " " +
        slr + " " +
        zn + " " +
        tr + " " +
        String(inv.reason || "") + " " +
        String(inv.marginalNote || "")
      ).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function buildFilterBarHtml(prefix, cfg, opts) {
    var sellerOpts = '<option value="ALL">Todos los vendedores</option>' +
      opts.sellers.map(function (k) {
        return '<option value="' + ERP.esc(k) + '"' + (cfg.seller === k ? " selected" : "") + '>' + ERP.esc(k) + '</option>';
      }).join("");

    var zoneOpts = '<option value="ALL">Todas las zonas</option>' +
      opts.zones.map(function (k) {
        return '<option value="' + ERP.esc(k) + '"' + (cfg.zone === k ? " selected" : "") + '>' + ERP.esc(k) + '</option>';
      }).join("");

    var transportOpts = '<option value="ALL">Todos los transportes</option>' +
      opts.transports.map(function (k) {
        return '<option value="' + ERP.esc(k) + '"' + (cfg.transport === k ? " selected" : "") + '>' + ERP.esc(k) + '</option>';
      }).join("");

    return (
      '<div class="filter-bar">' +
        '<div class="grid-4">' +
          '<div class="field" style="margin-bottom:0;"><label>Desde</label><input type="date" id="' + prefix + '-date-from" value="' + ERP.esc(cfg.dateFrom || "") + '" /></div>' +
          '<div class="field" style="margin-bottom:0;"><label>Hasta</label><input type="date" id="' + prefix + '-date-to" value="' + ERP.esc(cfg.dateTo || "") + '" /></div>' +
          '<div class="field" style="margin-bottom:0;"><label>Vendedor</label><select id="' + prefix + '-flt-seller">' + sellerOpts + '</select></div>' +
          '<div class="field" style="margin-bottom:0;"><label>Zona</label><select id="' + prefix + '-flt-zone">' + zoneOpts + '</select></div>' +
        '</div>' +
        '<div class="grid-2" style="margin-top:10px;align-items:end;">' +
          '<div class="field" style="margin-bottom:0;"><label>Transporte</label><select id="' + prefix + '-flt-transport">' + transportOpts + '</select></div>' +
          '<div style="display:flex;justify-content:flex-end;"><button type="button" class="sm" id="' + prefix + '-btn-clear">Limpiar Filtros</button></div>' +
        '</div>' +
      '</div>'
    );
  }

  function openInvoicePrintModal(inv, kind, state) {
    var cl = ERP.getClient(inv.clientId) || {};
    var comp = typeof ERP.getCompany === "function" ? ERP.getCompany() : {};
    var slr = getInvoiceSeller(inv);
    var zn = String(cl.zone || inv.zone || "—");
    var tr = getInvoiceTransport(inv, state) || "—";
    var dateTxt = getInvoiceDate(inv, kind) || "—";
    var statusTxt = kind === "deleted" ? "Eliminada (No Recepción)" : String(inv.status || "En Despacho");

    var itemRows = (inv.items || []).map(function (it) {
      var skuObj = typeof ERP.getSku === "function" ? ERP.getSku(it.sku) : {};
      var q = Number(it.qty || 0);
      var pu = Number(it.unitPriceUsd || skuObj.priceUsd || 0);
      var sub = Number((q * pu).toFixed(2));
      return (
        '<tr>' +
          '<td><strong>' + ERP.esc(it.sku) + '</strong></td>' +
          '<td>' + ERP.esc(skuObj.name || it.sku) + '</td>' +
          '<td>' + q + '</td>' +
          '<td>' + ERP.fmtUsd(pu) + '</td>' +
          '<td><strong>' + ERP.fmtUsd(sub) + '</strong></td>' +
        '</tr>'
      );
    }).join("");

    var extraHtml = "";
    if (kind === "deleted" && inv.reason) {
      extraHtml += '<div class="nota-marginal"><strong>Motivo de No Recepción:</strong> ' + ERP.esc(inv.reason) + '</div>';
    }
    if (inv.marginalNote) {
      extraHtml += '<div class="nota-marginal">' + ERP.esc(inv.marginalNote) + '</div>';
    }
    if (Array.isArray(inv.returnsLog) && inv.returnsLog.length) {
      extraHtml += '<div class="nota-marginal"><strong>Devoluciones:</strong> ' +
        inv.returnsLog.map(function (rl) {
          return rl.qty + "x " + rl.sku + " (" + rl.disposition + " · " + ERP.fmtUsd(rl.creditUsd) + ")";
        }).join(" | ") + '</div>';
    }

    ERP.openModal(
      '<div id="print-invoice-sheet">' +
        '<div class="card-header">' +
          '<div>' +
            '<h3 class="card-title">' + ERP.esc(comp.name || "DistriFood ERP") + ' — Factura ' + ERP.esc(inv.id) + '</h3>' +
            '<p class="muted">' + (comp.rif ? "RIF: " + ERP.esc(comp.rif) + " · " : "") + 'Fecha: ' + ERP.esc(dateTxt) + ' · Estatus: ' + ERP.esc(statusTxt) + '</p>' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button type="button" class="primary sm" id="btn-print-invoice-now">Imprimir</button>' +
            '<button type="button" class="sm" onclick="closeModal()">Cerrar</button>' +
          '</div>' +
        '</div>' +
        '<div class="grid-2" style="margin-bottom:12px;">' +
          '<div class="kpi">' +
            '<div class="kpi-label">Cliente</div>' +
            '<div style="font-weight:700;margin-top:4px;">' + ERP.esc(cl.name || "Cliente") + '</div>' +
            '<div class="muted">' + (cl.rif ? "RIF: " + ERP.esc(cl.rif) + " · " : "") + ERP.esc(cl.clientType || "Normal") + '</div>' +
            '<div class="muted">Zona: ' + ERP.esc(zn) + '</div>' +
          '</div>' +
          '<div class="kpi">' +
            '<div class="kpi-label">Despacho y Venta</div>' +
            '<div style="font-weight:700;margin-top:4px;">Vendedor: ' + ERP.esc(slr) + '</div>' +
            '<div class="muted">Transporte: ' + ERP.esc(tr) + '</div>' +
            '<div class="muted">Total: <strong>' + ERP.fmtUsd(inv.totalUsd) + '</strong> (' + ERP.fmtBs(inv.totalUsd) + ')</div>' +
          '</div>' +
        '</div>' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr><th>SKU</th><th>Producto</th><th>Cant.</th><th>Precio Unit.</th><th>Subtotal</th></tr></thead>' +
            '<tbody>' + (itemRows || '<tr><td colspan="5" class="muted">Sin detalle de productos registrado.</td></tr>') + '</tbody>' +
          '</table>' +
        '</div>' +
        extraHtml +
      '</div>'
    );

    var printBtn = document.getElementById("btn-print-invoice-now");
    if (printBtn) {
      printBtn.onclick = function () {
        window.print();
      };
    }
  }

  function openChangeStatusModal(inv) {
    var statuses = ["En Despacho", "Entregada", "Devolución Parcial", "Devuelta Total"];
    var currentStatus = String(inv.status || "En Despacho");
    var isCustom = statuses.indexOf(currentStatus) === -1;

    var optsHtml = statuses.map(function (st) {
      return '<option value="' + ERP.esc(st) + '"' + (currentStatus === st ? " selected" : "") + '>' + ERP.esc(st) + '</option>';
    }).join("") +
      '<option value="__CUSTOM__"' + (isCustom ? " selected" : "") + '>Otro estatus personalizado...</option>';

    ERP.openModal(
      '<div class="card-header">' +
        '<div><h3 class="card-title">Modificar Estatus — ' + ERP.esc(inv.id) + '</h3><p class="muted">Corrija el estado de la factura si se marcó por error o cambió en ruta.</p></div>' +
        '<button type="button" class="sm" onclick="closeModal()">Cerrar</button>' +
      '</div>' +
      '<div class="field">' +
        '<label>Nuevo Estatus</label>' +
        '<select id="modal-inv-status">' + optsHtml + '</select>' +
      '</div>' +
      '<div class="field" id="modal-custom-status-wrap" style="' + (isCustom ? "" : "display:none;") + '">' +
        '<label>Estatus Personalizado</label>' +
        '<input type="text" id="modal-inv-status-custom" value="' + ERP.esc(isCustom ? currentStatus : "") + '" placeholder="Ej. Reprogramada / En Ruta" />' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">' +
        '<button type="button" class="sm" onclick="closeModal()">Cancelar</button>' +
        '<button type="button" class="success sm" id="btn-save-inv-status">Guardar Estatus</button>' +
      '</div>'
    );

    var selEl = document.getElementById("modal-inv-status");
    var customWrap = document.getElementById("modal-custom-status-wrap");
    var customInp = document.getElementById("modal-inv-status-custom");

    if (selEl && customWrap) {
      selEl.onchange = function () {
        customWrap.style.display = this.value === "__CUSTOM__" ? "" : "none";
        if (this.value === "__CUSTOM__" && customInp) customInp.focus();
      };
    }

    document.getElementById("btn-save-inv-status").onclick = function () {
      var chosen = selEl ? selEl.value : currentStatus;
      var finalStatus = chosen === "__CUSTOM__"
        ? ((customInp && customInp.value) || "").trim()
        : chosen;

      if (!finalStatus) {
        ERP.setNotice("bad", "Debe indicar un estatus válido para " + inv.id + ".");
        ERP.closeModal();
        ERP.render();
        return;
      }

      inv.status = finalStatus;
      if (finalStatus === "Entregada" && !inv.deliveredDate) {
        inv.deliveredDate = new Date().toISOString().slice(0, 10);
      }

      ERP.closeModal();
      ERP.setNotice("ok", "Estatus de " + inv.id + " actualizado a '" + finalStatus + "'.");
      ERP.saveState();
      ERP.render();
    };
  }

  function bindSectionFilterEvents(root, prefix, cfg, state) {
    var elSearch = document.getElementById(prefix + "-search");
    if (elSearch) {
      elSearch.oninput = function () {
        cfg.search = this.value;
        ERP.saveState();
        ERP.render();
      };
    }
    var elFrom = document.getElementById(prefix + "-date-from");
    if (elFrom) {
      elFrom.onchange = function () {
        cfg.dateFrom = this.value;
        ERP.saveState();
        ERP.render();
      };
    }
    var elTo = document.getElementById(prefix + "-date-to");
    if (elTo) {
      elTo.onchange = function () {
        cfg.dateTo = this.value;
        ERP.saveState();
        ERP.render();
      };
    }
    var elSeller = document.getElementById(prefix + "-flt-seller");
    if (elSeller) {
      elSeller.onchange = function () {
        cfg.seller = this.value;
        ERP.saveState();
        ERP.render();
      };
    }
    var elZone = document.getElementById(prefix + "-flt-zone");
    if (elZone) {
      elZone.onchange = function () {
        cfg.zone = this.value;
        ERP.saveState();
        ERP.render();
      };
    }
    var elTransport = document.getElementById(prefix + "-flt-transport");
    if (elTransport) {
      elTransport.onchange = function () {
        cfg.transport = this.value;
        ERP.saveState();
        ERP.render();
      };
    }
    var btnClear = document.getElementById(prefix + "-btn-clear");
    if (btnClear) {
      btnClear.onclick = function () {
        cfg.search = "";
        cfg.dateFrom = "";
        cfg.dateTo = "";
        cfg.seller = "ALL";
        cfg.zone = "ALL";
        cfg.transport = "ALL";
        if (prefix === "deliv") state.deliveredInvSearch = "";
        ERP.saveState();
        ERP.render();
      };
    }
  }

  function renderDespachoView(root) {
    var state = ERP.state;
    var invoices = Array.isArray(state.invoices) ? state.invoices : [];
    state.deletedInvoices = Array.isArray(state.deletedInvoices) ? state.deletedInvoices : [];

    if (!state.pendingFilterCfg || typeof state.pendingFilterCfg !== "object") {
      state.pendingFilterCfg = { search: "", dateFrom: "", dateTo: "", seller: "ALL", zone: "ALL", transport: "ALL" };
    }
    if (!state.deliveredFilterCfg || typeof state.deliveredFilterCfg !== "object") {
      state.deliveredFilterCfg = {
        search: state.deliveredInvSearch || "",
        dateFrom: state.deliveredDateFrom || "",
        dateTo: state.deliveredDateTo || "",
        seller: state.deliveredSellerFilter || "ALL",
        zone: state.deliveredZoneFilter || "ALL",
        transport: state.deliveredTransportFilter || "ALL"
      };
    }
    if (!state.deletedFilterCfg || typeof state.deletedFilterCfg !== "object") {
      state.deletedFilterCfg = { search: "", dateFrom: "", dateTo: "", seller: "ALL", zone: "ALL", transport: "ALL" };
    }

    var pCfg = state.pendingFilterCfg;
    var dCfg = state.deliveredFilterCfg;
    var xCfg = state.deletedFilterCfg;

    var allPending = invoices.filter(function (inv) {
      return inv && inv.status !== "Entregada";
    });
    var allDelivered = invoices.filter(function (inv) {
      return inv && inv.status === "Entregada";
    });
    var allDeleted = state.deletedInvoices;

    var pendingInvoices = filterInvoicesList(allPending, pCfg, state, "pending");
    var deliveredInvoices = filterInvoicesList(allDelivered, dCfg, state, "delivered");
    var deletedInvoices = filterInvoicesList(allDeleted, xCfg, state, "deleted");

    var pOpts = buildFilterOptions(allPending, state, "pending");
    var dOpts = buildFilterOptions(allDelivered, state, "delivered");
    var xOpts = buildFilterOptions(allDeleted, state, "deleted");

    var invOpts = allPending.map(function (inv) {
      var cl = ERP.getClient(inv.clientId) || {};
      return '<option value="' + ERP.esc(inv.id) + '">' + ERP.esc(inv.id) + ' — ' + ERP.esc(cl.name || "Cliente") + ' (' + ERP.fmtUsd(inv.totalUsd) + ')</option>';
    }).join("");

    var firstInv = allPending[0] || null;
    var skuOpts = firstInv ? (firstInv.items || []).map(function (it) {
      return '<option value="' + ERP.esc(it.sku) + '">' + ERP.esc(it.sku) + ' (Facturado: ' + it.qty + ' · ' + ERP.fmtUsd(it.unitPriceUsd) + ')</option>';
    }).join("") : "";

    function buildInvoiceRowHtml(inv, kind) {
      var isDelivered = kind === "delivered";
      var cl = ERP.getClient(inv.clientId) || {};
      var slr = getInvoiceSeller(inv);
      var zn = String(cl.zone || inv.zone || "—");
      var tr = getInvoiceTransport(inv, state);
      var dateVal = getInvoiceDate(inv, kind) || "—";

      var det = (inv.items || []).map(function (it) {
        return "<div>• <strong>" + ERP.esc(it.sku) + "</strong>: " + it.qty + " und. @" + ERP.fmtUsd(it.unitPriceUsd) + "</div>";
      }).join("");
      var devs = (inv.returnsLog || []).map(function (rl) {
        return '<div class="badge b-warn" style="margin-top:4px;">Dev: ' + rl.qty + 'x ' + ERP.esc(rl.sku) + ' (' + ERP.esc(rl.disposition) + ')</div>';
      }).join("");
      var itemsTxt = (inv.items || []).map(function (it) {
        return it.qty + "x " + it.sku + " (" + ERP.fmtUsd(it.unitPriceUsd) + ")";
      }).join(", ");

      var stClass = isDelivered
        ? "b-ok"
        : (String(inv.status || "").indexOf("Devolución") !== -1 ? "b-warn" : "b-info");

      var metaSub = '<div class="muted">' + ERP.esc(slr) + ' · ' + ERP.esc(zn) + (tr ? ' · ' + ERP.esc(tr) : '') + '</div>';
      var printBtnHtml = '<button type="button" class="sm" data-print-inv="' + ERP.esc(inv.id) + '" data-print-kind="' + kind + '">Ver / Imprimir</button>';

      var actionHtml = isDelivered
        ? '<div style="display:flex;flex-direction:column;gap:6px;">' +
            '<button type="button" class="sm" data-change-status="' + ERP.esc(inv.id) + '">Modificar Estatus</button>' +
            printBtnHtml +
          '</div>'
        : (
          '<div style="display:flex;flex-direction:column;gap:6px;">' +
            '<button type="button" class="success sm" data-mark-delivered="' + ERP.esc(inv.id) + '">Confirmar Entrega</button>' +
            '<button type="button" class="sm" data-change-status="' + ERP.esc(inv.id) + '">Modificar Estatus</button>' +
            printBtnHtml +
            '<button type="button" class="danger sm" data-elim="' + ERP.esc(inv.id) + '">No Recibe / Eliminar Factura</button>' +
            (typeof ERP.openReturnModal === "function"
              ? '<button type="button" class="warn sm" data-open-return="' + ERP.esc(inv.id) + '">Devolución</button>'
              : '') +
          '</div>'
        );

      return (
        '<tr>' +
          '<td><strong>' + ERP.esc(inv.id) + '</strong><div class="muted">' + ERP.esc(dateVal) + '</div></td>' +
          '<td><strong>' + ERP.esc(cl.name || "Cliente") + '</strong>' + metaSub + '</td>' +
          '<td>' + (det || ERP.esc(itemsTxt || "—")) + devs + '<div class="nota-marginal">' + ERP.esc(inv.marginalNote || "") + '</div></td>' +
          '<td><strong>' + ERP.fmtUsd(inv.totalUsd) + '</strong><div class="muted">' + ERP.fmtBs(inv.totalUsd) + '</div></td>' +
          '<td><span class="badge ' + stClass + '">' + ERP.esc(inv.status || "En Despacho") + '</span></td>' +
          '<td>' + actionHtml + '</td>' +
        '</tr>'
      );
    }

    var invRows = pendingInvoices.map(function (inv) {
      return buildInvoiceRowHtml(inv, "pending");
    }).join("");

    var deliveredRows = deliveredInvoices.map(function (inv) {
      return buildInvoiceRowHtml(inv, "delivered");
    }).join("");

    var delRows = deletedInvoices.map(function (d) {
      var cl = ERP.getClient(d.clientId) || {};
      var slr = getInvoiceSeller(d);
      var zn = String(cl.zone || d.zone || "—");
      var tr = getInvoiceTransport(d, state);
      var dateVal = getInvoiceDate(d, "deleted") || "—";
      return (
        '<tr>' +
          '<td><strong>' + ERP.esc(d.id) + '</strong><div class="muted">' + ERP.esc(dateVal) + '</div></td>' +
          '<td><strong>' + ERP.esc(cl.name || "Cliente") + '</strong><div class="muted">' + ERP.esc(zn) + (tr ? ' · ' + ERP.esc(tr) : '') + '</div></td>' +
          '<td>' + ERP.esc(d.reason || "") + ' <span class="muted">(' + ERP.esc(slr) + ')</span></td>' +
          '<td><strong>' + ERP.fmtUsd(d.totalUsd) + '</strong><div class="muted">' + ERP.fmtBs(d.totalUsd) + '</div></td>' +
          '<td><button type="button" class="sm" data-print-inv="' + ERP.esc(d.id) + '" data-print-kind="deleted">Ver / Imprimir</button></td>' +
        '</tr>'
      );
    }).join("");

    root.innerHTML =
      '<div class="grid-2">' +
        '<div class="card">' +
          '<div class="card-header"><h2 class="card-title">1. Devolución de Producto al Momento de Despachar</h2></div>' +
          '<p class="muted">Ajusta la factura y el saldo, reingresando el producto a lote FEFO o enviándolo a cuarentena/merma.</p>' +
          (allPending.length
            ? '<div class="field"><label>Factura</label><select id="dev-inv">' + invOpts + '</select></div>' +
              '<div class="field"><label>SKU Devuelto</label><select id="dev-sku">' + skuOpts + '</select></div>' +
              '<div class="grid-2"><div class="field"><label>Cantidad</label><input type="number" min="1" id="dev-qty" value="1" /></div><div class="field"><label>Destino</label><select id="dev-disp"><option value="Reingreso FEFO">Reingreso FEFO</option><option value="Cuarentena / Merma">Cuarentena / Merma</option></select></div></div>' +
              '<div class="field"><label>Motivo</label><input type="text" id="dev-reason" placeholder="Motivo de devolución en despacho" /></div>' +
              '<button type="button" class="warn" style="width:100%;" id="btn-do-dev">Registrar Devolución</button>'
            : '<div class="notice notice-info">No hay facturas activas.</div>') +
        '</div>' +
        '<div class="card">' +
          '<div class="card-header"><h2 class="card-title">2. Cliente No Recibe / Eliminar Factura</h2></div>' +
          '<p class="muted">Elimina la factura y revierte 100% los lotes FEFO descontados, el saldo del cliente y los envases retornables.</p>' +
          (allPending.length
            ? '<div class="field"><label>Factura a Eliminar</label><select id="rej-inv">' + invOpts + '</select></div>' +
              '<div class="field"><label>Motivo de No Recepción</label><input type="text" id="rej-reason" placeholder="Ej. Cliente no recibe / local cerrado" /></div>' +
              '<button type="button" class="danger" style="width:100%;" id="btn-do-elim">Eliminar Factura y Revertir Todo</button>'
            : '<div class="notice notice-info">No hay facturas activas.</div>') +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title">Facturas en Despacho (' + pendingInvoices.length + ' de ' + allPending.length + ')</h2>' +
            '<p class="muted">Al marcar una factura como entregada, sale de este listado y pasa a Facturas Entregadas.</p>' +
          '</div>' +
          '<input type="text" id="pend-search" value="' + ERP.esc(pCfg.search || "") + '" placeholder="Buscar factura o cliente..." style="max-width:250px;" />' +
        '</div>' +
        buildFilterBarHtml("pend", pCfg, pOpts) +
        '<div class="table-wrap"><table><thead><tr><th>Factura</th><th>Cliente</th><th>Detalle y Nota Marginal</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' + (invRows || '<tr><td colspan="6" class="muted">Sin facturas o ninguna coincide con el filtro.</td></tr>') + '</tbody></table></div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<div>' +
            '<h3 class="card-title">Facturas Entregadas (' + deliveredInvoices.length + ' de ' + allDelivered.length + ')</h3>' +
            '<p class="muted">Historial de facturas ya entregadas al cliente.</p>' +
          '</div>' +
          '<input type="text" id="deliv-search" value="' + ERP.esc(dCfg.search || "") + '" placeholder="Buscar factura o cliente..." style="max-width:250px;" />' +
        '</div>' +
        buildFilterBarHtml("deliv", dCfg, dOpts) +
        '<div class="table-wrap"><table><thead><tr><th>Factura</th><th>Cliente</th><th>Mercancía y Nota Marginal</th><th>Total</th><th>Estado</th><th>Acción</th></tr></thead><tbody>' + (deliveredRows || '<tr><td colspan="6" class="muted">Aún no hay facturas entregadas o ninguna coincide con el filtro.</td></tr>') + '</tbody></table></div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<div>' +
            '<h3 class="card-title">Facturas Eliminadas por No Recepción (' + deletedInvoices.length + ' de ' + allDeleted.length + ')</h3>' +
            '<p class="muted">Historial de facturas anuladas o no recibidas.</p>' +
          '</div>' +
          '<input type="text" id="delinv-search" value="' + ERP.esc(xCfg.search || "") + '" placeholder="Buscar factura o cliente..." style="max-width:250px;" />' +
        '</div>' +
        buildFilterBarHtml("delinv", xCfg, xOpts) +
        '<div class="table-wrap"><table><thead><tr><th>Factura</th><th>Cliente</th><th>Motivo y Usuario</th><th>Monto Revertido</th><th>Acción</th></tr></thead><tbody>' + (delRows || '<tr><td colspan="5" class="muted">Sin registros o ninguno coincide con el filtro.</td></tr>') + '</tbody></table></div>' +
      '</div>';

    var selDevInv = document.getElementById("dev-inv");
    if (selDevInv) {
      selDevInv.onchange = function () {
        var inv = state.invoices.filter(function (x) { return x.id === selDevInv.value; })[0];
        var selSku = document.getElementById("dev-sku");
        if (inv && selSku) {
          selSku.innerHTML = (inv.items || []).map(function (it) {
            return '<option value="' + ERP.esc(it.sku) + '">' + ERP.esc(it.sku) + ' (Facturado: ' + it.qty + ' · ' + ERP.fmtUsd(it.unitPriceUsd) + ')</option>';
          }).join("");
        }
      };
    }

    var btnDoDev = document.getElementById("btn-do-dev");
    if (btnDoDev) {
      btnDoDev.onclick = function () {
        var invId = document.getElementById("dev-inv").value;
        var skuCode = document.getElementById("dev-sku").value;
        var qty = parseInt(document.getElementById("dev-qty").value, 10) || 0;
        var disp = document.getElementById("dev-disp").value;
        var reason = document.getElementById("dev-reason").value.trim() || "Devolución en despacho";
        var inv = state.invoices.filter(function (x) { return x.id === invId; })[0];
        if (!inv) return;
        var item = null;
        for (var i = 0; i < (inv.items || []).length; i++) {
          if (inv.items[i].sku === skuCode) { item = inv.items[i]; break; }
        }
        if (!item || qty <= 0 || qty > Number(item.qty)) {
          ERP.setNotice("bad", "Cantidad inválida para " + skuCode + ".");
          ERP.render();
          return;
        }
        if (disp === "Reingreso FEFO") {
          var lotId = (item.lotAllocations && item.lotAllocations[0]) ? item.lotAllocations[0].lotId : null;
          ERP.returnToFefo(skuCode, qty, lotId, "2027-03-31");
        } else {
          state.quarantine.unshift({ id: "Q-" + Math.floor(1000 + Math.random() * 9000), date: new Date().toISOString().slice(0, 10), invoiceId: inv.id, sku: skuCode, qty: qty, reason: reason });
        }
        var creditUsd = Number((qty * Number(item.unitPriceUsd)).toFixed(2));
        item.qty = Number(item.qty) - qty;
        if (item.qty === 0) inv.items = inv.items.filter(function (x) { return x.sku !== skuCode; });
        inv.totalUsd = Math.max(0, Number((Number(inv.totalUsd) - creditUsd).toFixed(2)));
        ERP.ensureClientDebt(inv.clientId);
        state.clientBalanceUsd[inv.clientId] = Math.max(0, Number((Number(state.clientBalanceUsd[inv.clientId] || 0) - creditUsd).toFixed(2)));
        inv.status = inv.items.length === 0 ? "Devuelta Total" : "Devolución Parcial";
        inv.returnsLog = inv.returnsLog || [];
        inv.returnsLog.push({ sku: skuCode, qty: qty, disposition: disp, reason: reason, creditUsd: creditUsd });
        inv.marginalNote = (inv.marginalNote || "") + " [Dev. Despacho: " + qty + "x " + skuCode + " -> " + disp + "]";
        ERP.setNotice("ok", "Devolución registrada en " + inv.id + " por " + ERP.fmtUsd(creditUsd) + ".");
        ERP.saveState();
        ERP.render();
      };
    }

    function removeInvoice(invId, reason) {
      if (!ERP.hasPerm("eliminar_factura")) {
        ERP.setNotice("bad", "Su usuario (" + ERP.getUser().name + ") no tiene permiso para eliminar facturas.");
        ERP.render();
        return;
      }
      var idx = -1;
      for (var i = 0; i < state.invoices.length; i++) {
        if (state.invoices[i].id === invId) { idx = i; break; }
      }
      if (idx === -1) return;
      var inv = state.invoices[idx];
      for (var j = 0; j < (inv.items || []).length; j++) {
        var it = inv.items[j];
        if (it.lotAllocations && it.lotAllocations.length) {
          for (var a = 0; a < it.lotAllocations.length; a++) {
            ERP.returnToFefo(it.sku, Number(it.lotAllocations[a].qty), it.lotAllocations[a].lotId, it.lotAllocations[a].expiry);
          }
        } else {
          ERP.returnToFefo(it.sku, Number(it.qty), null, "2027-03-31");
        }
      }
      ERP.ensureClientDebt(inv.clientId);
      state.clientBalanceUsd[inv.clientId] = Math.max(0, Number((Number(state.clientBalanceUsd[inv.clientId] || 0) - Number(inv.totalUsd || 0)).toFixed(2)));
      var cTypes = ERP.getCrateTypes();
      for (var c = 0; c < cTypes.length; c++) {
        var ct = cTypes[c];
        var dV = Number((inv.cratesDelivered && inv.cratesDelivered[ct.id]) || 0);
        var rV = Number((inv.cratesReturned && inv.cratesReturned[ct.id]) || 0);
        state.crateStock[ct.id] = Math.max(0, Number(state.crateStock[ct.id] || 0) + dV - rV);
        state.clientCrateDebt[inv.clientId][ct.id] = Math.max(0, Number(state.clientCrateDebt[inv.clientId][ct.id] || 0) - dV + rV);
      }
      state.deletedInvoices.unshift({
        id: inv.id,
        date: inv.date,
        clientId: inv.clientId,
        sellerName: inv.sellerName || inv.billedBy || "",
        zone: inv.zone || "",
        truck: getInvoiceTransport(inv, state),
        items: inv.items || [],
        marginalNote: inv.marginalNote || "",
        returnsLog: inv.returnsLog || [],
        totalUsd: inv.totalUsd,
        reason: reason,
        deletedBy: ERP.getUser().name + " (" + ERP.getUser().role + ")",
        deletedAt: new Date().toISOString().slice(0, 10)
      });
      state.invoices.splice(idx, 1);
      ERP.setNotice("ok", "Factura " + inv.id + " eliminada por no recepción y reversión completa aplicada.");
      ERP.saveState();
      ERP.render();
    }

    var btnDoElim = document.getElementById("btn-do-elim");
    if (btnDoElim) {
      btnDoElim.onclick = function () {
        removeInvoice(document.getElementById("rej-inv").value, document.getElementById("rej-reason").value.trim() || "Cliente no recibió la mercancía");
      };
    }

    var elimBtns = root.querySelectorAll("button[data-elim]");
    for (var e = 0; e < elimBtns.length; e++) {
      elimBtns[e].onclick = function () {
        removeInvoice(this.getAttribute("data-elim"), "No recibió mercancía en ruta");
      };
    }

    bindSectionFilterEvents(root, "pend", pCfg, state);
    bindSectionFilterEvents(root, "deliv", dCfg, state);
    bindSectionFilterEvents(root, "delinv", xCfg, state);

    var deliverBtns = root.querySelectorAll("button[data-mark-delivered]");
    for (var i = 0; i < deliverBtns.length; i++) {
      deliverBtns[i].onclick = function () {
        var invId = this.getAttribute("data-mark-delivered");
        var targetInv = null;
        for (var j = 0; j < state.invoices.length; j++) {
          if (state.invoices[j].id === invId) {
            targetInv = state.invoices[j];
            break;
          }
        }
        if (!targetInv) return;
        targetInv.status = "Entregada";
        targetInv.deliveredDate = new Date().toISOString().slice(0, 10);
        if (typeof ERP.setNotice === "function") {
          ERP.setNotice("ok", "Factura " + invId + " marcada como Entregada y movida a Facturas Entregadas.");
        }
        ERP.saveState();
        ERP.render();
      };
    }

    var changeStatusBtns = root.querySelectorAll("button[data-change-status]");
    for (var sIdx = 0; sIdx < changeStatusBtns.length; sIdx++) {
      changeStatusBtns[sIdx].onclick = function () {
        var invId = this.getAttribute("data-change-status");
        var targetInv = null;
        for (var j = 0; j < state.invoices.length; j++) {
          if (state.invoices[j].id === invId) {
            targetInv = state.invoices[j];
            break;
          }
        }
        if (targetInv) openChangeStatusModal(targetInv);
      };
    }

    var printBtns = root.querySelectorAll("button[data-print-inv]");
    for (var pIdx = 0; pIdx < printBtns.length; pIdx++) {
      printBtns[pIdx].onclick = function () {
        var invId = this.getAttribute("data-print-inv");
        var kind = this.getAttribute("data-print-kind") || "pending";
        var sourceArr = kind === "deleted" ? state.deletedInvoices : state.invoices;
        var found = null;
        for (var j = 0; j < sourceArr.length; j++) {
          if (sourceArr[j].id === invId) {
            found = sourceArr[j];
            break;
          }
        }
        if (found) openInvoicePrintModal(found, kind, state);
      };
    }

    var retBtns = root.querySelectorAll("button[data-open-return]");
    for (var k = 0; k < retBtns.length; k++) {
      retBtns[k].onclick = function () {
        var invId = this.getAttribute("data-open-return");
        if (typeof ERP.openReturnModal === "function") {
          ERP.openReturnModal(invId);
        }
      };
    }
  }

  ERP.registerMenuModule("despacho", renderDespachoView);
})();