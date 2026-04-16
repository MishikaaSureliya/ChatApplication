async function loadUsers() {

   
    const res = await fetch(API_BASE + "/message/chat-users", {
        headers: authHeader()
    });

    const users = await res.json();
    const list = document.getElementById("usersList");
    list.innerHTML = "";

    users.forEach(u => {
        const div = document.createElement("div");
        div.className = "user-item";
        div.setAttribute("data-userid", u.userId);

        div.innerHTML = `
            <span class="user-name">${u.username}</span>
            <span class="badge" id="badge-${u.userId}">0</span>
            <span class="status-dot" style="background:${u.isOnline ? 'green' : 'gray'}"></span>
        `;
        list.appendChild(div);
    });
    document.querySelectorAll(".user-item").forEach(item => {
        item.addEventListener("click", function () {

            const userId = this.getAttribute("data-userid");

            console.log("Clicked ID:", userId);

            // ✅ SAVE USER
            localStorage.setItem("selectedUserId", userId);

            console.log("Saved:", localStorage.getItem("selectedUserId"));

            // redirect
            window.location.href = `chat.html?receiverId=${userId}`;
        });
    });
}