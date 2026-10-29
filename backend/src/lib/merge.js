"use strict";

// Deep merge for PATCH: nested objects merge recursively, anything else (arrays included) replaces.
const { isObject } = require("./http");

function deepMerge(target, patch) {
  for (const key of Object.keys(patch)) {
    if (isObject(patch[key]) && isObject(target[key])) deepMerge(target[key], patch[key]);
    else target[key] = patch[key];
  }
  return target;
}

module.exports = { deepMerge };
