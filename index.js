const {
    isLoggedIn,
    isGuest
} = require("./middlewares/authMiddleware");
require("dotenv").config();
const flash = require("connect-flash");
const express = require("express");
const session = require("express-session");
const authRoutes = require("./routes/authRoutes");
const crypto = require("crypto");
const db = require("./db");

if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is missing from .env");
}
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER or EMAIL_PASS is missing from .env");
}

if (
    !process.env.DB_HOST ||
    !process.env.DB_USER ||
    !process.env.DB_PASSWORD ||
    !process.env.DB_NAME
) {
    throw new Error("Database configuration is missing from .env");
}

const app = express();
app.disable("x-powered-by");

app.set("view engine", "ejs");

app.use(express.urlencoded({
    extended: true,
    limit: "10kb"
}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    cookie: {
        maxAge: 1000 * 60 * 60,
        httpOnly: true,
        sameSite: "lax"
    }
}));

app.use((req, res, next) => {

    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }

    res.locals.csrfToken = req.session.csrfToken;

    if (
        ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
    ) {

        const token = req.body._csrf;

        if (!token || token !== req.session.csrfToken) {
            return res.status(403).send("Invalid CSRF token");
        }

    }

    next();

});

app.use(flash());

// ==============================
// Flash Messages Middleware
// ==============================
app.use((req, res, next) => {

    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");

    // Login user ko har EJS page me available karo
    res.locals.user = req.session.user;

    next();

});

const PORT = 3000;

// ==============================
// Routes
// ==============================

app.get("/", (req, res) => {

    res.render("home", {
        title: "Home Page"
    });

});

app.get("/login", isGuest, (req, res) => {

    res.render("login", {
        email: req.query.email || ""
    });

});

app.get("/signup", isGuest, (req, res) => {

    res.render("signup");

});

app.get("/forgot-password", isGuest, (req, res) => {

    res.render("forgot-password");

});

app.get("/verify-otp", isGuest, (req, res) => {

    let resendRemaining = 0;

    if (req.session.otpResendAvailableAt) {

        resendRemaining = Math.max(
            0,
            Math.ceil(
                (req.session.otpResendAvailableAt - Date.now()) / 1000
            )
        );

    }

    res.render("verify-otp", {
        resendRemaining: resendRemaining
    });

});

app.get("/reset-password", isGuest, (req, res) => {

    if (
        !req.session.isOTPVerified ||
        !req.session.resetVerifiedAt
    ) {
        req.flash("error", "Please verify OTP first");
        return res.redirect("/forgot-password");
    }

    const resetVerificationAge =
        Date.now() - req.session.resetVerifiedAt;

    if (resetVerificationAge > 10 * 60 * 1000) {

        delete req.session.isOTPVerified;
        delete req.session.resetVerifiedAt;
        delete req.session.resetEmail;

        req.flash(
            "error",
            "Password reset session expired. Please request a new OTP."
        );

        return res.redirect("/forgot-password");
    }

    res.render("reset-password");
});

app.get("/about", isLoggedIn, (req, res) => {

    res.render("dashboard", {
        user: req.session.user
    });

});

app.post("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {
            return res.send("Error while logging out");
        }

        res.redirect("/login");

    });

});

// ==============================
// Auth Routes
// ==============================

app.use(authRoutes);

app.use((err, req, res, next) => {

    console.error(err.stack);

    res.status(500).render("error", {
        message: "Internal Server Error"
    });

});

app.use((req, res) => {

    res.status(404).render("404");

});

// ==============================

const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:3000`);
});

process.on("SIGINT", () => {

    console.log("\nShutting down server...");

    server.close(() => {

        db.end((err) => {

            if (err) {
                console.log("❌ Error closing MySQL pool");
                console.log(err);
                process.exit(1);
            }

            console.log("✅ MySQL pool closed");
            process.exit(0);

        });

    });

});