(function () {
  "use strict";

  var ERP = window.DistriFoodERP;
  if (!ERP) return;

  function renderVisitasView(root) {
    var state = ERP.state;
    var cOpts = ERP.getClients().map(function (c) { return '<option value="' + ERP.esc(c.id) + '">' + ERP.esc(c.name) + '</option>'; }).join("");
    var rows = state.visits.map(function (v) {
      return '<tr><td>' + ERP.esc(v.date) + '</td><td><strong>' + ERP.esc(ERP.getClient(v.clientId).name) + '</strong></td><td>' + ERP.esc(v.userName) + '</td><td>Exhibición: ' + ERP.esc(v.exhibicionOk) + ' · Quiebre: ' + ERP.esc(v.stockOut) + ' · Encuesta: <strong>' + v.surveyScore + '/5</strong></td><td>' + ERP.esc(v.notes) + '</td></tr>';
    }).join("");
    root.innerHTML =
      '<div class="card"><div class="card-header"><h2 class="card-title">Visitas y Encuestas en Ruta</h2></div>' +
        '<div class="grid-3"><div class="field"><label>Cliente</label><select id="vis-c">' + cOpts + '</select></div><div class="field"><label>Exhibición</label><select id="vis-e"><option>Sí — Nevera y anaquel frontal</option><option>Parcial</option><option>No</option></select></div><div class="field"><label>Quiebre de Stock</label><select id="vis-o"><option>No</option><option>Sí</option></select></div></div>' +
        '<div class="grid-2"><div class="field"><label>Encuesta (1-5)</label><select id="vis-s"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></div><div class="field"><label>Notas</label><input type="text" id="vis-n" placeholder="Observaciones" /></div></div>' +
        '<button type="button" class="primary" id="btn-save-vis">Guardar Visita</button></div>' +
      '<div class="card"><h3 class="card-title">Visitas Registradas (' + state.visits.length + ')</h3><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Usuario</th><th>Encuesta</th><th>Notas</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    document.getElementById("btn-save-vis").onclick = function () {
      state.visits.unshift({
        id: "VIS-" + (300 + state.visits.length + 1), date: new Date().toISOString().slice(0, 10),
        clientId: document.getElementById("vis-c").value, userName: ERP.getUser().name,
        exhibicionOk: document.getElementById("vis-e").value, stockOut: document.getElementById("vis-o").value,
        surveyScore: parseInt(document.getElementById("vis-s").value, 10) || 5,
        notes: document.getElementById("vis-n").value.trim() || "Visita registrada."
      });
      ERP.setNotice("ok", "Visita guardada.");
      ERP.saveState();
      ERP.render();
    };
  }

  ERP.registerMenuModule("visitas", renderVisitasView);
})();