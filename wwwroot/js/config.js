const BASE_URL = window.location.origin;

window.API_BASE = BASE_URL + "/api";
window.HUB_URL = BASE_URL + "/chatHub";

function getToken() {
    return localStorage.getItem("token");
}

function authHeader() {
    return {
        "Authorization": "Bearer " + getToken(),
        "Content-Type": "application/json"
    };
}