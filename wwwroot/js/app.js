const API_URL = window.location.origin + "/api";

// ================= LOGIN =================
function login() {
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;

    fetch(API_URL + "/Auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
        .then(async response => {
            if (!response.ok) {
                // If server returned an error, read the text and show it
                const txt = await response.text();
                alert(txt || 'Login failed');
                throw new Error('Login failed: ' + txt);
            }
            return response.json();
        })
        .then(data => {
            // Normalize token property (server returns `Token` while client used `token`)
            const token = data.token || data.Token;
            console.log("TOKEN:", token); // IMPORTANT
            if (!token) {
                alert('Login failed: token not received from server');
                return;
            }
            localStorage.setItem("token", token);
            window.location.href = "dashboard.html";
        })
        .catch(err => console.error(err));
}

// ================= REGISTER =================
function register() {
    let username = document.getElementById("regUsername").value;
    let email = document.getElementById("regEmail").value;
    let password = document.getElementById("regPassword").value;
    let confirmPassword = document.getElementById("confirmPassword").value;
    let errorMsg = document.getElementById("errorMsg");

    errorMsg.innerText = "";

    if (password !== confirmPassword) {
        errorMsg.innerText = "Passwords do not match";
        return;
    }

    fetch(API_URL + "/Auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: username,
            email: email,
            password: password,
            confirmPassword: confirmPassword
        })
    })
        .then(response => response.text())
        .then(data => {
            alert(data);
            window.location.href = "index.html";
        });
}

// ================= DASHBOARD USERS =================
function loadUsers() {
    fetch(API_URL + "/user/all")
        .then(res => res.json())
        .then(users => {
            let list = document.getElementById("list");
            list.innerHTML = "";

            users.forEach(user => {
                let div = document.createElement("div");
                div.className = "card user-item";

                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <i class="fa fa-users"></i> ${user.username}
                        </div>
                        <div class="status-dot status-online"></div>
                    </div>
                `;

                // IMPORTANT PART
                div.onclick = function () {
                    window.location.href = "chat.html?user=" + user.username;
                };

                list.appendChild(div);
            });
        });
}
function openChat(userId, username) {
    localStorage.setItem("chatUserId", userId);
    localStorage.setItem("chatUsername", username);
    window.location.href = "chat.html";
}

// ================= CHAT PAGE =================
function loadUsersForChat() {
    let token = localStorage.getItem("token");

    fetch(API_URL + "/message/chat-users", {
        headers: { "Authorization": "Bearer " + token }
    })
        .then(response => response.json())
        .then(users => {
            let userList = document.getElementById("userList");
            userList.innerHTML = "";

            users.forEach(user => {
                userList.innerHTML += `
                <div class="user" onclick="selectUser(${user.userId}, '${user.username}')">
                    👤 ${user.username}
                </div>
            `;
            });
        });
}

function selectUser(userId, username) {
    localStorage.setItem("chatUserId", userId);
    localStorage.setItem("chatUsername", username);
    document.getElementById("chatWith").innerText = username;
    loadMessages();
}

function loadMessages() {
    let token = localStorage.getItem("token");
    let userId = localStorage.getItem("chatUserId");

    fetch(API_URL + "/message/private-chat?userId=" + userId, {
        headers: { "Authorization": "Bearer " + token }
    })
        .then(response => response.json())
        .then(messages => {
            let msgBox = document.getElementById("messages");
            msgBox.innerHTML = "";

            messages.forEach(msg => {
                if (msg.senderId == userId) {
                    msgBox.innerHTML += `<div class="message received">${msg.messageText}</div>`;
                } else {
                    msgBox.innerHTML += `<div class="message sent">${msg.messageText}</div>`;
                }
            });
        });
}

function openChat(username, element) {
    document.getElementById("chatUserName").innerText = username;
    document.getElementById("userStatus").innerText = "Online";

    // highlight selected user
    let users = document.querySelectorAll("#userList .user");
    users.forEach(u => u.style.background = "white");

    element.style.background = "#ffe3f1";

    // clear messages
    document.getElementById("messages").innerHTML = "";
}

async function sendMessage() {
    if (!activeChatObj) return;

    const input = document.getElementById("messageInput");
    const msg = input.value.trim();
    if (!msg) return;

    if (activeChatObj.type === "user") {
        await sendPrivateMessageRealTime(activeChatObj.id, msg);
    }
    else if (activeChatObj.type === "group") {
        await sendGroupMessageRealTime(parseInt(activeChatObj.id), msg);
    }

    input.value = "";
}

// ================= LOGOUT =================
function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

// loadLabels() was here, now in localization.js

// ================= AUTO LOAD =================
window.onload = function () {
    if (window.location.pathname.includes("dashboard.html")) {
        loadUsers();
    }

    if (window.location.pathname.includes("chat.html")) {
        loadUsersForChat();
    }
}
function loadGroups() {
    let token = localStorage.getItem("token");

    fetch(API_URL + "/group/my-groups", {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token
        }
    })
        .then(response => response.json())
        .then(groups => {
            let list = document.getElementById("list");
            list.innerHTML = "";

            groups.forEach(group => {
                list.innerHTML += `
                <div class="card">
                    👥 ${group.groupName}
                </div>
            `;
            });
        });
}

