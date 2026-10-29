"use strict";

// User records: {_id: username, email, role, passwordHash, mustChangePassword, createdAt, updatedAt}.
const db = require("../db/client");

const users = () => db.collection("users");

// The shape sent to the browser: never includes the password hash.
function publicUser(user) {
  return {
    username: user._id,
    email: user.email || "",
    role: user.role,
    mustChangePassword: !!user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

const findUser = username => users().findOne({ _id: username });

const countAdmins = () => users().countDocuments({ role: "admin" });

module.exports = { users, publicUser, findUser, countAdmins };
