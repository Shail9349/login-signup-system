const sendMail = async ({ to, subject, html, text }) => {

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",

        headers: {
            "accept": "application/json",
            "api-key": process.env.BREVO_API_KEY,
            "content-type": "application/json"
        },

        body: JSON.stringify({
            sender: {
                name: "Velora Web Tech",
                email: process.env.EMAIL_USER
            },

            to: [
                {
                    email: to
                }
            ],

            subject: subject,

            htmlContent: html,

            textContent: text
        })
    });

    if (!response.ok) {

        const errorBody = await response.text();

        throw new Error(
            `Brevo API Error ${response.status}: ${errorBody}`
        );
    }

    return await response.json();
};

module.exports = {
    sendMail
};