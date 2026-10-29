// Members: add, edit and delete members, grouping by module, and the Map members dialog
let editingMemberId = null; // set while the member dialog edits an existing member

function showMemberDialog(title, saveLabel, name, role, mods) {
  $("#dlgT").textContent = title;
  $("#save").textContent = saveLabel;
  $("#nm").value = name;
  fillRole($("#rl"), false, role);
  nmCur = mods.slice();
  MS($("#nmods"), S.modules, nmCur, a => (nmCur = a), "Select modules");
  $("#dlg").showModal();
  $("#nm").focus();
}

function openAdd() {
  const dash = view !== "mark",
    def = dash ? (dmod && dmod !== "__none" ? dmod : "") : mset.length === 1 && mset[0] !== "__none" ? mset[0] : "";
  editingMemberId = null;
  showMemberDialog("Add team member", "Add", "", dash ? drole : "", def ? [def] : []);
}

function openEditMember(id) {
  const m = S.members.find(x => x.id === id);
  if (!m) return;
  editingMemberId = id;
  showMemberDialog("Edit member", "Save changes", m.name, m.role || "", m.mods || []);
}

// Removes the member, every attendance mark they have and any day they were set to take the scrum.
function deleteMember(id, onDone) {
  const m = S.members.find(x => x.id === id);
  if (!m) return;
  ask(
    "Delete " + m.name + "?",
    "This permanently deletes " + m.name + " and all their attendance records. This can’t be undone.",
    "Delete",
    () => {
      S.members = S.members.filter(x => x !== m);
      Object.values(S.att).forEach(t => delete t[m.id]);
      Object.keys(S.lead).forEach(k => {
        if (S.lead[k] === m.id) delete S.lead[k];
      });
      persist();
      toast(m.name + " deleted");
      if (onDone) onDone();
      else route();
    },
  );
}

