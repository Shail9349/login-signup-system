const crypto = require("crypto");
const { validationResult } = require("express-validator");
const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const transporter = require("../config/mailer");
const loginAttempts = {};

exports.login = (req, res) => {

    const { email, password } = req.body;

    userModel.findUserByEmail(email, async (err, result) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        if (result.length === 0) {
            req.flash("error", "Invalid email or password.");
            return res.redirect(
                "/login?email=" + encodeURIComponent(email)
            );
        }

        const existingUser = result[0];

        // Check login attempt record
        if (!loginAttempts[email]) {
            loginAttempts[email] = {
                failedAttempts: 0,
                lockedUntil: 0
            };
        }

        const attemptData = loginAttempts[email];

        // Check if account is currently locked
        if (attemptData.lockedUntil > Date.now()) {

            const remainingMinutes = Math.ceil(
                (attemptData.lockedUntil - Date.now()) / 60000
            );

            req.flash(
                "error",
                `Too many failed attempts. Please try again in ${remainingMinutes} minute(s).`
            );

            return res.redirect(
                "/login?email=" + encodeURIComponent(email)
            );
        }

        // Lock expired → reset lock state
        if (
            attemptData.lockedUntil > 0 &&
            attemptData.lockedUntil <= Date.now()
        ) {
            attemptData.failedAttempts = 0;
            attemptData.lockedUntil = 0;
        }

        const isMatch = await bcrypt.compare(
            password,
            existingUser.password
        );

        // Wrong password
        if (!isMatch) {

            attemptData.failedAttempts++;

            if (attemptData.failedAttempts >= 5) {

                attemptData.lockedUntil =
                    Date.now() + 60 * 60 * 1000;

                req.flash(
                    "error",
                    "Too many failed attempts. Password login is locked for 60 minutes. You can try again later or recover your account using OTP."
                );

                return res.redirect(
                    "/login?email=" + encodeURIComponent(email)
                );
            }

            const remainingAttempts =
                5 - attemptData.failedAttempts;

            req.flash(
                "error",
                `Invalid email or password. ${remainingAttempts} attempt(s) remaining.`
            );

            return res.redirect(
                "/login?email=" + encodeURIComponent(email)
            );
        }

        // Successful login → reset failed attempts
        delete loginAttempts[email];

        // Regenerate session after successful login
        req.session.regenerate((err) => {

            if (err) {
                console.log(err);
                return res.send("Session Error");
            }

            req.session.user = existingUser;

            req.flash(
                "success",
                "Login Successful"
            );

            res.redirect("/profile");

        });

    });

};

exports.signup = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

    req.flash("error", errors.array()[0].msg);

    return res.redirect("/signup");

    }

    const { name, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {

        req.flash("error", "Passwords do not match");

        return res.redirect("/signup");

    }

    const hashedPassword = await bcrypt.hash(password, 10);

    userModel.createUser(name, email, hashedPassword, (err, result) => {

        if (err) {

            if (err.code === "ER_DUP_ENTRY") {
                req.flash("error", "Email already exists");
                return res.redirect("/signup");
            }

            console.log(err);
            return res.send("Database Error");
        }

        req.flash("success", "Signup Successful");

        res.redirect("/login");

    });

};

// ==============================
// Profile Controller
// ==============================

exports.profile = (req, res) => {

    const userId = req.session.user.id;

    userModel.findUserById(userId, (err, result) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        if (result.length === 0) {

            return req.session.destroy((err) => {

                if (err) {
                    console.log(err);
                    return res.send("Error while clearing session");
                }

                res.redirect("/login");

            });

        }

        res.render("profile", {
            user: result[0]
        });

    });

};

exports.updateProfile = (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        req.flash("error", errors.array()[0].msg);
        return res.redirect("/profile");
    }

    const userId = req.session.user.id;

    const { name, email } = req.body;

    userModel.updateUser(userId, name, email, (err) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        // Session bhi update kar do
        req.session.user.name = name;
        req.session.user.email = email;

        req.flash("success", "Profile Updated Successfully");

        res.redirect("/profile");

    });

};

