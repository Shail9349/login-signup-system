const { body } = require("express-validator");
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { isLoggedIn } = require("../middlewares/authMiddleware");

router.get("/profile", isLoggedIn, authController.profile);
router.post("/login", authController.login);
router.post(
    "/profile",
    isLoggedIn,
    [
        body("name")
            .trim()
            .isLength({ min: 2, max: 25 })
            .withMessage("Name must be between 2 and 25 characters")
            .matches(/^[A-Za-z ]+$/)
            .withMessage("Name can contain letters and spaces only"),

        body("email")
            .trim()
            .isLength({ max: 50 })
            .withMessage("Email must not exceed 50 characters")
            .isEmail()
            .withMessage("Please enter a valid email")
    ],
    authController.updateProfile
);
router.post("/change-password", isLoggedIn, authController.changePassword);
router.post("/forgot-password", authController.sendOTP);
router.post("/resend-otp", authController.resendOTP);
router.post("/verify-otp", authController.verifyOTP);
router.post("/reset-password", authController.resetPassword);
router.post("/delete-account", isLoggedIn, authController.deleteAccount);

router.post(
    "/signup",
    [
        body("name")
    .trim()
    .isLength({ min: 2, max: 25 })
    .withMessage("Name must be between 2 and 25 characters")
    .matches(/^[A-Za-z ]+$/)
    .withMessage("Name can contain letters and spaces only"),

        body("email")
        .trim()
        .isLength({ max: 50 })
        .withMessage("Email must not exceed 50 characters")
        .isEmail()
        .withMessage("Please enter a valid email"),

        body("password")
        .isLength({ min: 8, max: 64 })
            .withMessage("Password must be between 8 and 64 characters")
            .isStrongPassword({
                minLength: 8,
                minLowercase: 1,
                minUppercase: 1,
                minNumbers: 1,
                minSymbols: 1
        })

        .withMessage(
            "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character."
        )
    ],
    authController.signup
);

module.exports = router;