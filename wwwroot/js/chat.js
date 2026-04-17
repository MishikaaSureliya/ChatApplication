const API_BASE_URL = API_BASE;

// State
let allUsers = [];
let allGroups = [];
let activeChatObj = null; // { type: 'user'|'group', id: int, name: string }
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
    // Check Auth
    const token = getToken();
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    parseCurrentUser(token);

    // Initialize Real-time SignalR
    if (typeof initSignalR === "function") {
        initSignalR();
    }

    // Request Notification Permission
    if ("Notification" in window) {
        Notification.requestPermission();
    }

    // Bind UI elements
    bindEvents();

    // Initial load
    fetchUsers();
    fetchGroups();
});

function getToken() {
    return localStorage.getItem("token");
}

function authHeader() {
    return {
        "Authorization": "Bearer " + getToken(),
        "Content-Type": "application/json"
    };
}

function parseCurrentUser(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const username = payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] 
            || payload.unique_name 
            || payload.name 
            || payload.sub 
            || "My Name";
            
        currentUser = {
            id: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || 0,
            name: username
        };
        document.getElementById("myName").textContent = username;
        document.getElementById("myAvatar").src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&rounded=true`;
    } catch(e) {
        console.error("Error parsing JWT for user info", e);
    }
}

// ----------------------------------------------------
// UI Bindings
// ----------------------------------------------------
function bindEvents() {
    // Tabs
    const tabUsers = document.getElementById("tabUsers");
    const tabGroups = document.getElementById("tabGroups");

    tabUsers.addEventListener("click", () => {
        tabUsers.classList.add("active");
        tabGroups.classList.remove("active");
        renderList("users");
    });

    tabGroups.addEventListener("click", () => {
        tabGroups.classList.add("active");
        tabUsers.classList.remove("active");
        renderList("groups");
    });

    // Dropdown
    const menuBtn = document.getElementById("menuBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");

    menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle("hidden");
    });
    
    document.addEventListener("click", () => {
        dropdownMenu.classList.add("hidden");
    });

    // Modals
    const createGroupBtn = document.getElementById("createGroupBtn");
    const myProfileBtn = document.getElementById("myProfileBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    
    // Group Modal
    const groupModal = document.getElementById("groupModal");
    const closeGroupModal = document.getElementById("closeGroupModal");
    const submitCreateGroup = document.getElementById("submitCreateGroup");

    createGroupBtn.addEventListener("click", (e) => {
        e.preventDefault();
        groupModal.classList.remove("hidden");
        populateGroupParticipants();
    });
    closeGroupModal.addEventListener("click", () => groupModal.classList.add("hidden"));

    submitCreateGroup.addEventListener("click", handleCreateGroup);

    // Profile Modal
    const profileModal = document.getElementById("profileModal");
    const closeProfileModal = document.getElementById("closeProfileModal");

    myProfileBtn.addEventListener("click", (e) => {
        e.preventDefault();
        profileModal.classList.remove("hidden");
    });
    closeProfileModal.addEventListener("click", () => profileModal.classList.add("hidden"));

    // Logout
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        fetch(API_BASE_URL + "/Auth/logout", {
            method: "POST",
            headers: authHeader()
        }).finally(() => {
            localStorage.removeItem("token");
            window.location.href = "index.html";
        });
    });

    // Mobile back button
    document.getElementById("mobileBackBtn").addEventListener("click", () => {
        const chatArea = document.getElementById("chatArea");
        chatArea.classList.remove("active");
    });

    // Sending Messages
    const sendBtn = document.getElementById("sendBtn");
    const messageInput = document.getElementById("messageInput");

    sendBtn.addEventListener("click", sendMessage);
    messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
    
    messageInput.addEventListener("input", () => {
        sendTyping(); // Realtime typing indicator
    });
}

// ----------------------------------------------------
// Data Fetching
// ----------------------------------------------------
async function fetchUsers() {
    try {
        const res = await fetch(API_BASE_URL + "/message/chat-users", { headers: authHeader() });
        if (res.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "index.html";
            return;
        }
        allUsers = await res.json();
        
        // If current tab is active, render it
        if (document.getElementById("tabUsers").classList.contains("active")) {
            renderList("users");
        }
    } catch (e) { console.error("Error fetching users", e); }
}

async function fetchGroups() {
    try {
        const res = await fetch(API_BASE_URL + "/group/my-groups", { headers: authHeader() });
        allGroups = await res.json();
        
        if (document.getElementById("tabGroups").classList.contains("active")) {
            renderList("groups");
        }
    } catch (e) { console.error("Error fetching groups", e); }
}

// ----------------------------------------------------
// Rendering
// ----------------------------------------------------
function renderList(type) {
    const listEl = document.getElementById("chatList");
    listEl.innerHTML = "";

    if (type === "users") {
        allUsers.forEach(u => {
            // build HTML for user
            const div = document.createElement("div");
            div.className = "chat-item";
            if (activeChatObj && activeChatObj.type === "user" && activeChatObj.id == u.userId) {
                 div.classList.add("active");
            }

            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=random&rounded=true`;
            let badgeHTML = u.unreadCount ? `<span class="badge">${u.unreadCount}</span>` : "";
            
            // Add missed call indicator
            if (u.missedCallCount > 0) {
                badgeHTML += `<span class="badge badge-missed" title="Missed Calls"><i class="fa fa-phone-slash"></i> ${u.missedCallCount} Call</span>`;
                div.classList.add("missed-call");
            }

            if (u.unreadCount > 0) {
                div.classList.add("unread");
            }

            div.innerHTML = `
                <div class="chat-item-avatar">
                    <img src="${avatarUrl}" alt="${u.username}">
                </div>
                <div class="chat-item-info">
                    <div class="chat-item-name">${u.username}</div>
                    <div class="chat-item-preview">${u.lastMessage || u.email || 'Click to chat'}</div>
                </div>
                <div class="chat-item-meta">
                    ${badgeHTML}
                    <div class="list-online-indicator" style="background-color: ${u.isOnline ? 'var(--online-color)' : '#cbd5e1'};"></div>
                </div>
            `;
            
            div.onclick = () => openChat("user", u.userId, u.username, u.isOnline);
            listEl.appendChild(div);
        });
    } else {
        allGroups.forEach(g => {
            const div = document.createElement("div");
            div.className = "chat-item";
            if (activeChatObj && activeChatObj.type === "group" && activeChatObj.id == g.groupId) {
                 div.classList.add("active");
            }
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(g.groupName)}&background=d63384&color=fff&rounded=true`;
            let badgeHTML = g.unreadCount ? `<span class="badge">${g.unreadCount}</span>` : "";

            if (g.unreadCount > 0) {
                div.classList.add("unread");
            }

            div.innerHTML = `
                <div class="chat-item-avatar">
                    <img src="${avatarUrl}" alt="${g.groupName}">
                </div>
                <div class="chat-item-info">
                    <div class="chat-item-name">${g.groupName}</div>
                    <div class="chat-item-preview">Group Chat</div>
                </div>
                <div class="chat-item-meta">
                    ${badgeHTML}
                </div>
            `;

            
            div.onclick = () => openChat("group", g.groupId, g.groupName);
            listEl.appendChild(div);
        });
    }
}

// ----------------------------------------------------
// Chat Panel
// ----------------------------------------------------
async function openChat(type, id, name, isOnline = false) {
    // Leave previous group if applicable
    if (type === "user") {
        localStorage.setItem("selectedUserId", id);
        console.log("Saved from openChat:", id);
    }
    if (activeChatObj && activeChatObj.type === "group" && typeof leaveGroupRealTime === 'function') {
        leaveGroupRealTime(activeChatObj.id);
    }

    activeChatObj = { type, id, name };

    // Join new group if applicable
    if (type === "group" && typeof joinGroupRealTime === 'function') {
        console.log("Joining Group:", id);
        joinGroupRealTime(id);
    }

    // Update UI elements
    document.getElementById("emptyState").classList.add("hidden");
    document.getElementById("activeChat").classList.remove("hidden");
    
    // Slide in on mobile devices
    const chatArea = document.getElementById("chatArea");
    if (chatArea) chatArea.classList.add("active");
    
    document.getElementById("activeChatName").textContent = name;
    
    const avatarImg = type === "group" 
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=d63384&color=fff&rounded=true`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&rounded=true`;
    document.getElementById("activeChatAvatar").src = avatarImg;

    const statusEl = document.getElementById("activeChatStatus");
    if (type === "group") {
        statusEl.textContent = "Loading members...";
        statusEl.className = "status-offline"; 
        
        // Fetch Group members
        fetch(API_BASE_URL + `/group/members?groupId=${id}`, { headers: authHeader() })
            .then(res => res.json())
            .then(members => {
                if (activeChatObj && activeChatObj.id === id) { // Double check we are still on this chat
                    const memNames = members.map(m => m.username).join(', ');
                    statusEl.textContent = `${members.length} members: ${memNames}`;
                }
            })
            .catch(e => console.error(e));
            
        // Clear unread count for group
        let g = allGroups.find(x => x.groupId == id);
        if (g) g.unreadCount = 0;
        if (typeof markGroupAsSeenRealTime === 'function') markGroupAsSeenRealTime(id);
    } else {

        // Find user to clear unread badge
        let u = allUsers.find(x => x.userId == id);
        if (u) u.unreadCount = 0;

        if (typeof markAsSeenRealTime === 'function') markAsSeenRealTime(id);

        statusEl.textContent = isOnline ? "Online" : "Offline";
        statusEl.className = isOnline ? "status-online" : "status-offline";
    }


    // Refresh Sidebar highlights and badges
    const activeTab = document.getElementById("tabUsers").classList.contains("active") ? "users" : "groups";
    renderList(activeTab);

    // Mobile specific: sliding panel
    document.getElementById("chatArea").classList.add("active");

    // Clear and Load Messages
    const chatMessagesEl = document.getElementById("chatMessages");
    chatMessagesEl.innerHTML = "";
    
    if (type === "user") {
        try {
            const res = await fetch(API_BASE_URL + "/message/history/" + id, { headers: authHeader() });
            const msgs = await res.json();
            msgs.forEach(m => {
                const isSentByMe = (m.senderId != id); // if sender is not the receiver, it's me
                appendMessageToUI(isSentByMe ? "Me" : m.senderUsername, m.messageText, m.timestamp, isSentByMe, m.messageType);
            });
        } catch(e) { console.error("Error fetching history", e); }
    } else {
        // Fetch group history
        try {
            const res = await fetch(API_BASE_URL + `/message/group/${id}/history`, { headers: authHeader() });
            if (res.ok) {
                const msgs = await res.json();
                msgs.forEach(m => {
                    const isSentByMe = m.senderUsername === (currentUser ? currentUser.name : "Me");
                    appendMessageToUI(isSentByMe ? "Me" : m.senderUsername, m.messageText, m.timestamp, isSentByMe);
                });
            }
        } catch(e) { console.error("Error fetching group history", e); }
    }
    
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    document.getElementById("messageInput").focus();
}

// ----------------------------------------------------
// Sending & Receiving
// ----------------------------------------------------
async function sendMessage() {
    if (!activeChatObj) return;

    const input = document.getElementById("messageInput");
    const msg = input.value.trim();
    if (!msg) return;

    const displayTime = new Date().toISOString();

    if (activeChatObj.type === "user") {
        // Send via private API
        try {
            await fetch(API_BASE_URL + "/message/send-private", {
                method: "POST",
                headers: authHeader(),
                body: JSON.stringify({
                    receiverId: activeChatObj.id,
                    messageText: msg
                })
            });
        } catch (e) {
            console.error("Private message failed", e);
        }
        
    } else {
        // Group Send (SignalR directly since there's no REST endpoint)
        if (typeof sendGroupMessageRealTime === 'function') {
            sendGroupMessageRealTime(parseInt(activeChatObj.id), msg);
            // Append locally since group hub might just broadcast to others or we might not get it if we don't save. 
            // Wait, ChatHub SendGroupMessage broadcasts to the whole group, including sender.
            // But just in case, let's wait for the event. Actually, we'll wait for ReceiveGroupMessage from SignalR.
        }
    }

    input.value = "";
}

function sendTyping() {
    if (activeChatObj && activeChatObj.type === "user" && typeof sendTypingRealTime === "function") {
        sendTypingRealTime(activeChatObj.id);
    }
}

function appendMessageToUI(sender, text, timestamp, isMine, messageType = "Text") {
    const el = document.getElementById("chatMessages");
    const wrapper = document.createElement("div");

    const timeFormatted = timestamp ? new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "";

    // Special rendering for call notifications
    if (messageType === "CallStarted" || messageType === "CallEnded" || messageType === "MissedCall") {
        wrapper.className = "message-system";
        wrapper.innerHTML = `
            <div class="system-text">${text}</div>
            <div class="system-time">${timeFormatted}</div>
        `;
    } else {
        wrapper.className = isMine ? "message-bubble message-sent" : "message-bubble message-received";
        wrapper.innerHTML = `
            <div class="message-sender">${sender}</div>
            <div class="message-text">${text}</div>
            <div class="message-time">${timeFormatted}</div>
        `;
    }

    el.appendChild(wrapper);
    el.scrollTop = el.scrollHeight;
}

// Global hooks for SignalR Client
window.onIncomingMessage = function(senderId, senderName, message, timestamp, isMine) {
    // If we're chatting with this user right now
    if (activeChatObj && activeChatObj.type === "user") {
        // If it's my own message echoing back, or a message from the person we are chatting with
        if (isMine || senderId == activeChatObj.id) {
            appendMessageToUI(isMine ? "Me" : senderName, message, timestamp, isMine);
            
            // Just immediately mark seen if it's the active chat
            if (!isMine && typeof markAsSeenRealTime === 'function') {
                markAsSeenRealTime(senderId);
            }
            return;
        }
    }

    if (!isMine && senderId) {
        // Bump Unread count if not active chat
        if (!(activeChatObj && activeChatObj.type === "user" && activeChatObj.id == senderId)) {
            const user = allUsers.find(u => u.userId == senderId);
            if (user) {
                user.unreadCount = (user.unreadCount || 0) + 1;
                if (document.getElementById("tabUsers").classList.contains("active")) {
                    renderList("users"); // re-render sidebar to show badge
                }
            }
        }
        
        if (Notification.permission === 'granted') {
            new Notification("New Message from " + senderName, { body: message });
        }
    }
};

window.onUnreadMessage = function (senderId) {
    // This is called when a notification record is created but we didn't necessarily get the message text via ReceiveMessage (or we did)
    // Actually, onIncomingMessage already handles the count bump.
    // But sometimes we might just get the notification event.
    // Let's ensure consistency.
    const user = allUsers.find(u => u.userId == senderId);
    if (user && !(activeChatObj && activeChatObj.type === "user" && activeChatObj.id == senderId)) {
        // Only increment if we haven't already or if we want to be sure.
        // Usually ReceiveMessage is enough for real-time.
        // fetchUsers() would also work but it's expensive.
        // For now, onIncomingMessage is doing the work.
    }
};

window.onIncomingGroupMessage = function (groupId, senderId, senderName, message, timestamp) {
    // If we're chatting in this group right now
    if (activeChatObj && activeChatObj.type === "group" && activeChatObj.id == groupId) {
        const isMine = (currentUser && senderId == currentUser.id);
        appendMessageToUI(isMine ? "Me" : senderName, message, timestamp, isMine);
    }
};

window.onGroupUnreadMessage = function (groupId) {
    // If we're not currently chatting in this group
    if (!(activeChatObj && activeChatObj.type === "group" && activeChatObj.id == groupId)) {
        const group = allGroups.find(g => g.groupId == groupId);
        if (group) {
            group.unreadCount = (group.unreadCount || 0) + 1;
            if (document.getElementById("tabGroups").classList.contains("active")) {
                renderList("groups");
            }
        }
    }
};



window.onUserStatusChanged = function(userId, isOnline) {
    // Update allUsers array
    const user = allUsers.find(u => u.userId == userId);
    if (user) user.isOnline = isOnline;

    // Refresh UI if necessary
    const activeTab = document.getElementById("tabUsers").classList.contains("active") ? "users" : "groups";
    if (activeTab === "users") renderList("users");

    // If chat is open with this user, update header
    if (activeChatObj && activeChatObj.type === "user" && activeChatObj.id == userId) {
        const statusEl = document.getElementById("activeChatStatus");
        statusEl.textContent = isOnline ? "Online" : "Offline";
        statusEl.className = isOnline ? "status-online" : "status-offline";
    }
};

window.onUserTypingChanged = function(senderId, senderName) {
    if (activeChatObj && activeChatObj.type === "user" && activeChatObj.id == senderId) {
        const ind = document.getElementById("typingIndicator");
        if (ind) {
            ind.textContent = (senderName || "Someone") + " is typing...";
            ind.classList.remove("hidden");
            clearTimeout(window.typingTimer);
            window.typingTimer = setTimeout(() => {
                ind.classList.add("hidden");
            }, 2000);
        }
    }
};

window.onReceiveCallNotification = function(msg) {
    // Refresh the user list to update missed call counts and previews
    fetchUsers();

    // Browser Notification for missed call - ONLY for the receiver
    if (msg.messageType === "MissedCall" && msg.receiverId == currentUser.id) {
        showBrowserNotification("Missed Call", `You missed a call from ${msg.senderName || 'someone'}`);
    }

    // If we're chatting with this user right now
    if (activeChatObj && activeChatObj.type === "user") {
        if (msg.senderId == activeChatObj.id || msg.receiverId == activeChatObj.id) {
            // isMine means I am the one who sent this system message (e.g. I ended the call)
            const isMine = (msg.senderId == currentUser.id);
            appendMessageToUI(isMine ? "Me" : activeChatObj.name, msg.messageText, msg.timestamp, isMine, msg.messageType);
            
            // Mark as seen immediately if the chat is open
            if (!isMine && typeof markAsSeenRealTime === 'function') {
                markAsSeenRealTime(msg.senderId);
            }
            return;
        }
    }
};

function showBrowserNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: "https://ui-avatars.com/api/?name=MR&background=d63384&color=fff&rounded=true"
        });
    }
}

// ----------------------------------------------------
// Group Creation
// ----------------------------------------------------
function populateGroupParticipants() {
    const list = document.getElementById("participantList");
    list.innerHTML = "";
    allUsers.forEach(u => {
        const div = document.createElement("div");
        div.className = "participant-item";
        div.innerHTML = `
            <input type="checkbox" id="user_${u.userId}" value="${u.userId}" class="participant-checkbox">
            <label for="user_${u.userId}">${u.username}</label>
        `;
        list.appendChild(div);
    });
}

async function handleCreateGroup() {
    const nameInput = document.getElementById("groupNameInput");
    const groupName = nameInput.value.trim();
    if (!groupName) return alert("Group name is required");

    const checkboxes = document.querySelectorAll(".participant-checkbox:checked");
    const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if (selectedIds.length === 0) return alert("Select at least one participant");

    try {
        const res = await fetch(API_BASE_URL + "/group/create", {
            method: "POST",
            headers: authHeader(),
            body: JSON.stringify({
                GroupName: groupName,
                UserIds: selectedIds
            })
        });

        if (res.ok) {
            alert("Group Created Successfully!");
            document.getElementById("groupModal").classList.add("hidden");
            nameInput.value = "";
            fetchGroups(); // refresh groups list
        } else {
            alert("Failed to create group.");
        }
    } catch (e) { console.error("Error creating group", e); }
}

// Request Desktop Notifications simply
if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
}