exports.changePassword = async (req, res) => {

    const userId = req.session.user.id;

    const {
        currentPassword,
        newPassword,
        confirmPassword
    } = req.body;

    // 1. New aur Confirm password same hone chahiye
    if (newPassword !== confirmPassword) {

        req.flash("error", "Passwords do not match");

        return res.redirect("/profile");

    }
    const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#])[A-Za-z\d@$!%*?&.#]{8,}$/;

    if (!strongPassword.test(newPassword)) {

        req.flash(
            "error",
            "Password must be at least 8 characters and include uppercase, lowercase, number and special character."
        );

        return res.redirect("/profile");

    }

    // 2. User ko database se lao
    userModel.findUserById(userId, async (err, result) => {

        if (err) {

            console.log(err);

            return res.send("Database Error");

        }

        if (result.length === 0) {
            req.flash("error", "User account not found.");
            return req.session.destroy(() => {
                res.redirect("/login");
            });
        }

        const user = result[0];

        const isMatch = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!isMatch) {

            req.flash("error", "Current Password is incorrect");

            return res.redirect("/profile");

        }

        if (await bcrypt.compare(newPassword, user.password)) {
            req.flash(
                "error",
                "New password must be different from your current password"
            );

            return res.redirect("/profile");

        }

        // 4. New password hash karo
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 5. Database update karo
        userModel.updatePassword(
            userId,
            hashedPassword,
            (err) => {

                if (err) {

                    console.log(err);

                    return res.send("Database Error");

                }

                req.session.regenerate((err) => {

                    if (err) {
                        console.log(err);
                        return res.send("Session Error");
                    }

                    req.flash(
                        "success",
                        "Password Changed Successfully. Please login with your new password."
                    );

                    res.redirect("/login");

                });

            }
        );

    });

};

exports.deleteAccount = (req, res) => {

    const userId = req.session.user.id;

    userModel.deleteUser(userId, (err) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        req.session.destroy((err) => {

            if (err) {
                return res.send("Error while logging out");
            }

            res.redirect("/login");

        });

    });

};

exports.sendOTP = (req, res) => {

    const { email } = req.body;

    userModel.findUserByEmail(email, async (err, result) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        if (result.length === 0) {
            req.flash("error", "Email not found");
            return res.redirect("/forgot-password");
        }

        const otp = crypto.randomInt(100000, 1000000);

        try {

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Password Reset OTP",
                text: `Your OTP is: ${otp}`
            });

            // OTP session data is saved only after email succeeds
            req.session.resetOTP = crypto
            .createHash("sha256")
            .update(String(otp))
            .digest("hex");
            req.session.resetEmail = email;
            req.session.otpExpiry = Date.now() + 5 * 60 * 1000;
            req.session.otpAttempts = 0;
            req.session.otpResendAvailableAt = Date.now() + 60 * 1000;

            req.flash("success", "OTP sent successfully");

            res.redirect("/verify-otp");

        } catch (error) {

            console.log(error);

            req.flash(
                "error",
                "Failed to send OTP. Please try again."
            );

            res.redirect("/forgot-password");
        }

    });

};

exports.verifyOTP = (req, res) => {

    const { otp } = req.body;

    // OTP session mein available hai ya nahi
    if (
        !req.session.resetOTP ||
        !req.session.resetEmail ||
        !req.session.otpExpiry
    ) {

        req.flash(
            "error",
            "OTP session expired. Please request a new OTP."
        );

        return res.redirect("/forgot-password");

    }

    // OTP expiry check
    if (Date.now() > req.session.otpExpiry) {

        delete req.session.resetOTP;
        delete req.session.resetEmail;
        delete req.session.otpExpiry;
        delete req.session.otpAttempts;
        delete req.session.otpResendAvailableAt;
        delete req.session.isOTPVerified;

        req.flash(
            "error",
            "OTP has expired. Please request a new OTP."
        );

        return res.redirect("/forgot-password");

    }

    // OTP must contain exactly 6 digits
    if (!/^\d{6}$/.test(otp)) {

        req.session.otpAttempts++;

        if (req.session.otpAttempts >= 3) {

            delete req.session.resetOTP;
            delete req.session.resetEmail;
            delete req.session.otpExpiry;
            delete req.session.otpAttempts;
            delete req.session.otpResendAvailableAt;
            delete req.session.isOTPVerified;

            req.flash(
                "error",
                "Too many wrong attempts. Please request a new OTP."
            );

            return res.redirect("/forgot-password");

        }

        const remaining = 3 - req.session.otpAttempts;

        req.flash(
            "error",
            `Invalid OTP. ${remaining} attempt(s) remaining.`
        );

        return res.redirect("/verify-otp");

    }

    // Check OTP
    const hashedOTP = crypto
        .createHash("sha256")
        .update(String(otp))
        .digest("hex");

    if (hashedOTP !== req.session.resetOTP) {

        req.session.otpAttempts++;

        if (req.session.otpAttempts >= 3) {

            delete req.session.resetOTP;
            delete req.session.resetEmail;
            delete req.session.otpExpiry;
            delete req.session.otpAttempts;
            delete req.session.otpResendAvailableAt;
            delete req.session.isOTPVerified;

            req.flash(
                "error",
                "Too many wrong attempts. Please request a new OTP."
            );

            return res.redirect("/forgot-password");

        }

        const remaining = 3 - req.session.otpAttempts;

        req.flash(
            "error",
            `Invalid OTP. ${remaining} attempt(s) remaining.`
        );

        return res.redirect("/verify-otp");

    }

    // OTP verified successfully
    req.session.isOTPVerified = true;
    req.session.resetVerifiedAt = Date.now();

    // OTP immediately invalidate
    delete req.session.resetOTP;
    delete req.session.otpExpiry;
    delete req.session.otpAttempts;
    delete req.session.otpResendAvailableAt;

    req.flash(
        "success",
        "OTP Verified Successfully"
    );

    res.redirect("/reset-password");

};

