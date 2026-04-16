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
            console.log("LOGIN RESPONSE:", data);

            const token = data.token || data.Token || data.result?.token;

            console.log("Extracted Token:", token);
              
            if (!token) {
                alert("Token not found ❌");
                return;
            }

            localStorage.setItem("token", token);

            alert("Token saved ✅");

            window.location.href = "dashboard.html";
        });
}