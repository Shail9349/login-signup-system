\# Login \& Signup System



A secure authentication system built with Node.js, Express.js, MySQL and EJS.



\## Features



\- User Signup

\- User Login

\- Password hashing with bcrypt

\- Session-based authentication

\- Protected routes

\- Guest-only routes

\- Profile management

\- Update profile information

\- Change password

\- Delete account

\- Forgot password functionality

\- Email OTP verification

\- OTP expiry

\- OTP resend cooldown

\- OTP attempt limit

\- Password reset protection

\- Strong password validation

\- CSRF protection

\- Login brute-force protection

\- Secure session cookies

\- Flash messages

\- Custom 404 and error pages



\## Tech Stack



\- Node.js

\- Express.js

\- MySQL

\- EJS

\- Bootstrap

\- Bootstrap Icons

\- bcrypt

\- Nodemailer

\- express-session

\- express-validator

\- connect-flash

\- dotenv

\- mysql2



\## Project Structure



```text

login-signup-system/

│

├── config/

│   └── mailer.js

│

├── controllers/

│   └── authController.js

│

├── middlewares/

│   └── authMiddleware.js

│

├── models/

│   └── userModel.js

│

├── public/

│   ├── css/

│   └── js/

│

├── routes/

│   └── authRoutes.js

│

├── views/

│   ├── partials/

│   └── ...

│

├── .env.example

├── .gitignore

├── db.js

├── index.js

├── package.json

└── README.md