exports.resetPassword = async (req, res) => {

    if (
        !req.session.isOTPVerified ||
        !req.session.resetEmail ||
        !req.session.resetVerifiedAt
    ) {
        req.flash("error", "Please verify OTP first.");
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

    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {

        req.flash("error", "Passwords do not match");
        return res.redirect("/reset-password");

    }
    const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#])[A-Za-z\d@$!%*?&.#]{8,}$/;


    if (!strongPassword.test(password)) {

        req.flash(
            "error",
            "Password must be at least 8 characters and include uppercase, lowercase, number and special character."
        );

        return res.redirect("/reset-password");

    }

    const hashedPassword = await bcrypt.hash(password, 10);

    userModel.findUserByEmail(req.session.resetEmail, (err, result) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        if (result.length === 0) {

            delete req.session.isOTPVerified;
            delete req.session.resetVerifiedAt;
            delete req.session.resetEmail;

            req.flash("error", "User not found");
            return res.redirect("/forgot-password");
        }

        const user = result[0];

        userModel.updatePassword(user.id, hashedPassword, (err) => {

            if (err) {
                console.log(err);
                return res.send("Database Error");
            }

            // Clear login lock after successful password reset
            delete loginAttempts[req.session.resetEmail];

            // OTP session clear
            delete req.session.resetOTP;
            delete req.session.resetEmail;
            delete req.session.otpExpiry;
            delete req.session.otpAttempts;
            delete req.session.otpResendAvailableAt;
            delete req.session.isOTPVerified;
            delete req.session.resetVerifiedAt;

            req.flash("success", "Password Reset Successfully");

            res.redirect("/login");

        });

    });

};

exports.resendOTP = async (req, res) => {

    const email = req.session.resetEmail;

    if (!email) {
        req.flash(
            "error",
            "Please start the forgot password process again."
        );
        return res.redirect("/forgot-password");
    }

    if (
        req.session.otpResendAvailableAt &&
        Date.now() < req.session.otpResendAvailableAt
    ) {
        const remainingSeconds = Math.ceil(
            (req.session.otpResendAvailableAt - Date.now()) / 1000
        );

        req.flash(
            "error",
            `Please wait ${remainingSeconds} seconds before requesting a new OTP.`
        );

        return res.redirect("/verify-otp");
    }

    const otp = crypto.randomInt(100000, 1000000);

    try {

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset OTP",
            text: `Your new OTP is: ${otp}`
        });

        // Save new OTP data only after email succeeds
        req.session.resetOTP = crypto
        .createHash("sha256")
        .update(String(otp))
        .digest("hex");
        req.session.otpExpiry = Date.now() + 5 * 60 * 1000;
        req.session.otpAttempts = 0;
        req.session.otpResendAvailableAt = Date.now() + 60 * 1000;

        req.flash(
            "success",
            "New OTP sent successfully"
        );

        res.redirect("/verify-otp");

    } catch (error) {

        console.log(error);

        req.flash(
            "error",
            "Failed to send OTP. Please try again."
        );

        res.redirect("/verify-otp");
    }
};