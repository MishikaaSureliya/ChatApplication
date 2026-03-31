function login() {
    
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;

    fetch(API_BASE + "/Auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
        .then(async response => {
            if (!response.ok) {
                const txt = await response.text();
                alert(txt);
                return;
            }
            return response.json();
        })
        .then(data => {
            const token = data.token || data.Token;
            localStorage.setItem("token", token);
            window.location.href = "dashboard.html";
        });
}