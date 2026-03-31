const API_BASE = "https://localhost:7062/api";
const HUB_URL = "https://localhost:7062/chatHub";

function getToken() {
    return localStorage.getItem("token");
}

function authHeader() {
    return {
        "Authorization": "Bearer " + getToken(),
        "Content-Type": "application/json"
    };
}