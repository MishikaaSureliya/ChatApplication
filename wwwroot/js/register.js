function register() {
    debugger;
    let username = document.getElementById("regUsername").value;
    let email = document.getElementById("regEmail").value;
    let password = document.getElementById("regPassword").value;
    let confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/;
    if (!passwordRegex.test(password)) {
        alert("Password must contain at least one capital letter, one number, and one special character.");
        return;
    }

    fetch(API_BASE + "/Auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, confirmPassword })
    })
        .then(res => res.text())
        .then(msg => {
            alert(msg);
            window.location.href = "index.html";
        });
}