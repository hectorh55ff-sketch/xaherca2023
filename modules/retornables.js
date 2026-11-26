(function () {
  "use strict";

  var ERP = window.DistriFoodERP;
  if (!ERP) return;

  function getActiveUserName() {
    var u = (typeof ERP.getUser === "function" && ERP.getUser()) || {};
    var name = u.name || u.username || u.user || u.email || "";
    return String(name).trim() || "Usuario del Sistema";
  }

  function stampCollectionLogEntry(entry) {
    if (!entry || typeof entry !== "object") return entry;
    var actor = getActiveUserName();
    if (!entry.recordedBy) entry.recordedBy = actor;
    if (!entry.userName) entry.userName = entry.recordedBy;
    if (!entry.txDate) entry.txDate = entry.date || new Date().toISOString().slice(0, 10);
    if (!entry.date) entry.date = entry.txDate;
    return entry;
  }

  if (ERP.state && Array.isArray(ERP.state.collectionLog) && !ERP._retornablesLogWrapped) {
    ERP._retornablesLogWrapped = true;
    var origUnshift = ERP.state.collectionLog.unshift.bind(ERP.state.collectionLog);
    var origPush = ERP.state.collectionLog.push.bind(ERP.state.collectionLog);

    ERP.state.collectionLog.unshift = function () {
      for (var i = 0; i < arguments.length; i++) {
        stampCollectionLogEntry(arguments[i]);
      }
      return origUnshift.apply(this, arguments);
    };

    ERP.state.collectionLog.push = function () {
      for (var i = 0; i < arguments.length; i++) {
        stampCollectionLogEntry(arguments[i]);
      }
      return origPush.apply(this, arguments);
    };
  }

  function renderRetornablesView(root) {
    var state = ERP.state || {};
    var cTypes = typeof ERP.getCrateTypes === "function" ? ERP.getCrateTypes() : [];
    var clientsList = typeof ERP.getClients === "function" ? ERP.getClients() : [];
    var activeUser = getActiveUserName();
    var selectedClientId = state.selectedReturnClientId || (clientsList[0] ? clientsList[0].id : "");
    if (selectedClientId && typeof ERP.ensureClientDebt === "function") {
      ERP.ensureClientDebt(selectedClientId);
    }

    var clientOpts = clientsList.map(function (c) {
      return '<option value="' + ERP.esc(c.id) + '"' + (c.id === selectedClientId ? " selected" : "") + '>' + ERP.esc(c.name) + ' (' + ERP.esc(c.rif || "") + ')</option>';
    }).join("");

    var balUsd = Number((state.clientBalanceUsd && state.clientBalanceUsd[selectedClientId]) || 0);
    var debtCrates = (state.clientCrateDebt && state.clientCrateDebt[selectedClientId]) || {};

    var crateFieldsHtml = cTypes.map(function (ct) {
      var kId = typeof ERP.normalizeCrateKey === "function" ? ERP.normalizeCrateKey(ct.id) : ct.id;
      var curDebt = Number(debtCrates[kId] || 0);
      return (
        '<div class="kpi">' +
          '<strong>' + ERP.esc(ct.name) + '</strong> <span class="muted">(Cliente tiene: <strong>' + curDebt + '</strong>)</span>' +
          '<div class="field" style="margin-top:8px;margin-bottom:0;">' +
            '<label>Vacíos Devueltos / Pagados</label>' +
            '<input type="number" min="0" max="' + curDebt + '" id="ret-crate-' + ERP.esc(kId) + '" value="0" />' +
          '</div>' +
        '</div>'
      );
    }).join("");

    var logs = (state.collectionLog || []).filter(function (lg) {
      return !selectedClientId || lg.clientId === selectedClientId;
    });

    var logRows = logs.map(function (lg) {
      var cl = typeof ERP.getClient === "function" ? ERP.getClient(lg.clientId) : {};
      var recBy = lg.recordedBy || lg.userName || activeUser;
      return (
        '<tr>' +
          '<td><strong>' + ERP.esc(lg.txDate || lg.date || "—") + '</strong></td>' +
          '<td>' + ERP.esc(cl.name || lg.clientId || "—") + '</td>' +
          '<td><span class="badge b-info">' + ERP.esc(lg.type || "Movimiento") + '</span></td>' +
          '<td><strong>' + ERP.esc(recBy) + '</strong></td>' +
          '<td>' + ERP.esc(lg.detail || "") + '</td>' +
        '</tr>'
      );
    }).join("");

    root.innerHTML =
      '<div class="card">' +
        '<div class="card-header">' +
          '<div><h2 class="card-title">Cobranza de Facturas y Devolución / Pago de Casilleros</h2><p class="muted">Usuario que registra: <strong>' + ERP.esc(activeUser) + '</strong></p></div>' +
        '</div>' +
        '<div class="grid-2">' +
          '<div class="field"><label>Cliente</label><select id="ret-client-sel">' + clientOpts + '</select></div>' +
          '<div class="kpi"><div class="kpi-label">Saldo Pendiente del Cliente</div><div class="kpi-val">' + ERP.fmtUsd(balUsd) + ' <span class="muted">(' + ERP.fmtBs(balUsd) + ')</span></div></div>' +
        '</div>' +
        '<div class="grid-2" style="margin-top:12px;">' +
          '<div class="kpi">' +
            '<strong>Abono / Pago de Factura (USD)</strong>' +
            '<div class="grid-2" style="margin-top:8px;gap:8px;align-items:end;">' +
              '<div class="field" style="margin-bottom:0;"><label>Monto a Abonar ($)</label><input type="number" step="0.01" min="0" id="ret-pay-usd" value="0" /></div>' +
              '<div class="field" style="margin-bottom:0;"><label>Método de Pago</label><select id="ret-pay-method"><option value="Efectivo USD">Efectivo USD</option><option value="Transferencia / Pago Móvil">Transferencia / Pago Móvil</option><option value="Zelle">Zelle</option><option value="Efectivo Bs.">Efectivo Bs.</option></select></div>' +
            '</div>' +
            '<div class="field" style="margin-top:8px;margin-bottom:0;"><label>Referencia / Nota</label><input type="text" id="ret-pay-note" placeholder="Nro. referencia o factura" /></div>' +
          '</div>' +
          '<div>' +
            '<label style="font-size:12px;font-weight:700;color:#334155;display:block;margin-bottom:6px;">Devolución / Pago de Casilleros</label>' +
            '<div class="grid-2" style="gap:8px;">' + (crateFieldsHtml || '<p class="muted">Sin tipos de casillero.</p>') + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:14px;">' +
          '<button type="button" class="success" id="btn-process-ret-payment">Registrar Pago / Devolución</button>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-header"><h3 class="card-title">Bitácora de Pagos y Casilleros (' + logs.length + ')</h3></div>' +
        '<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Tipo</th><th>Registrado Por</th><th>Detalle</th></tr></thead><tbody>' + (logRows || '<tr><td colspan="5" class="muted">Sin registros.</td></tr>') + '</tbody></table></div>' +
      '</div>';

    var selClient = document.getElementById("ret-client-sel");
    if (selClient) {
      selClient.onchange = function () {
        state.selectedReturnClientId = this.value;
        if (typeof ERP.saveState === "function") ERP.saveState();
        if (typeof ERP.render === "function") ERP.render();
      };
    }

    var procBtn = document.getElementById("btn-process-ret-payment");
    if (procBtn) {
      procBtn.onclick = function () {
        if (!selectedClientId) return;
        var payAmt = Math.max(0, parseFloat((document.getElementById("ret-pay-usd") && document.getElementById("ret-pay-usd").value) || "0") || 0);
        var payMethod = (document.getElementById("ret-pay-method") && document.getElementById("ret-pay-method").value) || "Efectivo USD";
        var payNote = ((document.getElementById("ret-pay-note") && document.getElementById("ret-pay-note").value) || "").trim();
        var registrarUser = getActiveUserName();
        var todayIso = new Date().toISOString().slice(0, 10);

        if (!state.clientBalanceUsd) state.clientBalanceUsd = {};
        if (!state.clientCrateDebt) state.clientCrateDebt = {};
        if (!state.clientCrateDebt[selectedClientId]) state.clientCrateDebt[selectedClientId] = {};
        if (!state.crateStock) state.crateStock = {};
        if (!Array.isArray(state.collectionLog)) state.collectionLog = [];

        var didSomething = false;

        if (payAmt > 0) {
          var prevBal = Number(state.clientBalanceUsd[selectedClientId] || 0);
          var appliedUsd = Math.min(prevBal, payAmt);
          state.clientBalanceUsd[selectedClientId] = Number(Math.max(0, prevBal - payAmt).toFixed(2));
          state.collectionLog.unshift({
            clientId: selectedClientId,
            txDate: todayIso,
            date: todayIso,
            type: "Pago Factura",
            paymentMethod: payMethod,
            amountUsd: Number((appliedUsd || payAmt).toFixed(2)),
            recordedBy: registrarUser,
            userName: registrarUser,
            detail: "Abono $" + payAmt.toFixed(2) + " (" + payMethod + ")" + (payNote ? " · Ref: " + payNote : "") + " · Reg: " + registrarUser
          });
          didSomething = true;
        }

        var returnedParts = [];
        for (var i = 0; i < cTypes.length; i++) {
          var ct = cTypes[i];
          var kId = typeof ERP.normalizeCrateKey === "function" ? ERP.normalizeCrateKey(ct.id) : ct.id;
          var inp = document.getElementById("ret-crate-" + kId);
          var retQty = Math.max(0, parseInt((inp && inp.value) || "0", 10) || 0);
          var curClientCrates = Number(state.clientCrateDebt[selectedClientId][kId] || 0);
          var actualRet = Math.min(curClientCrates, retQty);
          if (actualRet > 0) {
            state.clientCrateDebt[selectedClientId][kId] = Math.max(0, curClientCrates - actualRet);
            state.crateStock[kId] = Number(state.crateStock[kId] || 0) + actualRet;
            returnedParts.push(actualRet + " " + ct.name);
            didSomething = true;
          }
        }

        if (returnedParts.length) {
          state.collectionLog.unshift({
            clientId: selectedClientId,
            txDate: todayIso,
            date: todayIso,
            type: "Pago / Devolución Casillero",
            paymentMethod: "Devolución Casilleros",
            recordedBy: registrarUser,
            userName: registrarUser,
            detail: "Casilleros devueltos: " + returnedParts.join(", ") + (payNote ? " · Nota: " + payNote : "") + " · Reg: " + registrarUser
          });
        }

        if (!didSomething) {
          if (typeof ERP.setNotice === "function") ERP.setNotice("warn", "Ingrese un monto de pago o cantidad de casilleros a devolver.");
          if (typeof ERP.render === "function") ERP.render();
          return;
        }

        if (typeof ERP.setNotice === "function") ERP.setNotice("ok", "Movimiento registrado por " + registrarUser + ".");
        if (typeof ERP.saveState === "function") ERP.saveState();
        if (typeof ERP.render === "function") ERP.render();
      };
    }
  }

  if (typeof ERP.registerMenuModule === "function") {
    ERP.registerMenuModule("retornables", renderRetornablesView);
  }
})();