(function () {
  "use strict";

  var ERP = window.DistriFoodERP;
  if (!ERP) return;

  var VALID_PRICE_TIERS = ["Normal", "Mayorista", "Distribuidor"];

  function ensureClientesModalStyles() {
    if (document.getElementById("clientes-account-modal-styles")) return;
    var style = document.createElement("style");
    style.id = "clientes-account-modal-styles";
    style.textContent = [
      ".cli-modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.58); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 9999; }",
      ".cli-modal-card { background: #fff; border-radius: 16px; max-width: 980px; width: 100%; max-height: 88vh; overflow-y: auto; padding: 18px 20px; box-shadow: 0 22px 50px rgba(15, 23, 42, 0.3); border: 1px solid #e2e8f0; color: #0f172a; }",
      ".cli-modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; }",
      ".cli-section-title { font-size: 12px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #64748b; margin: 12px 0 8px; }"
    ].join("\n");
    document.head.appendChild(style);
  }

  function getTodayIsoDate() {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, "0");
    var d = String(now.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function getCurrentActorName() {
    var user = (typeof ERP.getUser === "function" && ERP.getUser()) || {};
    var actor = user.name || user.username || user.user || user.email || "";
    return String(actor).trim() || "Usuario del Sistema";
  }

  function ensureClientAcquisitionMetadata(clientObj) {
    if (!clientObj || typeof clientObj !== "object") return clientObj;
    if (!clientObj.createdAt) {
      clientObj.createdAt = getTodayIsoDate();
    }
    if (!clientObj.createdBy) {
      clientObj.createdBy = getCurrentActorName();
    }
    return clientObj;
  }

  function syncAllClientsMetadata() {
    var list = (ERP.state && Array.isArray(ERP.state.clients)) ? ERP.state.clients : [];
    var changed = false;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c && (!c.createdAt || !c.createdBy)) {
        ensureClientAcquisitionMetadata(c);
        changed = true;
      }
    }
    if (changed && typeof ERP.saveState === "function") {
      ERP.saveState();
    }
  }

  if (typeof ERP.openNewClientModal === "function" && !ERP._clientesMetaWrapped) {
    var originalOpenNewClientModal = ERP.openNewClientModal;
    ERP._clientesMetaWrapped = true;
    ERP.openNewClientModal = function (onDone) {
      var prevCount = (ERP.state && Array.isArray(ERP.state.clients)) ? ERP.state.clients.length : 0;
      originalOpenNewClientModal(function (created) {
        var list = (ERP.state && Array.isArray(ERP.state.clients)) ? ERP.state.clients : [];
        var target = created || (list.length > prevCount ? list[0] : null);
        if (target) {
          ensureClientAcquisitionMetadata(target);
          if (typeof ERP.saveState === "function") {
            ERP.saveState();
          }
        }
        if (typeof onDone === "function") {
          onDone(target);
        }
      });
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

  function extractRecordDateIso(rec) {
    if (!rec || typeof rec !== "object") return "";
    var raw = rec.txDate || rec.date || rec.createdAt || "";
    var match = String(raw).match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : "";
  }

  function extractInvoiceCondition(inv, client) {
    if (!inv || typeof inv !== "object") return "Contado";
    var direct = inv.payCond || inv.paymentMethod || inv.condition || inv.condicion || "";
    var clean = String(direct).trim();
    if (clean) return clean;
    var cDays = Number(client && client.creditDays != null ? client.creditDays : 0);
    if (inv.status === "Entregada") return "Contado";
    return cDays > 0 ? "Crédito" : "Contado";
  }

  function extractInvoiceSeller(inv) {
    if (!inv || typeof inv !== "object") return "—";
    var seller = inv.sellerName || inv.billedBy || inv.seller || inv.vendorName || inv.vendedor || inv.createdBy || "";
    var clean = String(seller).trim();
    return clean || "—";
  }

  function extractPaymentUser(rec) {
    if (!rec || typeof rec !== "object") return "—";
    var u = rec.recordedBy || rec.userName || rec.operatorName || rec.registeredBy || rec.createdBy || rec.sellerName || "";
    var clean = String(u).trim();
    if (clean) return clean;
    var detail = String(rec.detail || "");
    var m = detail.match(/(?:Reg|Registrado por|Usuario|Cobrado por)\s*:\s*([^·|,\n]+)/i);
    if (m && m[1]) return m[1].trim();
    return "—";
  }

  function extractPaymentMethod(rec) {
    if (!rec || typeof rec !== "object") return "No especificado";
    var direct = rec.paymentMethod || rec.method || rec.payMethod || rec.formaPago || rec.type || "";
    var clean = String(direct).trim();
    if (clean) return clean;
    var detail = String(rec.detail || rec.note || "");
    var m = detail.match(/(?:Método|Metodo|Pago|Condición|Condicion)\s*:\s*([^·|,\n]+)/i);
    if (m && m[1]) return m[1].trim();
    return "Pago / Abono";
  }

  function extractPaymentAmountUsd(rec) {
    if (!rec || typeof rec !== "object") return null;
    var numCandidates = [rec.amountUsd, rec.usd, rec.amount, rec.totalUsd];
    for (var i = 0; i < numCandidates.length; i++) {
      var v = Number(numCandidates[i]);
      if (!isNaN(v) && v > 0) return v;
    }
    var txt = String(rec.detail || "");
    var match = txt.match(/\$\s*([0-9]+(?:[.,][0-9]+)?)/);
    if (match && match[1]) {
      var parsed = parseFloat(match[1].replace(",", "."));
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  }

  function computeInvoiceTermInfo(inv, client) {
    var baseDate = parseIsoDateLocal(inv.date) || getTodayLocalMidnight();
    var today = getTodayLocalMidnight();
    var msPerDay = 1000 * 60 * 60 * 24;
    var elapsedDays = Math.max(0, Math.floor((today.getTime() - baseDate.getTime()) / msPerDay));
    var creditDays = Math.max(0, parseInt(client && client.creditDays != null ? client.creditDays : 0, 10) || 0);

    if (inv.status === "Entregada" || inv.status === "Devuelta Total") {
      return {
        label: inv.status === "Entregada" ? "Liquidada / Entregada (" + elapsedDays + "d)" : "Devuelta Total",
        badgeClass: "b-ok"
      };
    }

    if (creditDays <= 0) {
      return {
        label: elapsedDays > 0 ? "Contado / " + elapsedDays + "d" : "Contado (Hoy)",
        badgeClass: elapsedDays > 0 ? "b-warn" : "b-info"
      };
    }

    var diffFromDue = elapsedDays - creditDays;
    if (diffFromDue > 0) {
      return {
        label: "Vencida hace " + diffFromDue + " día(s)",
        badgeClass: "b-bad"
      };
    }

    var remDays = Math.max(0, creditDays - elapsedDays);
    return {
      label: "Vigente · " + remDays + " día(s) restantes",
      badgeClass: remDays <= 3 ? "b-warn" : "b-ok"
    };
  }

  function openClientAccountModal(clientId) {
    ensureClientesModalStyles();

    var existing = document.getElementById("clientes-account-history-modal");
    if (existing) existing.remove();

    var state = ERP.state || {};
    var client = (typeof ERP.getClient === "function" ? ERP.getClient(clientId) : null) || {};
    if (typeof ERP.ensureClientDebt === "function") {
      ERP.ensureClientDebt(clientId);
    }

    var balanceUsd = Number((state.clientBalanceUsd && state.clientBalanceUsd[clientId]) || 0);
    var debtCrates = (state.clientCrateDebt && state.clientCrateDebt[clientId]) || {};
    var allClientInvoices = (state.invoices || []).filter(function (inv) { return inv.clientId === clientId; });
    var allClientPayments = (state.collectionLog || []).filter(function (lg) { return lg.clientId === clientId; });

    var methodSet = { "Crédito": true, "Contado": true };
    for (var i = 0; i < allClientInvoices.length; i++) {
      var invCond = extractInvoiceCondition(allClientInvoices[i], client);
      if (invCond) methodSet[invCond] = true;
    }
    for (var p = 0; p < allClientPayments.length; p++) {
      var pm = extractPaymentMethod(allClientPayments[p]);
      if (pm) methodSet[pm] = true;
    }
    var methodOptions = Object.keys(methodSet);

    var filterState = {
      dateFrom: "",
      dateTo: "",
      method: "ALL"
    };

    var backdrop = document.createElement("div");
    backdrop.id = "clientes-account-history-modal";
    backdrop.className = "cli-modal-backdrop";

    var methodOptsHtml = methodOptions.map(function (mName) {
      return '<option value="' + ERP.esc(mName) + '">' + ERP.esc(mName) + '</option>';
    }).join("");

    backdrop.innerHTML =
      '<div class="cli-modal-card" role="dialog" aria-modal="true">' +
        '<div class="cli-modal-head">' +
          '<div>' +
            '<h3 style="margin:0;font-size:18px;">Historial de Facturas y Pagos · ' + ERP.esc(client.name || "Cliente") + '</h3>' +
            '<div class="muted" style="margin-top:4px;">RIF: ' + ERP.esc(client.rif || "—") + ' · Tipo: ' + ERP.esc(client.clientType || "Normal") + ' · Ruta: ' + ERP.esc(client.zone || "—") + '</div>' +
          '</div>' +
          '<button type="button" class="danger sm" id="btn-close-client-account">Cerrar</button>' +
        '</div>' +
        '<div class="grid-3" style="margin-bottom:14px;">' +
          '<div class="kpi">' +
            '<div class="kpi-label">Saldo Pendiente Actual</div>' +
            '<div class="kpi-val">' + ERP.fmtUsd(balanceUsd) + '</div>' +
            '<div class="kpi-sub">' + ERP.fmtBs(balanceUsd) + '</div>' +
          '</div>' +
          '<div class="kpi">' +
            '<div class="kpi-label">Resumen Filtrado</div>' +
            '<div id="acc-filtered-kpis" style="font-size:13px;font-weight:700;margin-top:6px;">—</div>' +
          '</div>' +
          '<div class="kpi">' +
            '<div class="kpi-label">Casilleros en Poder</div>' +
            '<div style="font-size:13px;font-weight:700;margin-top:6px;">' + ERP.formatClientCratesSummary(debtCrates) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="kpi" style="margin-bottom:14px;background:#f8fafc;">' +
          '<div class="grid-3" style="gap:10px;align-items:end;">' +
            '<div class="field" style="margin-bottom:0;"><label>Desde (Fecha)</label><input type="date" id="acc-filter-from" /></div>' +
            '<div class="field" style="margin-bottom:0;"><label>Hasta (Fecha)</label><input type="date" id="acc-filter-to" /></div>' +
            '<div class="field" style="margin-bottom:0;"><label>Método / Condición de Pago</label><select id="acc-filter-method"><option value="ALL">Todos los métodos</option>' + methodOptsHtml + '</select></div>' +
          '</div>' +
          '<div style="margin-top:8px;display:flex;justify-content:flex-end;">' +
            '<button type="button" class="sm" id="btn-acc-clear-filters">Limpiar filtros</button>' +
          '</div>' +
        '</div>' +
        '<div class="cli-section-title" id="acc-inv-title">Facturas Emitidas</div>' +
        '<div class="table-wrap" style="margin-bottom:16px;">' +
          '<table><thead><tr><th>Factura / Fecha</th><th>Facturó</th><th>Condición</th><th>Detalle Mercancía</th><th>Total</th><th>Vigencia</th><th>Estado</th></tr></thead><tbody id="acc-inv-tbody"></tbody></table>' +
        '</div>' +
        '<div class="cli-section-title" id="acc-pay-title">Pagos Procesados</div>' +
        '<div class="table-wrap">' +
          '<table><thead><tr><th>Fecha</th><th>Método de Pago</th><th>Registrado Por</th><th>Monto</th><th>Detalle / Referencia</th></tr></thead><tbody id="acc-pay-tbody"></tbody></table>' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);

    function renderFilteredTables() {
      var filteredInvs = allClientInvoices.filter(function (inv) {
        var dIso = extractRecordDateIso(inv);
        if (filterState.dateFrom && (!dIso || dIso < filterState.dateFrom)) return false;
        if (filterState.dateTo && (!dIso || dIso > filterState.dateTo)) return false;
        if (filterState.method !== "ALL") {
          var invMethod = extractInvoiceCondition(inv, client);
          if (invMethod.toLowerCase() !== filterState.method.toLowerCase()) return false;
        }
        return true;
      });

      var filteredPays = allClientPayments.filter(function (lg) {
        var dIso = extractRecordDateIso(lg);
        if (filterState.dateFrom && (!dIso || dIso < filterState.dateFrom)) return false;
        if (filterState.dateTo && (!dIso || dIso > filterState.dateTo)) return false;
        if (filterState.method !== "ALL") {
          var pMethod = extractPaymentMethod(lg);
          if (pMethod.toLowerCase() !== filterState.method.toLowerCase()) return false;
        }
        return true;
      });

      var sumInvsUsd = filteredInvs.reduce(function (acc, item) {
        return acc + Number(item.totalUsd || 0);
      }, 0);

      var sumPaysUsd = filteredPays.reduce(function (acc, item) {
        var amt = extractPaymentAmountUsd(item);
        return acc + (amt !== null ? amt : 0);
      }, 0);

      var kpiEl = document.getElementById("acc-filtered-kpis");
      if (kpiEl) {
        kpiEl.innerHTML =
          'Facturas (' + filteredInvs.length + '): <strong>' + ERP.fmtUsd(sumInvsUsd) + '</strong><br/>' +
          'Pagos (' + filteredPays.length + '): <strong>' + ERP.fmtUsd(sumPaysUsd) + '</strong>';
      }

      var invTitleEl = document.getElementById("acc-inv-title");
      if (invTitleEl) invTitleEl.textContent = "Facturas Emitidas (" + filteredInvs.length + ")";

      var payTitleEl = document.getElementById("acc-pay-title");
      if (payTitleEl) payTitleEl.textContent = "Pagos Procesados (" + filteredPays.length + ")";

      var invTbody = document.getElementById("acc-inv-tbody");
      if (invTbody) {
        if (!filteredInvs.length) {
          invTbody.innerHTML = '<tr><td colspan="7" class="muted">No hay facturas que coincidan con el filtro.</td></tr>';
        } else {
          invTbody.innerHTML = filteredInvs.map(function (inv) {
            var term = computeInvoiceTermInfo(inv, client);
            var itemsTxt = (inv.items || []).map(function (it) { return it.qty + "x " + it.sku; }).join(", ");
            var condTxt = extractInvoiceCondition(inv, client);
            var sellerTxt = extractInvoiceSeller(inv);
            var stClass = inv.status === "Entregada" ? "b-ok" : (String(inv.status || "").indexOf("Devolución") !== -1 ? "b-warn" : "b-info");
            return (
              '<tr>' +
                '<td><strong>' + ERP.esc(inv.id || "—") + '</strong><div class="muted">' + ERP.esc(inv.date || "—") + '</div></td>' +
                '<td><strong>' + ERP.esc(sellerTxt) + '</strong></td>' +
                '<td><span class="badge b-info">' + ERP.esc(condTxt) + '</span></td>' +
                '<td>' + ERP.esc(itemsTxt || "—") + '</td>' +
                '<td><strong>' + ERP.fmtUsd(inv.totalUsd || 0) + '</strong><div class="muted">' + ERP.fmtBs(inv.totalUsd || 0) + '</div></td>' +
                '<td><span class="badge ' + term.badgeClass + '">' + ERP.esc(term.label) + '</span></td>' +
                '<td>' + ERP.esc(inv.status || "—") + '</td>' +
              '</tr>'
            );
          }).join("");
        }
      }

      var payTbody = document.getElementById("acc-pay-tbody");
      if (payTbody) {
        if (!filteredPays.length) {
          payTbody.innerHTML = '<tr><td colspan="5" class="muted">No hay pagos procesados que coincidan con el filtro.</td></tr>';
        } else {
          payTbody.innerHTML = filteredPays.map(function (lg) {
            var pDate = extractRecordDateIso(lg) || lg.txDate || lg.date || "—";
            var pMethod = extractPaymentMethod(lg);
            var pUser = extractPaymentUser(lg);
            var pAmt = extractPaymentAmountUsd(lg);
            return (
              '<tr>' +
                '<td><strong>' + ERP.esc(pDate) + '</strong></td>' +
                '<td><span class="badge b-ok">' + ERP.esc(pMethod) + '</span></td>' +
                '<td><strong>' + ERP.esc(pUser) + '</strong></td>' +
                '<td>' + (pAmt !== null ? ('<strong>' + ERP.fmtUsd(pAmt) + '</strong><div class="muted">' + ERP.fmtBs(pAmt) + '</div>') : '<span class="muted">—</span>') + '</td>' +
                '<td>' + ERP.esc(lg.detail || lg.note || "") + '</td>' +
              '</tr>'
            );
          }).join("");
        }
      }
    }

    function closeModal() {
      backdrop.remove();
    }

    document.getElementById("btn-close-client-account").onclick = closeModal;
    backdrop.onclick = function (ev) {
      if (ev.target === backdrop) closeModal();
    };

    var fromInp = document.getElementById("acc-filter-from");
    var toInp = document.getElementById("acc-filter-to");
    var methodSel = document.getElementById("acc-filter-method");
    var clearBtn = document.getElementById("btn-acc-clear-filters");

    if (fromInp) {
      fromInp.onchange = function () {
        filterState.dateFrom = this.value || "";
        renderFilteredTables();
      };
    }
    if (toInp) {
      toInp.onchange = function () {
        filterState.dateTo = this.value || "";
        renderFilteredTables();
      };
    }
    if (methodSel) {
      methodSel.onchange = function () {
        filterState.method = this.value || "ALL";
        renderFilteredTables();
      };
    }
    if (clearBtn) {
      clearBtn.onclick = function () {
        filterState.dateFrom = "";
        filterState.dateTo = "";
        filterState.method = "ALL";
        if (fromInp) fromInp.value = "";
        if (toInp) toInp.value = "";
        if (methodSel) methodSel.value = "ALL";
        renderFilteredTables();
      };
    }

    renderFilteredTables();
  }

  function normalizePriceTier(tier) {
    if (!tier) return "Normal";
    var clean = String(tier).trim();
    for (var i = 0; i < VALID_PRICE_TIERS.length; i++) {
      if (VALID_PRICE_TIERS[i].toLowerCase() === clean.toLowerCase()) {
        return VALID_PRICE_TIERS[i];
      }
    }
    return "Normal";
  }

  function loadScriptOnce(src, callback) {
    var existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
      if (existing.dataset.loaded === "1") {
        callback(null);
      } else {
        existing.addEventListener("load", function () {
          existing.dataset.loaded = "1";
          callback(null);
        }, { once: true });
        existing.addEventListener("error", function () {
          callback(new Error("No se pudo cargar " + src));
        }, { once: true });
      }
      return;
    }
    var script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", function () {
      script.dataset.loaded = "1";
      callback(null);
    }, { once: true });
    script.addEventListener("error", function () {
      callback(new Error("No se pudo cargar " + src));
    }, { once: true });
    document.head.appendChild(script);
  }

  function ensurePdfLibs(callback) {
    var hasJsPdf = Boolean(window.jspdf && window.jspdf.jsPDF);
    var hasAutoTable = Boolean(
      (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && typeof window.jspdf.jsPDF.API.autoTable === "function") ||
      (window.jsPDF && window.jsPDF.API && typeof window.jsPDF.API.autoTable === "function")
    );

    if (hasJsPdf && hasAutoTable) {
      callback(null);
      return;
    }

    loadScriptOnce("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js", function (err1) {
      if (err1) {
        callback(err1);
        return;
      }
      loadScriptOnce("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js", function (err2) {
        if (err2) {
          callback(err2);
          return;
        }
        callback(null);
      });
    });
  }

  function getCompanyHeaderData() {
    var state = ERP.state || {};
    var user = (typeof ERP.getUser === "function" && ERP.getUser()) || {};
    var companyName =
      state.companyName ||
      (state.company && state.company.name) ||
      user.companyName ||
      "DistriFood ERP";

    var logoSource =
      state.companyLogo ||
      state.logoUrl ||
      (state.company && (state.company.logo || state.company.logoUrl)) ||
      "";

    if (!logoSource) {
      var domLogoImg = document.querySelector(".brand-logo img, .sidebar-logo img, header img, nav img");
      if (domLogoImg && domLogoImg.getAttribute("src")) {
        logoSource = domLogoImg.getAttribute("src");
      }
    }

    return {
      name: String(companyName).trim() || "DistriFood ERP",
      logo: String(logoSource || "").trim()
    };
  }

  function buildLogoDataUrlFromImgElement(imgEl, callback) {
    try {
      var canvas = document.createElement("canvas");
      var w = imgEl.naturalWidth || imgEl.width || 120;
      var h = imgEl.naturalHeight || imgEl.height || 120;
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(imgEl, 0, 0, w, h);
      callback(canvas.toDataURL("image/png"));
    } catch (e) {
      callback(null);
    }
  }

  function resolveLogoForPdf(logoSource, callback) {
    if (!logoSource) {
      callback(null);
      return;
    }
    if (logoSource.indexOf("data:image/") === 0) {
      callback(logoSource);
      return;
    }
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      buildLogoDataUrlFromImgElement(img, callback);
    };
    img.onerror = function () {
      callback(null);
    };
    img.src = logoSource;
  }

  function getSkuCategoryLabel(skuObj) {
    if (!skuObj) return "Sin Categoría";
    var raw = String(skuObj.category || skuObj.brand || "").trim();
    return raw ? raw : "Sin Categoría";
  }

  function drawLetterhead(doc, company, tier, generatedAtStr) {
    var pageWidth = doc.internal.pageSize.getWidth();
    var marginX = 14;
    var topY = 12;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, topY, pageWidth - marginX * 2, 26, 3, 3, "FD");

    var textStartX = marginX + 5;

    if (company.logo) {
      try {
        var fmt = (company.logo.indexOf("data:image/jpeg") === 0 || company.logo.indexOf("data:image/jpg") === 0)
          ? "JPEG"
          : "PNG";
        doc.addImage(company.logo, fmt, marginX + 4, topY + 3, 20, 20);
        textStartX = marginX + 28;
      } catch (e) {
        textStartX = marginX + 5;
      }
    } else {
      doc.setFillColor(2, 132, 199);
      doc.roundedRect(marginX + 4, topY + 4, 18, 18, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      var initials = company.name
        .split(/\s+/)
        .slice(0, 2)
        .map(function (w) { return w.charAt(0).toUpperCase(); })
        .join("") || "DF";
      doc.text(initials, marginX + 13, topY + 15.5, { align: "center" });
      textStartX = marginX + 26;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(company.name, textStartX, topY + 10.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(2, 132, 199);
    doc.text("LISTA DE PRECIOS · ESCALA " + String(tier).toUpperCase(), textStartX, topY + 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      "Emitida: " + generatedAtStr + "  |  Referencia Bs.: " + ERP.fmtBs(1) + " por $1.00",
      textStartX,
      topY + 22.5
    );

    return topY + 32;
  }

  function downloadPriceListPdf(rawTier) {
    var tier = normalizePriceTier(rawTier);
    var company = getCompanyHeaderData();

    ensurePdfLibs(function (err) {
      if (err) {
        if (ERP.setNotice) {
          ERP.setNotice("bad", "No se pudo cargar el generador de PDF para la lista " + tier + ".");
          ERP.render();
        }
        return;
      }

      resolveLogoForPdf(company.logo, function (resolvedLogo) {
        var finalCompany = {
          name: company.name,
          logo: resolvedLogo || ""
        };

        var JsPdfConstructor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        var doc = new JsPdfConstructor({
          orientation: "portrait",
          unit: "mm",
          format: "a4"
        });

        var nowStr = new Date().toLocaleString("es-VE");
        var currentY = drawLetterhead(doc, finalCompany, tier, nowStr);

        var skus = ERP.getSkus();
        var grouped = {};
        var orderedCategories = [];

        for (var i = 0; i < skus.length; i++) {
          var s = skus[i];
          var cat = getSkuCategoryLabel(s);
          if (!grouped[cat]) {
            grouped[cat] = [];
            orderedCategories.push(cat);
          }
          grouped[cat].push(s);
        }

        if (!orderedCategories.length) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text("No hay productos registrados en la escala " + tier + ".", 14, currentY + 6);
        } else {
          for (var c = 0; c < orderedCategories.length; c++) {
            var categoryName = orderedCategories[c];
            var categoryItems = grouped[categoryName];

            if (currentY > 258) {
              doc.addPage();
              currentY = drawLetterhead(doc, finalCompany, tier, nowStr);
            }

            doc.setFillColor(241, 245, 249);
            doc.setDrawColor(203, 213, 225);
            doc.roundedRect(14, currentY, doc.internal.pageSize.getWidth() - 28, 7.5, 1.5, 1.5, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.5);
            doc.setTextColor(15, 23, 42);
            doc.text(categoryName.toUpperCase() + " (" + categoryItems.length + ")", 17, currentY + 5);

            var bodyRows = categoryItems.map(function (item, idx) {
              var unitPrice = ERP.getSkuPriceForClientType(item.sku, tier);
              return [
                String(idx + 1),
                String(item.sku || ""),
                String(item.name || ""),
                ERP.fmtUsd(unitPrice),
                ERP.fmtBs(unitPrice)
              ];
            });

            doc.autoTable({
              startY: currentY + 8.5,
              margin: { left: 14, right: 14 },
              head: [["#", "SKU", "Producto", "Precio (" + tier + ") USD", "Precio (" + tier + ") Bs."]],
              body: bodyRows,
              theme: "grid",
              styles: {
                fontSize: 8.5,
                cellPadding: 2.2,
                textColor: [15, 23, 42],
                lineColor: [226, 232, 240],
                lineWidth: 0.2
              },
              headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 8.5
              },
              columnStyles: {
                0: { cellWidth: 10, halign: "center" },
                1: { cellWidth: 28, fontStyle: "bold" },
                2: { cellWidth: "auto" },
                3: { cellWidth: 34, halign: "right", fontStyle: "bold" },
                4: { cellWidth: 36, halign: "right" }
              }
            });

            currentY = doc.lastAutoTable.finalY + 7;
          }
        }

        var safeSlug = finalCompany.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "empresa";
        var fileName = "lista-precios-" + safeSlug + "-" + tier.toLowerCase() + ".pdf";
        doc.save(fileName);

        if (ERP.setNotice) {
          ERP.setNotice("ok", "PDF generado para la lista de precios " + tier + " (" + fileName + ").");
        }
      });
    });
  }

  function renderClientesView(root) {
    ensureClientesModalStyles();
    syncAllClientsMetadata();

    var state = ERP.state;
    var clientsList = ERP.getClients();
    var selectedPrintTier = normalizePriceTier(state.selectedPriceListTier || "Normal");

    var rows = clientsList.map(function (c) {
      ensureClientAcquisitionMetadata(c);
      ERP.ensureClientDebt(c.id);
      var bal = Number(state.clientBalanceUsd[c.id] || 0);
      var cDebt = state.clientCrateDebt[c.id];
      var cType = c.clientType || "Normal";

      var contactParts = [];
      if (c.contact) contactParts.push("Contacto: " + c.contact);
      if (c.phone) contactParts.push("Tel: " + c.phone);
      if (c.email) contactParts.push("Correo: " + c.email);

      return (
        '<tr>' +
          '<td>' +
            '<strong>' + ERP.esc(c.name) + '</strong>' +
            (contactParts.length ? '<div class="muted">' + ERP.esc(contactParts.join(" · ")) + '</div>' : '') +
            (c.address ? '<div class="muted">Dir: ' + ERP.esc(c.address) + '</div>' : '') +
          '</td>' +
          '<td>' + ERP.esc(c.rif) + '</td>' +
          '<td><span class="badge ' + ERP.clientTypeBadgeClass(cType) + '">' + ERP.esc(cType) + '</span></td>' +
          '<td>' + ERP.esc(c.zone) + '</td>' +
          '<td>' + (c.creditDays || 0) + ' días · ' + ERP.fmtUsd(c.creditUsd || 0) + '</td>' +
          '<td>' +
            '<strong>' + ERP.esc(c.createdAt) + '</strong>' +
            '<div class="muted">Por: ' + ERP.esc(c.createdBy) + '</div>' +
          '</td>' +
          '<td>' +
            '<div><strong>' + ERP.fmtUsd(bal) + '</strong> <span class="muted">(' + ERP.fmtBs(bal) + ')</span></div>' +
            '<div style="margin-top:6px;"><button type="button" class="sm" data-open-history="' + ERP.esc(c.id) + '">Historial</button></div>' +
          '</td>' +
          '<td>' + ERP.formatClientCratesSummary(cDebt) + '</td>' +
          '<td><div style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="sm" data-edit-client="' + ERP.esc(c.id) + '">Editar</button><button type="button" class="danger sm" data-del-client="' + ERP.esc(c.id) + '">Eliminar</button></div></td>' +
        '</tr>'
      );
    }).join("");

    var priceScaleRows = ERP.getSkus().map(function (s) {
      var pNorm = ERP.getSkuPriceForClientType(s.sku, "Normal");
      var pMay = ERP.getSkuPriceForClientType(s.sku, "Mayorista");
      var pDist = ERP.getSkuPriceForClientType(s.sku, "Distribuidor");
      return (
        '<tr>' +
          '<td><strong>' + ERP.esc(s.sku) + '</strong> · ' + ERP.esc(s.name) + '</td>' +
          '<td>' + ERP.fmtUsd(pNorm) + ' <span class="muted">(' + ERP.fmtBs(pNorm) + ')</span></td>' +
          '<td>' + ERP.fmtUsd(pMay) + ' <span class="muted">(' + ERP.fmtBs(pMay) + ')</span></td>' +
          '<td>' + ERP.fmtUsd(pDist) + ' <span class="muted">(' + ERP.fmtBs(pDist) + ')</span></td>' +
        '</tr>'
      );
    }).join("");

    root.innerHTML =
      '<div class="card">' +
        '<div class="card-header">' +
          '<div><h2 class="card-title">Cartera de Clientes y Estado de Cuenta</h2><p class="muted">Clasificación Normal, Mayorista y Distribuidor con control de crédito, captación y vacíos.</p></div>' +
          '<button type="button" class="primary" id="btn-cli-new">+ Agregar Nuevo Cliente</button>' +
        '</div>' +
        '<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>RIF</th><th>Tipo</th><th>Ruta / Zona</th><th>Crédito</th><th>Captación</th><th>Saldo Pendiente</th><th>Casilleros en Poder</th><th>Acciones</th></tr></thead><tbody>' + (rows || '<tr><td colspan="9" class="muted">Sin clientes registrados.</td></tr>') + '</tbody></table></div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-header" style="gap:10px;flex-wrap:wrap;">' +
          '<div><h3 class="card-title">Escala de Precios por Tipo de Cliente</h3><p class="muted">Se aplica automáticamente al emitir facturas en Ventas según el tipo del cliente.</p></div>' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
            '<select id="print-pricelist-tier" style="padding:7px 10px;border:1px solid #cbd5e1;border-radius:8px;font-weight:700;background:#fff;">' +
              '<option value="Normal"' + (selectedPrintTier === "Normal" ? " selected" : "") + '>Lista Normal</option>' +
              '<option value="Mayorista"' + (selectedPrintTier === "Mayorista" ? " selected" : "") + '>Lista Mayorista</option>' +
              '<option value="Distribuidor"' + (selectedPrintTier === "Distribuidor" ? " selected" : "") + '>Lista Distribuidor</option>' +
            '</select>' +
            '<button type="button" class="primary sm" id="btn-print-pricelist">Imprimir Lista de Precios</button>' +
          '</div>' +
        '</div>' +
        '<div class="table-wrap"><table><thead><tr><th>SKU</th><th>Normal</th><th>Mayorista</th><th>Distribuidor</th></tr></thead><tbody>' + priceScaleRows + '</tbody></table></div>' +
      '</div>';

    document.getElementById("btn-cli-new").onclick = function () { ERP.openNewClientModal(function () { ERP.render(); }); };

    var historyBtns = root.querySelectorAll("button[data-open-history]");
    for (var h = 0; h < historyBtns.length; h++) {
      historyBtns[h].onclick = function () {
        openClientAccountModal(this.getAttribute("data-open-history"));
      };
    }

    var tierSelect = document.getElementById("print-pricelist-tier");
    if (tierSelect) {
      tierSelect.onchange = function () {
        state.selectedPriceListTier = normalizePriceTier(this.value);
        ERP.saveState();
      };
    }

    var printBtn = document.getElementById("btn-print-pricelist");
    if (printBtn) {
      printBtn.onclick = function () {
        var chosenTier = normalizePriceTier(tierSelect ? tierSelect.value : (state.selectedPriceListTier || "Normal"));
        state.selectedPriceListTier = chosenTier;
        ERP.saveState();
        downloadPriceListPdf(chosenTier);
      };
    }

    var editBtns = root.querySelectorAll("button[data-edit-client]");
    for (var e = 0; e < editBtns.length; e++) {
      editBtns[e].onclick = function () { ERP.openEditClientModal(this.getAttribute("data-edit-client"), function () { ERP.render(); }); };
    }

    var delBtns = root.querySelectorAll("button[data-del-client]");
    for (var d = 0; d < delBtns.length; d++) {
      delBtns[d].onclick = function () {
        var cid = this.getAttribute("data-del-client");
        var cl = ERP.getClient(cid);
        if (!confirm("¿Eliminar al cliente '" + cl.name + "' (" + cl.rif + ")?")) return;
        state.clients = state.clients.filter(function (x) { return x.id !== cid; });
        delete state.clientBalanceUsd[cid];
        delete state.clientCrateDebt[cid];
        if (state.selectedSaleClientId === cid) state.selectedSaleClientId = state.clients[0] ? state.clients[0].id : "";
        ERP.setNotice("warn", "Cliente '" + cl.name + "' eliminado.");
        ERP.saveState();
        ERP.render();
      };
    }
  }

  ERP.registerMenuModule("clientes", renderClientesView);
})();