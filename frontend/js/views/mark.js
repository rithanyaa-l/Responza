// Mark attendance view: date picker, member rows, per-module submit, summary
// Status buttons, counts and sections are generated from the statuses in settings.
function markE() {
  const r = S.att[md] || {},
    o = {};
  for (const k in r) if (stOf(r[k])) o[k] = r[k];
  return o;
}
const countLine = c =>
  STS()
    .map(s => c[s.code] + " " + lc(s.label))
    .join(", ");
function renderMark() {
  const dt = keyDate(md),
    work = isWorkDay(md),
    hol = holidayOf(md);
  $("#bigD").textContent = dt.getDate() + " " + MN[dt.getMonth()] + " " + dt.getFullYear();
  $("#dayInfo").textContent =
    DNL[dt.getDay()] + (md === todayKey() ? " · Today" : "") + (work ? "" : " · " + offLabel(md) + " · not tracked");
  $("#mCal").innerHTML = calHTML("m", mcal.y, mcal.m, md, false);
  const we = !work,
    e = markE();
  const ld = $("#leadSel");
  ld.innerHTML =
    `<option value="">${esc(leadLabel())} (default)</option>` +
    (S.members.length
      ? `<optgroup label="Assigned by ${esc(leadLabel())}">` +
        S.members
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`)
          .join("") +
        `</optgroup>`
      : "");
  ld.value = S.lead[md] || "";
  ld.disabled = we;
  const lk = lockedIds(md),
    ML = msA(mset),
    n = Object.assign(zeroCounts(), { "": 0 });
  ML.forEach(mm => n[e[mm.id] || ""]++);
  const groups = [...STS().map(s => [s.code, s.label, s.color]), ["", "Not marked", "var(--muted)"]];
  $("#mKpis").innerHTML = groups
    .map(
      ([c, t, col]) =>
        `<div class="card kpi" style="--k:${col}"><small>${esc(t)}</small><b style="color:${col}">${n[c]}</b></div>`,
    )
    .join("");
  $("#mList").innerHTML =
    mRows(ML)
      .map((mm, i, a) =>
        mm._empty
          ? gh(mm._g, a, e) +
            `<p class="hint" data-g="${esc(mm._g)}"${gOpen(mm._g) ? "" : " hidden"} style="padding:10px 4px 14px">No members in ${esc(mm._g)} yet. Use “Map members” or “+ Add member” to add some.</p>`
          : (i === 0 || a[i - 1]._g !== mm._g ? gh(mm._g, a, e) : "") +
            `<div class="mrow" data-g="${esc(mm._g || "")}"${gOpen(mm._g) ? "" : " hidden"}><div class="who"><span class="av" style="--h:${hue(mm.name)}">${esc(ini(mm.name))}</span><div><b>${esc(mm.name)}</b><select class="rsel" data-id="${esc(mm.id)}" aria-label="Role" ${lk.has(mm.id) ? "disabled" : ""}>${roleOpts(mm.role || "")}</select></div></div><div class="opts${we ? " wk" : ""}">${STS()
              .map(
                s =>
                  `<button class="opt ${e[mm.id] === s.code ? "on" : ""}" style="--c:${s.color}" data-id="${esc(mm.id)}" data-c="${esc(s.code)}" ${we || lk.has(mm.id) ? "disabled" : ""}>${esc(s.label)}</button>`,
              )
              .join(
                "",
              )}<button class="edt" data-id="${esc(mm.id)}" title="Edit ${esc(mm.name)}" aria-label="Edit ${esc(mm.name)}">✏️</button><button class="del" data-id="${esc(mm.id)}" title="Delete ${esc(mm.name)}" aria-label="Delete ${esc(mm.name)}" ${lk.has(mm.id) ? "disabled" : ""}>✕</button></div></div>`,
      )
      .join("") || `<p class="hint">No members here yet. Add a team member or pick another module.</p>`;
  $("#mSecs").innerHTML = groups
    .map(([c, t, col]) => {
      const L = ML.filter(m => (e[m.id] || "") === c);
      return `<div class="secs" style="--sc:${col}"><div class="shd"><b>${esc(t)}</b><span>${L.length}</span></div><div class="chips">${L.map(m => `<span class="chip">${esc(m.name)}</span>`).join("") || `<span class="sub">No one</span>`}</div></div>`;
    })
    .join("");
  document.querySelectorAll(".opt").forEach(
    b =>
      (b.onclick = () => {
        const t = (S.att[md] = S.att[md] || {});
        if (t[b.dataset.id] === b.dataset.c) delete t[b.dataset.id];
        else t[b.dataset.id] = b.dataset.c;
        persist();
        renderMark();
      }),
  );
  document.querySelectorAll(".rsel").forEach(
    x =>
      (x.onchange = () => {
        const mm = S.members.find(y => y.id === x.dataset.id);
        mm.role = x.value;
        persist();
        renderMark();
        toast("Role updated");
      }),
  );
  document.querySelectorAll("#mList .edt").forEach(b => (b.onclick = () => openEditMember(b.dataset.id)));
  document.querySelectorAll("#mList .del").forEach(b => (b.onclick = () => deleteMember(b.dataset.id, renderMark)));
}
function ask(t, m, l, f, ok) {
  const y = $("#cYes");
  y.style.background = ok ? "" : "var(--a)";
  y.style.borderColor = ok ? "" : "var(--a)";
  $("#cT").textContent = t;
  $("#cM").textContent = m;
  $("#cYes").textContent = l;
  cbk = f;
  $("#cdlg").showModal();
}
$("#cNo").onclick = () => $("#cdlg").close();
$("#cYes").onclick = () => {
  $("#cdlg").close();
  if (cbk) cbk();
};
// heat colours use the good / warning thresholds from settings
function calHTML(id, y, m, sel, heat) {
  const first = new Date(y, m, 1).getDay(),
    n = new Date(y, m + 1, 0).getDate(),
    tk = todayKey(),
    L = id === "m" ? S.members : FM,
    tot = L.length,
    th = SET.thresholds;
  let h =
    `<div class="chead"><button class="cn" data-c="${id}" data-d="-1" aria-label="Previous month">‹</button><b>${esc(MN[m])} ${y}</b><button class="cn" data-c="${id}" data-d="1" aria-label="Next month">›</button></div><div class="cgrid">` +
    DN1.map(d => `<div class="cw">${esc(d)}</div>`).join("");
  for (let i = 0; i < first; i++) h += "<div></div>";
  for (let d = 1; d <= n; d++) {
    const k = ky(y, m, d),
      we = !isWorkDay(k),
      c = dayCount(k, L),
      r = tot ? (c.p / tot) * 100 : 0;
    const cls = heat && !we && c.mk ? (r >= th.good ? "h3" : r >= th.warn ? "h2" : "h1") : "";
    h +=
      `<button class="cd ${cls} ${k === sel ? "sel" : ""} ${k === tk ? "tdy" : ""} ${we ? "we" : ""}" data-k="${k}"${we ? ` title="${esc(offLabel(k))}"` : ""}><span>${d}</span>` +
      (we
        ? ""
        : heat
          ? `<small>${c.mk ? c.p + "/" + tot : ""}</small>`
          : c.mk
            ? `<i class="mk ${c.mk < tot ? "part" : ""}"></i>`
            : "") +
      `</button>`;
  }
  return h + "</div>";
}
document.addEventListener("click", e => {
  const n = e.target.closest(".cn"),
    d = e.target.closest(".cd");
  if (n) {
    const c = n.dataset.c === "m" ? mcal : cur;
    if (c === cur) dsel = null;
    c.m += +n.dataset.d;
    if (c.m < 0) {
      c.m = 11;
      c.y--;
    }
    if (c.m > 11) {
      c.m = 0;
      c.y++;
    }
    route();
    return;
  }
  if (d) {
    const k = d.dataset.k,
      q = k.split("-").map(Number);
    md = k;
    mcal = { y: q[0], m: q[1] - 1 };
    if (d.closest("#mCal")) renderMark();
    else go("mark");
  }
});
function shift(n) {
  const q = md.split("-").map(Number),
    d = new Date(q[0], q[1] - 1, q[2] + n);
  md = ky(d.getFullYear(), d.getMonth(), d.getDate());
  mcal = { y: d.getFullYear(), m: d.getMonth() };
  renderMark();
}
$("#leadSel").onchange = e => {
  const v = e.target.value;
  if (v) S.lead[md] = v;
  else delete S.lead[md];
  persist();
  const m = S.members.find(x => x.id === v);
  toast("Scrum taken by " + (m ? m.name : leadLabel()));
};
$("#dPrev").onclick = () => shift(-1);
$("#dNext").onclick = () => shift(1);
function mRows(ML) {
  const r = expandG(ML.filter(match), mset).filter(rowOk);
  if (!qry) {
    S.modules.forEach(g => {
      if ((!mset.length || mset.includes(g)) && !r.some(x => x._g === g)) r.push({ _empty: true, _g: g });
    });
    const i = x => {
      const k = S.modules.indexOf(x);
      return k < 0 ? 999 : k;
    };
    r.sort((a, b) => i(a._g) - i(b._g));
  }
  mFirst = r.length ? r[0]._g : null;
  return r;
}
let mFirst = null,
  mOpen = {};
const gOpen = g => (qry ? true : g in mOpen ? mOpen[g] : g === mFirst);
function gh(name, a, e) {
  const L = memOfG(name),
    mk = L.filter(x => e[x.id]).length,
    si = subInfo(md, name),
    we = !isWorkDay(md),
    lab = name || "Unassigned",
    dis = we || !L.length || (!si && mk < L.length);
  return `<div class="mgrp${gOpen(name) ? "" : " shut"}" data-g="${esc(name || "")}" tabindex="0" role="button" aria-expanded="${gOpen(name)}" title="Click to expand or collapse"><span class="gn"><i class="chev">▾</i>${esc(lab)}</span><div class="gact"><span>${si ? "Submitted ✓" + (si.at ? " · " + new Date(si.at).toLocaleTimeString(SET.locale || [], { hour: "2-digit", minute: "2-digit" }) : "") : mk + " of " + L.length + " marked"}</span><button type="button" class="btn gclr" data-g="${esc(name || "")}" ${si || we || !mk ? "disabled" : ""} title="${si ? "Unlock " + esc(lab) + " first to clear it" : "Clear every mark in " + esc(lab)}">Clear</button><button type="button" class="btn gsub${si ? "" : " pri"}" data-g="${esc(name || "")}" ${dis ? "disabled" : ""} title="${si ? "Unlock " + esc(lab) + " to edit" : dis && !we ? "Mark every member of " + esc(lab) + " to submit" : "Submit " + esc(lab)}">${si ? "Edit" : "Submit"} ${esc(lab)}</button></div></div>`;
}
$("#mToday").onclick = () => {
  md = todayKey();
  mcal = { y: now.getFullYear(), m: now.getMonth() };
  renderMark();
};
$("#allP").onclick = () => {
  const t = (S.att[md] = S.att[md] || {}),
    lk = lockedIds(md),
    c = defSt();
  msA(mset).forEach(mm => {
    if (!lk.has(mm.id)) t[mm.id] = c;
  });
  persist();
  renderMark();
};
const _rm = renderMark;
renderMark = function () {
  _rm();
  renderSub();
  syncClear();
};
const _r0 = render;
render = function () {
  _r0();
  syncClear();
};
function syncClear() {
  $("#mClear").hidden = !(mset.length || qry);
  $("#dClear").hidden = !(dmod || drole || qry);
}
function clearF(all) {
  mset = [];
  qry = "";
  if (all) {
    dmod = "";
    drole = "";
  }
  $("#qd").value = $("#qm").value = "";
  route();
}
$("#mClear").onclick = () => {
  clearF(false);
  toast("Filters cleared");
};
$("#dClear").onclick = () => {
  clearF(true);
  toast("Filters cleared");
};
function renderSub() {
  const we = !isWorkDay(md),
    e = markE(),
    lab = dayLabel(md),
    st = [...S.modules, ""]
      .filter(g => memOfG(g).length)
      .map(g => {
        const L = memOfG(g);
        return { g, L, mk: L.filter(m => e[m.id]).length, sub: subInfo(md, g) };
      }),
    tot = st.length,
    pend = st.filter(x => !x.sub),
    done = tot - pend.length;
  let t,
    m,
    btn = "Submit all modules",
    dis = false;
  if (we) {
    t = offLabel(md);
    m = "Attendance isn’t tracked on this day. Working days and holidays are set in Settings.";
    dis = true;
  } else if (!tot) {
    t = "No members";
    m = "Add members to start logging attendance.";
    dis = true;
  } else if (!pend.length) {
    t = "All " + tot + " modules submitted ✓";
    m = "Every module is locked for " + lab + ". Use Edit on a module to change it.";
    btn = "Unlock all";
  } else {
    t = done + " of " + tot + " modules submitted";
    m =
      "Each module is submitted on its own above. Pending: " +
      pend.map(x => (x.g || "Unassigned") + " (" + x.mk + "/" + x.L.length + ")").join(", ");
    dis = !pend.every(x => x.mk === x.L.length);
  }
  const all = !!tot && !pend.length && !we,
    b = $("#subBtn");
  $("#secSub").classList.toggle("done", all);
  $("#subT").textContent = t;
  $("#subM").textContent = m;
  $("#subP").style.width = (tot ? Math.round((done / tot) * 100) : 0) + "%";
  b.textContent = btn;
  b.disabled = dis;
  b.classList.toggle("pri", !all);
  if (all) {
    $("#leadSel").disabled = true;
    $("#dayInfo").textContent += " · Submitted";
  }
  const lk0 = lockedIds(md),
    e1 = markE();
  $("#clrAll").disabled = we || !S.members.some(m => e1[m.id] && !lk0.has(m.id));
  const lk = lockedIds(md);
  $("#allP").disabled = we || !msA(mset).some(x => !lk.has(x.id));
}
function clearMarks(ids, label) {
  const t = S.att[md];
  if (!t) return;
  ids.forEach(id => delete t[id]);
  if (!Object.keys(t).length) delete S.att[md];
  persist();
  renderMark();
  toast(label + " cleared");
}
function toggleG(h) {
  const g = h.dataset.g,
    open = h.classList.contains("shut");
  mOpen[g] = open;
  h.classList.toggle("shut", !open);
  h.setAttribute("aria-expanded", String(open));
  document.querySelectorAll("#mList .mrow[data-g],#mList p.hint[data-g]").forEach(r => {
    if (r.dataset.g === g) r.hidden = !open;
  });
}
$("#mList").onkeydown = e => {
  const h = e.target.closest && e.target.closest(".mgrp");
  if (h && e.target === h && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    toggleG(h);
  }
};
$("#mList").onclick = e => {
  const hd = e.target.closest(".mgrp");
  if (hd && !e.target.closest("button")) {
    toggleG(hd);
    return;
  }
  const cb = e.target.closest(".gclr");
  if (cb) {
    if (cb.disabled) return;
    const g = cb.dataset.g,
      lab = g || "Unassigned",
      e0 = markE(),
      ids = memOfG(g)
        .filter(m => e0[m.id])
        .map(m => m.id);
    ask(
      "Clear " + lab + " attendance?",
      "This removes " +
        ids.length +
        " mark" +
        (ids.length > 1 ? "s" : "") +
        " for " +
        dayLabel(md) +
        ". Members who also belong to other modules are cleared there too.",
      "Clear",
      () => clearMarks(ids, lab),
    );
    return;
  }
  const b = e.target.closest(".gsub");
  if (!b || b.disabled) return;
  const g = b.dataset.g,
    was = !!subInfo(md, g),
    n = g || "Unassigned",
    run = () => {
      toggleSub(md, g);
      renderMark();
      toast(was ? n + " unlocked for editing" : n + " submitted for " + dayLabel(md));
    };
  if (was) {
    run();
    return;
  }
  const ee = markE(),
    c = zeroCounts();
  memOfG(g).forEach(m => {
    if (ee[m.id] in c) c[ee[m.id]]++;
  });
  ask(
    "Submit " + n + " attendance?",
    dayLabel(md) +
      " · " +
      countLine(c) +
      ". Scrum taken by " +
      leadOf(md) +
      ". The module stays locked until you press Edit.",
    "Submit",
    run,
    true,
  );
};
$("#clrAll").onclick = () => {
  const lk = lockedIds(md),
    e0 = markE(),
    ids = S.members.filter(m => e0[m.id] && !lk.has(m.id)).map(m => m.id);
  if (!ids.length) return;
  ask(
    "Clear all unsubmitted marks?",
    "This removes " +
      ids.length +
      " mark" +
      (ids.length > 1 ? "s" : "") +
      " for " +
      dayLabel(md) +
      ". Submitted modules are not changed.",
    "Clear all",
    () => clearMarks(ids, "All unsubmitted marks"),
  );
};
$("#subBtn").onclick = () => {
  const pend = [...S.modules, ""].filter(g => memOfG(g).length && !subInfo(md, g));
  if (pend.length) {
    ask(
      "Submit all modules?",
      "Submit " +
        pend.length +
        " pending module" +
        (pend.length > 1 ? "s" : "") +
        " for " +
        dayLabel(md) +
        "? They stay locked until you press Edit.",
      "Submit all",
      () => {
        const a = (S.subM[md] = S.subM[md] || {});
        pend.forEach(g => (a[gk(g)] = { at: Date.now() }));
        persist();
        renderMark();
        toast("All modules submitted");
      },
      true,
    );
  } else {
    delete S.sub[md];
    delete S.subM[md];
    persist();
    renderMark();
    toast("Unlocked for editing");
  }
};
