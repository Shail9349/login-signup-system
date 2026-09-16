exports.isLoggedIn = (req, res, next) => {

    if (!req.session.user) {
        return res.redirect("/login");
    }

    next();

};

exports.isGuest = (req, res, next) => {

    if (req.session.user) {
        return res.redirect("/about");
    }

    next();

};