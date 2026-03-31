const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7062/chatHub", {
        accessTokenFactory: () => localStorage.getItem("token")
    })
    .withAutomaticReconnect()
    .build();

connection.start()
    .then(() => console.log("SignalR Connected"))
    .catch(err => console.error(err));

document.addEventListener("DOMContentLoaded", function () {
    if (!getToken()) {
        window.location.href = "login.html";
        return;
    }

    setWelcome();
    loadUsers();
});
connection.on("UserStatusChanged", function (userId, isOnline) {
    const users = document.querySelectorAll(".user-item");

    connection.on("UserStatusChanged", function (userId, isOnline) {
        const dot = document.getElementById("status-" + userId);
        if (dot) {
            dot.style.background = isOnline ? "#00ff00" : "#999";
        }
    });
});
function getUsernameFromToken() {
    const token = getToken();
    if (!token) return "User";

    const payload = JSON.parse(atob(token.split('.')[1]));

    return payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]
        || payload.unique_name
        || payload.name
        || payload.sub
        || "User";
}

function setWelcome() {
    const username = getUsernameFromToken();
    document.getElementById("welcomeUser").innerText = "Welcome, " + username + " 👋";
}

// Load Users
function loadUsers() {
    fetch(API_BASE + "/message/chat-users", {
        headers: authHeader()
    })
        .then(res => {
            if (res.status === 401) {
                alert("Session expired. Please login again.");
                logout();
                return;
            }
            return res.json();
        })
        .then(users => {
            const list = document.getElementById("userList");
            list.innerHTML = "";

            users.forEach(u => {
                const div = document.createElement("div");
                div.className = "user-item";

                div.innerHTML = `
                    <span>${u.username}</span>
                    <span id="status-${u.userId}" class="status-dot" 
          style="background:${u.isOnline ? '#00ff00' : '#999'}"></span>
`;

                div.onclick = () => {
                    window.location.href = `chat.html?receiverId=${u.userId}&user=${encodeURIComponent(u.username)}`;
                };

                list.appendChild(div);
            });
        });
}

// Load Groups
function loadGroups() {
    fetch(API_BASE + "/group/my-groups", {
        headers: authHeader()
    })
        .then(res => res.json())
        .then(groups => {
            const list = document.getElementById("userList");
            list.innerHTML = "";

            groups.forEach(g => {
                const div = document.createElement("div");
                div.className = "user-item";
                div.innerText = "👥 " + g.groupName;

                div.onclick = () => {
                    window.location.href = `chat.html?group=${g.groupId}`;
                };

                list.appendChild(div);
            });
        });
}

// Logout
function logout() {
    fetch(API_BASE + "/Auth/logout", {
        method: "POST",
        headers: authHeader()
    }).finally(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("sessionId");
        window.location.href = "index.html";
    });
}