require("dotenv").config();

const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,


    ssl: {
        rejectUnauthorized: false
    },

    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
});

// db.getConnection((err, connection) => {
//     if (err) {
//         console.log("❌ Database Connection Failed");
//         console.log(err);
//         return;
//     }

//     console.log("✅ Connected to MySQL Database");
//     connection.release();
// });

db.on("error", (err) => {
    console.log("❌ MySQL Pool Error");
    console.log(err);
});

module.exports = db;