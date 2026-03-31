async function loadLabels() {
    try {
        const res = await fetch("/api/localization/labels");
        if (!res.ok) throw new Error("Failed to fetch labels");
        const labels = await res.json();
        applyLabels(labels);
        markActiveLanguage();
    } catch (e) {
        console.error("Localization Error:", e);
    }
}

function applyLabels(labels) {
    // 1. Apply by [data-i18n] attribute
    const elements = document.querySelectorAll("[data-i18n]");
    elements.forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (labels[key]) {
            if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                el.placeholder = labels[key];
            } else {
                el.innerText = labels[key];
            }
        }
    });

    // 2. Fallback: Apply by ID if key matches ID (for existing code compatibility)
    for (const key in labels) {
        const el = document.getElementById(key);
        if (el && !el.hasAttribute("data-i18n")) {
            if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                el.placeholder = labels[key];
            } else {
                el.innerText = labels[key];
            }
        }
    }
}

function setLanguage(culture) {
    const cookieValue = "c=" + culture + "|uic=" + culture;
    document.cookie = ".AspNetCore.Culture=" + cookieValue + "; path=/; expires=Fri, 31 Dec 2030 23:59:59 GMT; SameSite=Lax";
    location.reload();
}

function markActiveLanguage() {
    const cookies = document.cookie.split("; ");
    const cultureCookie = cookies.find(row => row.startsWith(".AspNetCore.Culture="));
    let currentLang = "en"; // default
    if (cultureCookie) {
        const val = decodeURIComponent(cultureCookie.split("=")[1]);
        if (val.includes("c=de")) currentLang = "de";
        else if (val.includes("c=en")) currentLang = "en";
    }

    const options = document.querySelectorAll(".lang-option");
    options.forEach(opt => {
        opt.classList.remove("active");
        if (opt.id === "lang-" + currentLang) {
            opt.classList.add("active");
        }
    });
}

// Initial load if on a page that needs it
document.addEventListener("DOMContentLoaded", () => {
    loadLabels();

    // Toggle Dropdown
    const langBtn = document.getElementById("langBtn");
    const langDropdown = document.getElementById("langDropdown");

    if (langBtn && langDropdown) {
        langBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle("active");
        });

        document.addEventListener("click", () => {
            langDropdown.classList.remove("active");
        });
    }
});
