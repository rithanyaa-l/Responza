"use strict";

// Validates the app/settings document before it is stored, so every page can trust its shape.
const { httpError, isObject } = require("../lib/http");

const CODE_RE = /^[A-Za-z0-9]{1,3}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const text = (v, max, field, required) => {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") throw httpError(400, `${field} must be text`);
  v = v.trim().slice(0, max);
  if (required && !v) throw httpError(400, `${field} is required`);
  return v;
};
const pct = (v, field) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) throw httpError(400, `${field} must be 0-100`);
  return Math.round(v);
};

function validateSettings(body) {
  if (!isObject(body)) throw httpError(400, "settings must be an object");

  if (!Array.isArray(body.statuses) || !body.statuses.length) throw httpError(400, "at least one status is required");
  const seen = new Set();
  const statuses = body.statuses.map((s, i) => {
    if (!isObject(s)) throw httpError(400, `status ${i + 1} is invalid`);
    const code = text(s.code, 3, `status ${i + 1} code`, true);
    if (!CODE_RE.test(code)) throw httpError(400, `status code "${code}" must be 1-3 letters or digits`);
    if (seen.has(code)) throw httpError(400, `status code "${code}" is used twice`);
    seen.add(code);
    const color = text(s.color, 7, `status ${code} colour`, true);
    if (!COLOR_RE.test(color)) throw httpError(400, `status ${code} colour must look like #1a2b3c`);
    return { code, label: text(s.label, 40, `status ${code} label`, true), color, attended: s.attended === true };
  });
  if (!statuses.some(s => s.attended)) throw httpError(400, "at least one status must count as attended");

  const defaultStatus = seen.has(body.defaultStatus) ? body.defaultStatus : statuses[0].code;

  if (!Array.isArray(body.workDays)) throw httpError(400, "workDays must be a list");
  const workDays = [...new Set(body.workDays)].filter(d => Number.isInteger(d) && d >= 0 && d <= 6).sort();
  if (!workDays.length) throw httpError(400, "pick at least one working day");

  const holidays = (Array.isArray(body.holidays) ? body.holidays : [])
    .map((h, i) => {
      if (!isObject(h) || typeof h.date !== "string" || !DATE_RE.test(h.date))
        throw httpError(400, `holiday ${i + 1} needs a date`);
      return { date: h.date, name: text(h.name, 60, `holiday ${h.date} name`, false) };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const t = isObject(body.thresholds) ? body.thresholds : {};
  const thresholds = {
    good: pct(t.good, "good threshold"),
    warn: pct(t.warn, "warning threshold"),
    low: pct(t.low, "low-attendance threshold"),
  };
  if (thresholds.warn > thresholds.good) throw httpError(400, "warning threshold must not be above the good threshold");

  return {
    appName: text(body.appName, 60, "app name", true),
    tagline: text(body.tagline, 80, "tagline", false),
    orgName: text(body.orgName, 60, "organization name", false),
    logo: text(body.logo, 300, "logo", false),
    leadLabel: text(body.leadLabel, 40, "default scrum lead", true),
    locale: text(body.locale, 20, "locale", false),
    statuses,
    defaultStatus,
    workDays,
    holidays,
    thresholds,
  };
}

module.exports = { validateSettings };
