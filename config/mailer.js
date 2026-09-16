const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({

    host: "smtp.gmail.com",

    family: 4,

    port: 587,

    secure: false,

    requireTLS: true,

    pool: true,

    maxConnections: 1,

    maxMessages: 10,

    auth: {

        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS

    },

    connectionTimeout: 30000,

    greetingTimeout: 30000,

    socketTimeout: 30000,

});

module.exports = transporter;