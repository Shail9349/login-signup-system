const db = require("../db");

exports.findUserByEmail = (email, callback) => {

    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], callback);

};

exports.createUser = (name, email, password, callback) => {

    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

    db.query(sql, [name, email, password], callback);

};

exports.findUserById = (id, callback) => {

    const sql = "SELECT * FROM users WHERE id = ?";

    db.query(sql, [id], callback);

};

exports.updateUser = (id, name, email, callback) => {

    const sql = "UPDATE users SET name = ?, email = ? WHERE id = ?";

    db.query(sql, [name, email, id], callback);

};

exports.updatePassword = (id, password, callback) => {

    const sql = "UPDATE users SET password = ? WHERE id = ?";

    db.query(sql, [password, id], callback);

};

exports.deleteUser = (id, callback) => {

    const sql = "DELETE FROM users WHERE id = ?";

    db.query(sql, [id], callback);

};