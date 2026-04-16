// ================= LOG CURRENT USER =================
let myName = localStorage.getItem("userName") || "User"; // default

// ================= SIGNALR =================
let connection = new signalR.HubConnectionBuilder()
    .withUrl(window.location.origin + "/videoCallHub", {
        accessTokenFactory: () => localStorage.getItem("token")
    })
    .withAutomaticReconnect()
    .build();

// 🔁 Reconnect logs
connection.onreconnecting(() => console.log("⚠️ Reconnecting..."));
connection.onreconnected(() => console.log("✅ Reconnected"));
connection.onclose(() => console.log("❌ Connection closed"));

// 🔌 Start connection
async function startConnection() {
    try {
        await connection.start();
        console.log("✅ Video SignalR Connected");
    } catch (err) {
        console.log("Retrying video connection...", err);
        setTimeout(startConnection, 3000);
    }
}
startConnection();

// ================= VARIABLES =================
let peerConnection = null;
let localStream = null;
let targetUserId = null;
let candidateQueue = [];

window.isInCall = false;

// ================= DOM READY =================
document.addEventListener("DOMContentLoaded", () => {
    
    // Attempt to retrieve actual name if available from DOM
    setTimeout(() => {
        let nameEl = document.getElementById("myName");
        if (nameEl && nameEl.innerText && nameEl.innerText !== "My Name") {
            myName = nameEl.innerText;
        }
    }, 1000);

    const callBtn = document.getElementById("callBtn");
    const endBtn = document.getElementById("endCallBtn");

    // 📞 CALL BUTTON
    callBtn?.addEventListener("click", async () => {
        targetUserId = localStorage.getItem("selectedUserId");
        if (!targetUserId) {
            alert("Select a user first");
            return;
        }
        if (window.isInCall) {
            alert("Already in a call");
            return;
        }
        
        console.log("📞 Calling user:", targetUserId);
        await startCall();
    });

    // ❌ END CALL
    endBtn?.addEventListener("click", () => {
        if (targetUserId) {
            connection.invoke("EndCall", targetUserId).catch(console.error);
        }
        endCallUI();
    });

    // ✅ ACCEPT CALL
    document.getElementById("acceptCallBtn")?.addEventListener("click", async () => {
        document.getElementById("incomingCallPopup").classList.add("hidden");

        window.isInCall = true;
        targetUserId = window.callerId;

        document.getElementById("videoCallContainer").classList.remove("hidden");

        await initMedia();
        createPeerConnection();

        await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(window.incomingOffer)));
        
        // Add queued candidates
        while (candidateQueue.length > 0) {
            const candidate = candidateQueue.shift();
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        connection.invoke("SendAnswer", targetUserId, JSON.stringify(answer)).catch(console.error);
    });

    // ❌ REJECT CALL
    document.getElementById("rejectCallBtn")?.addEventListener("click", () => {
        document.getElementById("incomingCallPopup").classList.add("hidden");

        connection.invoke("RejectCall", window.callerId).catch(console.error);
        
        targetUserId = null;
        window.callerId = null;
        window.incomingOffer = null;
    });
});


// ================= START CALL =================
async function startCall() {
    try {
        candidateQueue = []; // Clear for new call
        window.isInCall = true;
        document.getElementById("videoCallContainer").classList.remove("hidden");

        await initMedia();
        createPeerConnection();

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        console.log("📡 Sending offer to:", targetUserId);

        await connection.invoke("SendOffer", targetUserId, JSON.stringify(offer), myName);

    } catch (err) {
        console.error("Start Call Error:", err);
        endCallUI();
    }
}


// ================= MEDIA =================
async function initMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        document.getElementById("localVideo").srcObject = localStream;
    } catch (err) {
        console.error("Media error:", err);
        alert("Camera/Mic access failed");
        throw err;
    }
}


// ================= PEER =================
function createPeerConnection() {
    // candidateQueue = []; // DO NOT CLEAR HERE - candidates might have arrived before acceptance
    peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun.services.mozilla.com" }
        ]
    });

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        console.log("🎥 Remote stream received:", event.track.kind);
        const remoteVideo = document.getElementById("remoteVideo");
        
        // Use the first stream provided by the event
        if (event.streams && event.streams[0]) {
            if (remoteVideo.srcObject !== event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
                console.log("✅ Remote stream assigned from event.streams[0]");
            }
        } else {
            // Fallback for tracks without streams
            if (!remoteVideo.srcObject) {
                remoteVideo.srcObject = new MediaStream();
            }
            remoteVideo.srcObject.addTrack(event.track);
            console.log("✅ Remote track added to new MediaStream");
        }

        // Ensure remote video is unmuted for sound
        remoteVideo.muted = false;
        remoteVideo.volume = 1.0;

        // Try to play the video to ensure sound and picture are active
        const playPromise = remoteVideo.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.warn("Auto-play failed, may need user interaction:", err);
                // On some browsers we might need to show a "Play" button if autoplay is blocked
            });
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log("❄️ ICE Connection State:", peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === "failed" || peerConnection.iceConnectionState === "disconnected") {
            console.error("⚠️ ICE Connection State:", peerConnection.iceConnectionState);
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && targetUserId) {
            connection.invoke("SendIceCandidate", targetUserId, JSON.stringify(event.candidate)).catch(console.error);
        }
    };
}


// ================= RECEIVE OFFER =================
connection.on("ReceiveOffer", async (callerId, offer, callerName) => {
    console.log("🔥 ReceiveOffer triggered from", callerName);
    
    if (window.isInCall) {
        // Busy
        connection.invoke("RejectCall", callerId).catch(console.error);
        return;
    }

    candidateQueue = []; // Clear for new incoming call
    window.incomingOffer = offer;
    window.callerId = callerId;
    
    document.getElementById("callerName").innerText = "Incoming Call from " + (callerName || "User") + "...";
    document.getElementById("incomingCallPopup").classList.remove("hidden");
});


// ================= RECEIVE ANSWER =================
connection.on("ReceiveAnswer", async (answer) => {
    if (peerConnection && peerConnection.signalingState !== "closed") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
        
        while (candidateQueue.length > 0) {
            const candidate = candidateQueue.shift();
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }
});


// ================= ICE =================
connection.on("ReceiveIceCandidate", async (candidate) => {
    const iceCandidate = JSON.parse(candidate);
    if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
    } else {
        candidateQueue.push(iceCandidate);
    }
});


// ================= CALL REJECTED =================
connection.on("CallRejected", () => {
    console.log("📴 Call was rejected");
    alert("The user is busy or rejected the call.");
    endCallUI();
});


// ================= CALL ENDED =================
connection.on("CallEnded", () => {
    console.log("📴 Call ended by remote user");
    endCallUI();
});


// ================= END CALL =================
function endCallUI() {
    window.isInCall = false;
    targetUserId = null;

    // Reset popup
    document.getElementById("incomingCallPopup")?.classList.add("hidden");

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    document.getElementById("localVideo").srcObject = null;
    document.getElementById("remoteVideo").srcObject = null;
    document.getElementById("videoCallContainer").classList.add("hidden");
}