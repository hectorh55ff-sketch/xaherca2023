(function () {
  "use strict";

  var ERP = window.DistriFoodERP;
  if (!ERP) return;

  function isCurrentUserAdmin() {
    var u = typeof ERP.getUser === "function" ? ERP.getUser() : null;
    if (!u) return false;
    var roleStr = String(u.role || u.cargo || "").trim().toLowerCase();
    return roleStr === "administrador" || roleStr === "admin";
  }

  function getCrateFixedPriceBs(ct) {
    var state = ERP.state || {};
    var id = ct && ct.id ? ct.id : "";
    if (state.cratePricesBs && typeof state.cratePricesBs === "object" && id && state.cratePricesBs[id] != null && state.cratePricesBs[id] !== "") {
      var v1 = parseFloat(state.cratePricesBs[id]);
      if (!isNaN(v1) && v1 >= 0) return Number(v1.toFixed(2));
    }
    if (ct && ct.priceBs != null && ct.priceBs !== "") {
      var v2 = parseFloat(ct.priceBs);
      if (!isNaN(v2) && v2 >= 0) return Number(v2.toFixed(2));
    }
    if (ct && ct.fixedPriceBs != null && ct.fixedPriceBs !== "") {
      var v3 = parseFloat(ct.fixedPriceBs);
      if (!isNaN(v3) && v3 >= 0) return Number(v3.toFixed(2));
    }
    return 0;
  }

  function formatFixedBs(val) {
    var num = Number(val || 0);
    return "Bs. " + num.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function safeInitials(nameVal) {
    if (typeof ERP.getCompanyInitials === "function") return ERP.getCompanyInitials(nameVal);
    var clean = String(nameVal || "DF").trim();
    return clean ? clean.slice(0, 2).toUpperCase() : "DF";
  }

  function getSupabaseClientSafe() {
    if (typeof ERP.getSupabaseClient === "function") {
      return ERP.getSupabaseClient();
    }
    if (window.supabase && typeof window.supabase.createClient === "function") {
      var url = ERP.SUPABASE_URL || "https://hanamjgoztionetdttsi.supabase.co";
      var key = ERP.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_1MVs4iqFLbztVBARt1waag_Sxj3ooJJ";
      if (url && key) {
        return window.supabase.createClient(url, key);
      }
    }
    return null;
  }

  function syncAppSettingsToSql(state) {
    if (typeof ERP.saveAppSettingsSql === "function") {
      return ERP.saveAppSettingsSql();
    }
    var client = getSupabaseClientSafe();
    if (!client || !state) return Promise.resolve(false);

    var mergedCrateStock = Object.assign({}, state.crateStock || {});
    if (state.cratePricesBs && typeof state.cratePricesBs === "object") {
      mergedCrateStock._prices_bs = state.cratePricesBs;
    }

    return client
      .from("app_settings")
      .upsert(
        {
          id: "main",
          rate_bs: Number(state.rateBs || 48.5),
          rate_history: Array.isArray(state.rateHistory) ? state.rateHistory : [],
          crate_stock: mergedCrateStock,
          updated_at: new Date().toISOString()
        },
        { onConflict: "id" }
      )
      .then(function (res) {
        if (res.error) throw res.error;
        return true;
      })
      .catch(function (err) {
        console.error("Error guardando app_settings en SQL:", err);
        return false;
      });
  }

  function openUserFormModal(existingUser) {
    var state = ERP.state;
    var rolePermsMap = (ERP.ROLE_PERMS && typeof ERP.ROLE_PERMS === "object") ? ERP.ROLE_PERMS : {};
    var allPermsList = Array.isArray(ERP.ALL_PERMS) ? ERP.ALL_PERMS : [];
    var isEdit = !!existingUser;
    var defaultPerms = Array.isArray(rolePermsMap.Vendedor) ? rolePermsMap.Vendedor.slice() : [];
    var u = existingUser || { id: "", name: "", password: "", role: "Vendedor", zone: "Ruta Centro", phone: "", email: "", active: true, perms: defaultPerms };
    var activePerms = Array.isArray(u.perms) ? u.perms.slice() : (Array.isArray(rolePermsMap[u.role]) ? rolePermsMap[u.role].slice() : []);
    var roleOpts = ["Administrador", "Gerente", "Supervisor", "Vendedor"].map(function (r) {
      return '<option value="' + ERP.esc(r) + '"' + (u.role === r ? " selected" : "") + '>' + ERP.esc(r) + '</option>';
    }).join("");
    var permChecks = allPermsList.map(function (p) {
      var checked = activePerms.indexOf(p.key) !== -1 ? " checked" : "";
      return '<label class="perm-item"><input type="checkbox" class="usr-perm-chk" value="' + ERP.esc(p.key) + '"' + checked + ' /><span>' + ERP.esc(p.label) + '</span></label>';
    }).join("");

    ERP.openModal(
      '<div class="card-header"><div><h3 class="card-title">' + (isEdit ? "Modificar Usuario — " + ERP.esc(u.name) : "Crear Nuevo Usuario") + '</h3><p class="muted">Configure datos personales, cargo/rol y permisos individuales del sistema.</p></div><button type="button" class="sm" onclick="closeModal()">Cerrar</button></div>' +
      '<div class="grid-2"><div class="field"><label>Nombre y Apellido *</label><input type="text" id="uf-name" value="' + ERP.esc(u.name) + '" placeholder="Ej. Luis Ramírez" /></div><div class="field"><label>Clave de Acceso *</label><input type="password" id="uf-password" value="' + ERP.esc(u.password != null ? u.password : "") + '" placeholder="Ej. 1234" autocomplete="new-password" /></div></div>' +
      '<div class="grid-3"><div class="field"><label>Rol / Cargo *</label><select id="uf-role">' + roleOpts + '</select></div><div class="field"><label>Zona / Ruta Asignada *</label><input type="text" id="uf-zone" value="' + ERP.esc(u.zone || "") + '" placeholder="Ej. Ruta Centro / Occidente" /></div><div class="field"><label>Estado del Usuario</label><select id="uf-active"><option value="1"' + (u.active !== false ? " selected" : "") + '>Activo</option><option value="0"' + (u.active === false ? " selected" : "") + '>Inactivo</option></select></div></div>' +
      '<div class="grid-2"><div class="field"><label>Teléfono *</label><input type="text" id="uf-phone" value="' + ERP.esc(u.phone || "") + '" placeholder="Ej. 0414-5551234" /></div><div class="field"><label>Correo Electrónico</label><input type="email" id="uf-email" value="' + ERP.esc(u.email || "") + '" placeholder="Ej. usuario@empresa.com" /></div></div>' +
      '<div class="field" style="margin-top:6px;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;"><label style="margin:0;">Permisos del Usuario</label><div style="display:flex;gap:6px;"><button type="button" class="sm" id="btn-uf-preset-role">Cargar Permisos del Rol</button><button type="button" class="sm" id="btn-uf-all-perms">Marcar Todos</button></div></div><div class="perm-grid" id="uf-perms-grid">' + permChecks + '</div></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;"><button type="button" class="sm" onclick="closeModal()">Cancelar</button><button type="button" class="success sm" id="btn-save-user-form">' + (isEdit ? "Guardar Cambios del Usuario" : "Crear Usuario") + '</button></div>'
    );

    function setPermBoxes(keys) {
      var list = Array.isArray(keys) ? keys : [];
      var boxes = document.querySelectorAll("input.usr-perm-chk");
      for (var i = 0; i < boxes.length; i++) boxes[i].checked = list.indexOf(boxes[i].value) !== -1;
    }

    document.getElementById("btn-uf-preset-role").onclick = function () { setPermBoxes(rolePermsMap[document.getElementById("uf-role").value] || []); };
    document.getElementById("btn-uf-all-perms").onclick = function () { setPermBoxes(allPermsList.map(function (p) { return p.key; })); };

    document.getElementById("btn-save-user-form").onclick = function () {
      var nameVal = (document.getElementById("uf-name").value || "").trim();
      var passVal = String((document.getElementById("uf-password") && document.getElementById("uf-password").value) || "");
      var roleVal = document.getElementById("uf-role").value;
      var zoneVal = (document.getElementById("uf-zone").value || "").trim() || "General";
      var phoneVal = (document.getElementById("uf-phone").value || "").trim();
      var emailVal = (document.getElementById("uf-email").value || "").trim();
      var activeVal = document.getElementById("uf-active").value === "1";

      if (!nameVal) { ERP.setNotice("bad", "Debe ingresar el nombre y apellido del usuario."); ERP.closeModal(); ERP.render(); return; }
      var selectedPerms = [];
      var checkedBoxes = document.querySelectorAll("input.usr-perm-chk:checked");
      for (var i = 0; i < checkedBoxes.length; i++) selectedPerms.push(checkedBoxes[i].value);

      if (isEdit) {
        u.name = nameVal; u.password = passVal; u.role = roleVal; u.zone = zoneVal; u.phone = phoneVal; u.email = emailVal; u.active = activeVal; u.perms = selectedPerms;
        ERP.closeModal(); ERP.setNotice("ok", "Usuario '" + u.name + "' y sus permisos (" + selectedPerms.length + ") actualizados."); ERP.saveState(); ERP.render(); return;
      }
      var created = { id: "u" + ((typeof ERP.getUsers === "function" ? ERP.getUsers().length : 0) + 1) + "_" + Math.floor(100 + Math.random() * 900), name: nameVal, password: passVal, role: roleVal, zone: zoneVal, phone: phoneVal, email: emailVal, active: activeVal, perms: selectedPerms };
      state.users.push(created);
      ERP.closeModal(); ERP.setNotice("ok", "Usuario '" + created.name + "' (" + created.role + ") creado con " + selectedPerms.length + " permiso(s)."); ERP.saveState(); ERP.render();
    };
  }

  function renderAdministracionView(root) {
    if (!root || !ERP.state) return;
    try {
      var state = ERP.state;
      var comp = (typeof ERP.getCompany === "function" ? ERP.getCompany() : null) || {};
      var usersList = typeof ERP.getUsers === "function" ? ERP.getUsers() : [];
      var cTypes = typeof ERP.getCrateTypes === "function" ? ERP.getCrateTypes() : [];
      var rolePermsMap = (ERP.ROLE_PERMS && typeof ERP.ROLE_PERMS === "object") ? ERP.ROLE_PERMS : {};
      var allPermsList = Array.isArray(ERP.ALL_PERMS) ? ERP.ALL_PERMS : [];
      var isAdmin = isCurrentUserAdmin();
      var pendingLogoDataUrl = comp.logoDataUrl || "";
      var todayStr = typeof ERP.getTodayIsoDate === "function" ? ERP.getTodayIsoDate() : new Date().toISOString().slice(0, 10);
      var rateHist = typeof ERP.normalizeRateHistory === "function"
        ? ERP.normalizeRateHistory(state.rateHistory, state.rateBs)
        : (Array.isArray(state.rateHistory) ? state.rateHistory : []);
      state.rateHistory = rateHist;

      if (!state.cratePricesBs || typeof state.cratePricesBs !== "object") {
        state.cratePricesBs = {};
      }
      if (!Array.isArray(state.cratePriceHistory)) {
        state.cratePriceHistory = [];
      }

      var cratePriceRows = cTypes.map(function (ct) {
        var currentPrice = getCrateFixedPriceBs(ct);
        var lastHist = null;
        for (var h = state.cratePriceHistory.length - 1; h >= 0; h--) {
          if (String(state.cratePriceHistory[h].crateId) === String(ct.id)) {
            lastHist = state.cratePriceHistory[h];
            break;
          }
        }
        var metaText = lastHist
          ? ("Último ajuste: " + ERP.esc(lastHist.date || "—") + " por " + ERP.esc(lastHist.updatedBy || "Admin"))
          : "Precio fijo vigente en Bs.";

        return (
          '<tr>' +
            '<td><strong>' + ERP.esc(ct.name) + '</strong><div class="muted">' + ERP.esc(ct.id) + '</div></td>' +
            '<td><strong>' + formatFixedBs(currentPrice) + '</strong><div class="muted">' + metaText + '</div></td>' +
            '<td>' +
              '<input type="number" step="0.01" min="0" class="adm-crate-price-input" data-crate-price-inp="' + ERP.esc(ct.id) + '" value="' + ERP.esc(currentPrice.toFixed(2)) + '" ' + (isAdmin ? "" : "disabled") + ' style="max-width:160px;" />' +
            '</td>' +
            '<td>' +
              (isAdmin
                ? '<button type="button" class="success sm" data-save-crate-price="' + ERP.esc(ct.id) + '">Actualizar Precio</button>'
                : '<span class="badge b-warn">Solo Administrador</span>') +
            '</td>' +
          '</tr>'
        );
      }).join("");

      var rateRows = rateHist.map(function (entry) {
        var isToday = entry.date === todayStr;
        return (
          '<tr>' +
            '<td><strong>' + ERP.esc(entry.date) + '</strong> ' + (isToday ? '<span class="badge b-ok">Hoy</span>' : '') + '</td>' +
            '<td><strong>Bs. ' + Number(entry.rateBs).toFixed(4) + '</strong></td>' +
            '<td>' + ERP.esc(entry.updatedAt || "—") + '</td>' +
            '<td>' + ERP.esc(entry.updatedBy || "—") + '</td>' +
            '<td>' +
              '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
                '<button type="button" class="warn sm" data-edit-rate-date="' + ERP.esc(entry.date) + '" data-edit-rate-val="' + ERP.esc(Number(entry.rateBs).toFixed(4)) + '">Cargar / Editar</button>' +
                (!isToday ? '<button type="button" class="danger sm" data-del-rate-date="' + ERP.esc(entry.date) + '">Eliminar</button>' : '') +
              '</div>' +
            '</td>' +
          '</tr>'
        );
      }).join("");

      var userRows = usersList.map(function (u) {
        var uPerms = Array.isArray(u.perms) ? u.perms : (Array.isArray(rolePermsMap[u.role]) ? rolePermsMap[u.role] : []);
        var permNames = uPerms.map(function (k) {
          var found = null;
          for (var ap = 0; ap < allPermsList.length; ap++) {
            if (allPermsList[ap].key === k) { found = allPermsList[ap]; break; }
          }
          return found ? found.label : k;
        });
        var permBadges = permNames.length
          ? permNames.map(function (pn) { return '<span class="badge b-info" style="margin:2px 2px 0 0;">' + ERP.esc(pn) + '</span>'; }).join("")
          : '<span class="muted">Sin permisos asignados</span>';

        return (
          '<tr>' +
            '<td><strong>' + ERP.esc(u.name) + '</strong><div class="muted">' + ERP.esc(u.email || "—") + ' · ' + ERP.esc(u.phone || "—") + '</div></td>' +
            '<td><strong>' + ERP.esc(u.role) + '</strong><div class="muted">Zona: ' + ERP.esc(u.zone || "—") + '</div></td>' +
            '<td><span class="badge ' + (u.active !== false ? "b-ok" : "b-bad") + '">' + (u.active !== false ? "Activo" : "Inactivo") + '</span></td>' +
            '<td>' + permBadges + '</td>' +
            '<td><div style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="warn sm" data-edit-user="' + ERP.esc(u.id) + '">Modificar / Permisos</button><button type="button" class="danger sm" data-del-user="' + ERP.esc(u.id) + '">Eliminar</button></div></td>' +
          '</tr>'
        );
      }).join("");

      root.innerHTML =
        '<div class="card">' +
          '<div class="card-header">' +
            '<div><h2 class="card-title">Precio Fijo en Bs. por Tipo de Casillero</h2><p class="muted">Monto fijo en Bolívares por casillero. Solo el <strong>Administrador</strong> puede modificarlo cuando el proveedor aumente el precio de los casilleros.</p></div>' +
            '<span class="badge ' + (isAdmin ? "b-ok" : "b-warn") + '">' + (isAdmin ? "Modo Administrador: Edición Habilitada" : "Solo Lectura (Requiere Administrador)") + '</span>' +
          '</div>' +
          '<div class="table-wrap"><table><thead><tr><th>Tipo de Casillero</th><th>Precio Fijo Actual (Bs.)</th><th>Nuevo Precio Fijo (Bs.)</th><th>Acción</th></tr></thead><tbody>' +
            (cratePriceRows || '<tr><td colspan="4" class="muted">No hay tipos de casilleros configurados.</td></tr>') +
          '</tbody></table></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-header"><div><h2 class="card-title">Tasa Cambiaria del Día (Historial Diario Bs/$)</h2><p class="muted">Registre o actualice la tasa cambiaria por fecha. Se guarda en el historial diario del sistema y en SQL.</p></div><span class="badge b-ok">Tasa Actual: Bs. ' + Number(state.rateBs || 48.5).toFixed(4) + '</span></div>' +
          '<div class="grid-3" style="align-items:end;">' +
            '<div class="field" style="margin-bottom:0;"><label>Fecha *</label><input type="date" id="adm-rate-date" value="' + ERP.esc(todayStr) + '" /></div>' +
            '<div class="field" style="margin-bottom:0;"><label>Tasa Bs/$ *</label><input type="number" step="0.0001" min="0.0001" id="adm-rate-value" value="' + ERP.esc(Number(state.rateBs || 48.5).toFixed(4)) + '" /></div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" class="success" id="btn-adm-save-rate">Guardar Tasa del Día</button></div>' +
          '</div>' +
          '<div class="table-wrap" style="margin-top:14px;"><table><thead><tr><th>Fecha</th><th>Tasa Bs/$</th><th>Hora</th><th>Registrado Por</th><th>Acciones</th></tr></thead><tbody>' + rateRows + '</tbody></table></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-header"><div><h2 class="card-title">Datos de la Empresa y Logo</h2><p class="muted">Agregue o edite el nombre de la empresa, dirección, teléfonos y logotipo que se muestran en el sistema.</p></div><div class="logo-preview-box" id="adm-logo-preview">' + (pendingLogoDataUrl ? '<img src="' + ERP.esc(pendingLogoDataUrl) + '" alt="Logo" />' : ERP.esc(safeInitials(comp.name))) + '</div></div>' +
          '<div class="grid-3"><div class="field"><label>Nombre de la Empresa *</label><input type="text" id="adm-comp-name" value="' + ERP.esc(comp.name || "") + '" placeholder="Ej. Distribuidora Central C.A." /></div><div class="field"><label>RIF / Identificación Fiscal</label><input type="text" id="adm-comp-rif" value="' + ERP.esc(comp.rif || "") + '" placeholder="Ej. J-40982133-0" /></div><div class="field"><label>Teléfonos de Contacto *</label><input type="text" id="adm-comp-phones" value="' + ERP.esc(comp.phones || "") + '" placeholder="Ej. 0414-3120091 / 0261-7410020" /></div></div>' +
          '<div class="grid-2"><div class="field"><label>Dirección Fiscal / Operativa *</label><input type="text" id="adm-comp-address" value="' + ERP.esc(comp.address || "") + '" placeholder="Ej. Av. 15 Delicias, Sector Norte" /></div><div class="field"><label>Correo de Contacto</label><input type="email" id="adm-comp-email" value="' + ERP.esc(comp.email || "") + '" placeholder="Ej. administracion@empresa.com" /></div></div>' +
          '<div class="grid-2" style="align-items:end;"><div class="field" style="margin-bottom:0;"><label>Subir Logo de la Empresa (Imagen)</label><input type="file" id="adm-comp-logo-file" accept="image/*" /></div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;"><button type="button" class="sm" id="btn-adm-clear-logo">Quitar Logo</button><button type="button" class="success" id="btn-adm-save-company">Guardar Datos de Empresa</button></div></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-header"><div><h2 class="card-title">Administración de Usuarios y Permisos (' + usersList.length + ')</h2><p class="muted">Cree usuarios, modifique su información y asigne o edite los permisos de cada usuario.</p></div><button type="button" class="primary sm" id="btn-adm-new-user">+ Crear Nuevo Usuario</button></div>' +
          '<div class="table-wrap"><table><thead><tr><th>Usuario / Contacto</th><th>Rol y Zona</th><th>Estado</th><th>Permisos Asignados</th><th>Acciones</th></tr></thead><tbody>' + userRows + '</tbody></table></div>' +
        '</div>';

      var saveCratePriceBtns = root.querySelectorAll("button[data-save-crate-price]");
      for (var cpIdx = 0; cpIdx < saveCratePriceBtns.length; cpIdx++) {
        saveCratePriceBtns[cpIdx].onclick = function () {
          if (!isCurrentUserAdmin()) {
            ERP.setNotice("bad", "Acceso restringido: solo un usuario con rol Administrador puede modificar el precio fijo en Bs. de los casilleros.");
            ERP.render();
            return;
          }
          var crateId = this.getAttribute("data-save-crate-price");
          var inp = root.querySelector('input[data-crate-price-inp="' + crateId + '"]');
          var newPrice = inp ? parseFloat(inp.value) : NaN;
          if (isNaN(newPrice) || newPrice < 0) {
            ERP.setNotice("bad", "Ingrese un monto válido en Bs. mayor o igual a cero.");
            ERP.render();
            return;
          }
          newPrice = Number(newPrice.toFixed(2));
          var ctObj = typeof ERP.getCrateType === "function" ? ERP.getCrateType(crateId) : { id: crateId, name: crateId };
          var oldPrice = getCrateFixedPriceBs(ctObj);

          if (oldPrice !== newPrice) {
            var confirmMsg =
              "¿Confirmar cambio de precio fijo de '" + (ctObj && ctObj.name ? ctObj.name : crateId) + "'?\n" +
              "Precio anterior: " + formatFixedBs(oldPrice) + "\n" +
              "Nuevo precio fijo: " + formatFixedBs(newPrice) + "\n" +
              "Este monto permanecerá fijo hasta un nuevo ajuste administrativo.";
            if (typeof window.confirm === "function" && !window.confirm(confirmMsg)) {
              return;
            }
          }

          state.cratePricesBs[crateId] = newPrice;
          if (Array.isArray(state.crateTypes)) {
            for (var t = 0; t < state.crateTypes.length; t++) {
              if (state.crateTypes[t].id === crateId) {
                state.crateTypes[t].priceBs = newPrice;
                state.crateTypes[t].fixedPriceBs = newPrice;
                break;
              }
            }
          }

          var adminUser = typeof ERP.getUser === "function" ? ERP.getUser() : null;
          state.cratePriceHistory.push({
            date: todayStr,
            crateId: crateId,
            crateName: ctObj && ctObj.name ? ctObj.name : crateId,
            oldPriceBs: oldPrice,
            newPriceBs: newPrice,
            updatedBy: (adminUser && adminUser.name) || "Administrador"
          });

          ERP.setNotice("ok", "Precio fijo de '" + (ctObj && ctObj.name ? ctObj.name : crateId) + "' establecido en " + formatFixedBs(newPrice) + ".");
          ERP.saveState();
          syncAppSettingsToSql(state);
          ERP.render();
        };
      }

      document.getElementById("btn-adm-save-rate").onclick = function () {
        var dtVal = (document.getElementById("adm-rate-date").value || "").trim();
        var rVal = parseFloat(document.getElementById("adm-rate-value").value);
        if (!dtVal) { ERP.setNotice("bad", "Debe seleccionar una fecha válida para la tasa."); ERP.render(); return; }
        if (isNaN(rVal) || rVal <= 0) { ERP.setNotice("bad", "Ingrese una tasa cambiaria mayor a cero."); ERP.render(); return; }
        var saved = typeof ERP.recordDailyRate === "function"
          ? ERP.recordDailyRate(dtVal, rVal, ERP.getUser() && ERP.getUser().name)
          : { date: dtVal, rateBs: rVal };
        if (!saved) { ERP.setNotice("bad", "No se pudo guardar la tasa cambiaria."); ERP.render(); return; }
        ERP.setNotice("ok", "Tasa del " + saved.date + " guardada en Bs. " + Number(saved.rateBs).toFixed(4) + " por $.");
        ERP.saveState();
        syncAppSettingsToSql(state);
        ERP.render();
      };

      var editRateBtns = root.querySelectorAll("button[data-edit-rate-date]");
      for (var rBtnIdx = 0; rBtnIdx < editRateBtns.length; rBtnIdx++) {
        editRateBtns[rBtnIdx].onclick = function () {
          var dStr = this.getAttribute("data-edit-rate-date");
          var vStr = this.getAttribute("data-edit-rate-val");
          var dInp = document.getElementById("adm-rate-date");
          var vInp = document.getElementById("adm-rate-value");
          if (dInp) dInp.value = dStr;
          if (vInp) {
            vInp.value = Number(vStr || state.rateBs || 48.5).toFixed(4);
            vInp.focus();
          }
        };
      }

      var delRateBtns = root.querySelectorAll("button[data-del-rate-date]");
      for (var dBtnIdx = 0; dBtnIdx < delRateBtns.length; dBtnIdx++) {
        delRateBtns[dBtnIdx].onclick = function () {
          var dStr = this.getAttribute("data-del-rate-date");
          var res = typeof ERP.deleteRateHistoryEntry === "function" ? ERP.deleteRateHistoryEntry(dStr) : { ok: true };
          if (!res.ok) {
            ERP.setNotice("bad", res.error);
            ERP.render();
            return;
          }
          ERP.setNotice("ok", "Registro de tasa de la fecha " + dStr + " eliminado.");
          ERP.saveState();
          syncAppSettingsToSql(state);
          ERP.render();
        };
      }

      var logoFileInp = document.getElementById("adm-comp-logo-file");
      if (logoFileInp) {
        logoFileInp.onchange = function () {
          var f = this.files && this.files[0];
          if (!f) return;
          if (typeof FileReader === "undefined") { ERP.setNotice("warn", "Su navegador no soporta lectura de archivos de imagen local."); ERP.render(); return; }
          var reader = new FileReader();
          reader.onload = function (ev) {
            pendingLogoDataUrl = ev && ev.target ? ev.target.result : "";
            var box = document.getElementById("adm-logo-preview");
            if (box) box.innerHTML = pendingLogoDataUrl ? '<img src="' + ERP.esc(pendingLogoDataUrl) + '" alt="Logo" />' : ERP.esc(safeInitials((document.getElementById("adm-comp-name") && document.getElementById("adm-comp-name").value) || comp.name));
          };
          reader.readAsDataURL(f);
        };
      }

      document.getElementById("btn-adm-clear-logo").onclick = function () {
        pendingLogoDataUrl = "";
        if (logoFileInp) logoFileInp.value = "";
        var box = document.getElementById("adm-logo-preview");
        if (box) box.textContent = safeInitials((document.getElementById("adm-comp-name") && document.getElementById("adm-comp-name").value) || comp.name);
      };

      document.getElementById("btn-adm-save-company").onclick = function () {
        var nameVal = (document.getElementById("adm-comp-name").value || "").trim();
        if (!nameVal) { ERP.setNotice("bad", "El nombre de la empresa no puede quedar vacío."); ERP.render(); return; }
        state.company = {
          name: nameVal,
          rif: (document.getElementById("adm-comp-rif").value || "").trim(),
          phones: (document.getElementById("adm-comp-phones").value || "").trim(),
          address: (document.getElementById("adm-comp-address").value || "").trim(),
          email: (document.getElementById("adm-comp-email").value || "").trim(),
          logoDataUrl: pendingLogoDataUrl
        };
        ERP.setNotice("ok", "Datos de la empresa '" + nameVal + "' guardados correctamente.");
        ERP.saveState();
        ERP.render();
      };

      document.getElementById("btn-adm-new-user").onclick = function () { openUserFormModal(null); };
      var editUserBtns = root.querySelectorAll("button[data-edit-user]");
      for (var i = 0; i < editUserBtns.length; i++) {
        editUserBtns[i].onclick = function () {
          var uid = this.getAttribute("data-edit-user");
          var target = (typeof ERP.getUsers === "function" ? ERP.getUsers() : []).filter(function (item) { return item.id === uid; })[0];
          if (target) openUserFormModal(target);
        };
      }
      var delUserBtns = root.querySelectorAll("button[data-del-user]");
      for (var j = 0; j < delUserBtns.length; j++) {
        delUserBtns[j].onclick = function () {
          var uid = this.getAttribute("data-del-user");
          var list = typeof ERP.getUsers === "function" ? ERP.getUsers() : [];
          if (list.length <= 1) { ERP.setNotice("bad", "Debe existir al menos un usuario en el sistema."); ERP.render(); return; }
          if (uid === state.currentUserId) { ERP.setNotice("bad", "No puede eliminar el usuario con la sesión actualmente activa."); ERP.render(); return; }
          var idx = -1;
          for (var k = 0; k < list.length; k++) { if (list[k].id === uid) { idx = k; break; } }
          if (idx === -1) return;
          var removed = list[idx];
          list.splice(idx, 1);
          ERP.setNotice("ok", "Usuario '" + removed.name + "' eliminado.");
          ERP.saveState();
          ERP.render();
        };
      }
    } catch (err) {
      root.innerHTML =
        '<div class="card"><h3 class="card-title">Error en Administración</h3><p class="muted">' +
        String(err && err.message ? err.message : err) +
        '</p></div>';
    }
  }

  ERP.registerMenuModule("administracion", renderAdministracionView);
})();
```[cite: 9]

Con `administracion.js` listo, ¿qué módulo de `modules/` te gustaría adjuntar o revisar a continuación (por ejemplo `clientes.js`, `ventas.js`, `despacho.js`, `almacen.js` o `retornables.js`)?
