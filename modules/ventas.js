(function () {
  "use strict";

  var ERP = window.DistriFoodERP;
  if (!ERP) return;

  function renderVisitasView(root) {
    var state = ERP.state;
    var visits = Array.isArray(state.visits) ? state.visits : (state.visits = []);
    var clients = ERP.getClients() || [];

    var cOpts = clients.map(function (c) {
      return '<option value="' + ERP.esc(c.id) + '">' + ERP.esc(c.name) + "</option>";
    }).join("");

    var rows = visits.map(function (v) {
      var client = ERP.getClient(v.clientId);
      var clientName = client && client.name ? client.name : (v.clientId || "Cliente no especificado");
      var userName = v.userName || (ERP.getUser() && ERP.getUser().name) || "Usuario";
      var score = parseInt(v.surveyScore, 10);
      if (isNaN(score)) score = 5;

      return (
        "<tr>" +
          "<td>" + ERP.esc(v.date || "") + "</td>" +
          "<td><strong>" + ERP.esc(clientName) + "</strong></td>" +
          "<td>" + ERP.esc(userName) + "</td>" +
          "<td>Exhibición: " + ERP.esc(v.exhibicionOk || "") +
            " · Quiebre: " + ERP.esc(v.stockOut || "") +
            " · Encuesta: <strong>" + score + "/5</strong></td>" +
          "<td>" + ERP.esc(v.notes || "") + "</td>" +
        "</tr>"
      );
    }).join("");

    root.innerHTML =
      '<div class="card">' +
        '<div class="card-header"><h2 class="card-title">Visitas y Encuestas en Ruta</h2></div>' +
        '<div class="grid-3">' +
          '<div class="field"><label>Cliente</label><select id="vis-c">' + cOpts + "</select></div>" +
          '<div class="field"><label>Exhibición</label><select id="vis-e"><option>Sí — Nevera y anaquel frontal</option><option>Parcial</option><option>No</option></select></div>' +
          '<div class="field"><label>Quiebre de Stock</label><select id="vis-o"><option>No</option><option>Sí</option></select></div>' +
        "</div>" +
        '<div class="grid-2">' +
          '<div class="field"><label>Encuesta (1-5)</label><select id="vis-s"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></div>' +
          '<div class="field"><label>Notas</label><input type="text" id="vis-n" placeholder="Observaciones" /></div>' +
        "</div>" +
        '<button type="button" class="primary" id="btn-save-vis">Guardar Visita</button>' +
      "</div>" +
      '<div class="card">' +
        '<h3 class="card-title">Visitas Registradas (' + visits.length + ")</h3>" +
        '<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Usuario</th><th>Encuesta</th><th>Notas</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      "</div>";

    var saveBtn = document.getElementById("btn-save-vis");
    if (saveBtn) {
      saveBtn.onclick = function () {
        var clientSelect = document.getElementById("vis-c");
        var exSelect = document.getElementById("vis-e");
        var outSelect = document.getElementById("vis-o");
        var scoreSelect = document.getElementById("vis-s");
        var notesInput = document.getElementById("vis-n");
        var currentUser = ERP.getUser();

        visits.unshift({
          id: "VIS-" + (300 + visits.length + 1),
          date: new Date().toISOString().slice(0, 10),
          clientId: clientSelect ? clientSelect.value : "",
          userName: currentUser && currentUser.name ? currentUser.name : "Usuario",
          exhibicionOk: exSelect ? exSelect.value : "",
          stockOut: outSelect ? outSelect.value : "No",
          surveyScore: scoreSelect ? (parseInt(scoreSelect.value, 10) || 5) : 5,
          notes: notesInput && notesInput.value.trim() ? notesInput.value.trim() : "Visita registrada."
        });

        if (notesInput) notesInput.value = "";
        ERP.setNotice("ok", "Visita guardada.");
        ERP.saveState();
        ERP.render();
      };
    }
  }

  ERP.registerMenuModule("visitas", renderVisitasView);
})();
