let chatConnection = null;

// Ensure this matches your backend hub URL from config.js
async function initSignalR() {
    const token = getToken();
    if (!token) {
        console.error("No token available for SignalR connection.");
        return;
    }

    chatConnection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
            accessTokenFactory: () => token
        })
        .withAutomaticReconnect()
        .build();

    // Event: Receive Private Message From Someone
    chatConnection.on("ReceiveGroupMessage", function (groupId, senderId, senderName, message, timestamp) {
        console.log("Group message received:", message);

        if (window.onIncomingGroupMessage) {
            window.onIncomingGroupMessage(groupId, senderId, senderName, message, timestamp);
        }
    });


    chatConnection.on("GroupUnreadMessage", function (groupId) {
        if (window.onGroupUnreadMessage) {
            window.onGroupUnreadMessage(groupId);
        }
    });


    // Event: Receive Our Own Message (so it shows up across our devices)
    chatConnection.on("ReceiveOwnMessage", function (receiverId, message, timestamp) {
        if (window.onIncomingMessage) {
            window.onIncomingMessage(null, "Me", message, timestamp, true);
        }
    });


    // Event: User Status Changed (Online / Offline)
    chatConnection.on("UserStatusChanged", function (userId, isOnline) {
        if (window.onUserStatusChanged) {
            window.onUserStatusChanged(userId, isOnline);
        }
    });

    // Event: User Typing
    chatConnection.on("UserTyping", function (senderId) {
        if (window.onUserTypingChanged) {
            window.onUserTypingChanged(senderId);
        }
    });

    try {
        await chatConnection.start();
        console.log("SignalR Connected successfully!");
    } catch (err) {
        console.error("SignalR Connection Error:", err);
        setTimeout(initSignalR, 5000); // retry
    }
}

// Global senders
async function sendPrivateMessageRealTime(receiverId, message) {
    if (chatConnection && chatConnection.state === signalR.HubConnectionState.Connected) {
        try {
            await chatConnection.invoke("SendPrivateMessage", parseInt(receiverId), message);
        } catch (err) {
            console.error(err);
        }
    }
}

async function sendGroupMessageRealTime(groupId, message) {
    if (chatConnection && chatConnection.state === signalR.HubConnectionState.Connected) {
        try {
            await chatConnection.invoke("SendGroupMessage", parseInt(groupId), message);
        } catch (err) {
            console.error(err);
        }
    }
}

async function joinGroupRealTime(groupId) {
    if (chatConnection && chatConnection.state === signalR.HubConnectionState.Connected) {
        try {
            await chatConnection.invoke("JoinGroup", groupId.toString());
        } catch (err) {
            console.error(err);
        }
    }
}

async function leaveGroupRealTime(groupId) {
    if (chatConnection && chatConnection.state === signalR.HubConnectionState.Connected) {
        try {
            await chatConnection.invoke("LeaveGroup", groupId.toString());
        } catch (err) {
            console.error(err);
        }
    }
}

async function sendTypingRealTime(receiverId) {
    if (chatConnection && chatConnection.state === signalR.HubConnectionState.Connected) {
        try {
            await chatConnection.invoke("Typing", parseInt(receiverId));
        } catch (err) {
            console.error(err);
        }
    }
}

async function markAsSeenRealTime(senderId) {
    if (chatConnection && chatConnection.state === signalR.HubConnectionState.Connected) {
        try {
            await chatConnection.invoke("MarkAsSeen", parseInt(senderId));
        } catch (err) {
            console.error(err);
        }
    }
}

async function markGroupAsSeenRealTime(groupId) {
    if (chatConnection && chatConnection.state === signalR.HubConnectionState.Connected) {
        try {
            await chatConnection.invoke("MarkGroupAsSeen", parseInt(groupId));
        } catch (err) {
            console.error(err);
        }
    }
}