$("#addBtn").onclick = $("#addBtn2").onclick = openAdd;
$("#cancel").onclick = () => $("#dlg").close();
$("#save").onclick = () => {
  const name = $("#nm").value.trim();
  if (!name) {
    $("#nm").focus();
    return;
  }
  const role = $("#rl").value.trim(),
    mods = nmSel();
  const existing = editingMemberId && S.members.find(x => x.id === editingMemberId);
  if (existing) {
    existing.name = name;
    existing.role = role;
    setMods(existing, mods);
    toast(name + " updated");
  } else {
    S.members.push({ id: "m" + Date.now(), name, role, mods, mod: mods[0] || "" });
  }
  editingMemberId = null;
  persist();
  $("#dlg").close();
  if ($("#mapdlg").open) mapRender();
  else route();
};
$("#dlg").addEventListener("keydown", e => {
  if (e.key === "Enter") $("#save").click();
});
const setMods = (m, a) => {
  m.mods = S.modules.filter(x => a.includes(x));
  m.mod = m.mods[0] || "";
};
function expandG(L, f) {
  const r = [],
    okG = x =>
      !f ||
      (Array.isArray(f)
        ? !f.length || f.some(g => (g === "__none" ? x === "" : x === g))
        : f === "__none"
          ? x === ""
          : x === f);
  L.forEach(m => {
    (m.mods && m.mods.length ? m.mods : [""]).forEach(x => {
      if (okG(x)) r.push(Object.assign({}, m, { _g: x }));
    });
  });
  const i = x => {
    const k = S.modules.indexOf(x);
    return k < 0 ? 999 : k;
  };
  return r.sort((a, b) => i(a._g) - i(b._g));
}
$("#nmods").onclick = e => {
  const b = e.target.closest(".mt");
  if (b) b.classList.toggle("on");
};
function mapSel() {
  const n = document.querySelectorAll("#mapList .mchk:checked").length;
  $("#mapBulk").hidden = !n;
  $("#mapCnt").textContent = n + " selected";
}
function mapRender() {
  const ids = [...document.querySelectorAll("#mapList .mchk:checked")].map(c => c.dataset.id);
  $("#mapList").innerHTML =
    S.members
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        m =>
          `<div class="mp" data-s="${esc((m.name + " " + (m.role || "")).toLowerCase())}"><input type="checkbox" class="mchk" data-id="${esc(m.id)}" aria-label="Select ${esc(m.name)}"><div class="mn"><span class="av" style="--h:${hue(m.name)};width:32px;height:32px;font-size:11px">${esc(ini(m.name))}</span><b>${esc(m.name)}</b></div><select class="mr" data-id="${esc(m.id)}" aria-label="Role for ${esc(m.name)}">${roleOpts(m.role || "")}</select><div class="mhost" data-id="${esc(m.id)}"></div><div class="mpact"><button type="button" class="iconbtn mp-edit" data-id="${esc(m.id)}" title="Edit ${esc(m.name)}" aria-label="Edit ${esc(m.name)}">✏️</button><button type="button" class="iconbtn danger mp-del" data-id="${esc(m.id)}" title="Delete ${esc(m.name)}" aria-label="Delete ${esc(m.name)}">🗑</button></div></div>`,
      )
      .join("") || `<p class="hint" style="padding:14px">No members yet.</p>`;
  document.querySelectorAll("#mapList .mhost").forEach(h => {
    const m = S.members.find(y => y.id === h.dataset.id);
    MS(
      h,
      S.modules,
      m.mods || [],
      a => {
        setMods(m, a);
        persist();
        toast(m.name + " → " + (m.mods.join(", ") || "no modules"));
      },
      "Select modules",
    );
  });
  MS($("#mapTo"), S.modules, bulkSel, a => (bulkSel = a), "Choose modules");
  $("#mapRole").innerHTML = S.roles.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
  document.querySelectorAll("#mapList .mchk").forEach(c => {
    c.checked = ids.includes(c.dataset.id);
  });
  $("#mapAll").checked = false;
  mapSel();
  $("#mapQ").oninput();
  $("#mapFoot").textContent =
    S.members.length + " members · " + S.modules.length + " modules · " + S.roles.length + " roles";
}
$("#mapQ").oninput = () => {
  const q = $("#mapQ").value.trim().toLowerCase();
  document.querySelectorAll("#mapList .mp").forEach(r => {
    r.hidden = !!q && !r.dataset.s.includes(q);
  });
};
const openMap = () => {
  if (!S.modules.length) {
    toast("Add a module first");
    return;
  }
  $("#mapQ").value = "";
  mapRender();
  $("#mapdlg").showModal();
};
$("#mapBtn").onclick = $("#mapBtn2").onclick = openMap;
$("#mapClose").onclick = () => $("#mapdlg").close();
$("#mapdlg").addEventListener("close", () => route());
$("#mapAll").onchange = e => {
  document.querySelectorAll("#mapList .mp:not([hidden]) .mchk").forEach(c => (c.checked = e.target.checked));
  mapSel();
};
$("#mapList").onclick = e => {
  const edit = e.target.closest(".mp-edit"),
    del = e.target.closest(".mp-del");
  if (edit) {
    openEditMember(edit.dataset.id);
    return;
  }
  if (del) {
    deleteMember(del.dataset.id, mapRender);
    return;
  }
  const b = e.target.closest(".mt");
  if (!b) return;
  const mm = S.members.find(y => y.id === b.dataset.id),
    n = b.dataset.m,
    has = (mm.mods || []).includes(n);
  setMods(mm, has ? mm.mods.filter(x => x !== n) : [...(mm.mods || []), n]);
  b.classList.toggle("on", !has);
  persist();
  toast(mm.name + (has ? " removed from " : " added to ") + n);
};
$("#mapList").onchange = e => {
  if (e.target.matches(".mchk")) {
    mapSel();
    return;
  }
  const r = e.target.closest(".mr");
  if (!r) return;
  const mm = S.members.find(y => y.id === r.dataset.id);
  mm.role = r.value;
  persist();
  toast(mm.name + " → " + (r.value || "No role"));
};
const picked = () => [...document.querySelectorAll("#mapList .mchk:checked")].map(c => c.dataset.id);
const bulk = add => {
  const ids = picked(),
    ns = bulkSel;
  if (!ids.length) return;
  if (!ns.length) {
    toast("Choose at least one module");
    return;
  }
  S.members.forEach(m => {
    if (ids.includes(m.id)) {
      const c = m.mods || [];
      setMods(m, add ? [...c, ...ns] : c.filter(x => !ns.includes(x)));
    }
  });
  persist();
  mapRender();
  toast(ids.length + " member" + (ids.length > 1 ? "s" : "") + (add ? " added to " : " removed from ") + ns.join(", "));
};
$("#mapApply").onclick = () => bulk(true);
$("#mapRemove").onclick = () => bulk(false);
$("#mapSetRole").onclick = () => {
  const ids = picked(),
    r = $("#mapRole").value;
  if (!ids.length) return;
  S.members.forEach(m => {
    if (ids.includes(m.id)) m.role = r;
  });
  persist();
  mapRender();
  toast(ids.length + " member" + (ids.length > 1 ? "s" : "") + " set to " + r);
};
let nmCur = [];
const nmSel = () => S.modules.filter(x => nmCur.includes(x));
