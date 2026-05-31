window.onload = () => {

    console.log("✔ SYSTEM READY");

    let mode = "login";
    let userColor = "#3788d8";
    let settingsOpen = false;

    const modal = document.getElementById("auth_modal");
    const title = document.getElementById("modal_title");
    const submitBtn = document.getElementById("auth_submit");

    document.getElementById("login_btn").onclick = () => openAuth("login");
    document.getElementById("signin_btn").onclick = () => openAuth("register");

    function openAuth(type) {
        mode = type;
        modal.classList.remove("hidden");
        title.innerText = type === "login" ? "Login" : "Sign in";
        submitBtn.innerText = title.innerText;
    }

    window.closeModal = () => modal.classList.add("hidden");

    submitBtn.onclick = async () => {
        const username = document.getElementById("auth_user").value;
        const password = document.getElementById("auth_pass").value;
        const res = await fetch(mode === "login" ? "/login" : "/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        alert(data.message || data.error);
        if (res.ok && mode === "login") {
            const meRes = await fetch("/me");
            const meData = await meRes.json();
            if (meData.logged) {
                userColor = meData.color || "#3788d8";
                closeModal();
                showApp();
            }
        }
    };

    async function checkSession() {
        const res = await fetch("/me");
        const data = await res.json();
        if (data.logged) {
            userColor = data.color || "#3788d8";
            showApp();
        } else {
            document.getElementById("calendar").style.display = "none";
        }
    }

    // ---------------- SETTINGS PANEL ----------------

    const settingsPanel = document.createElement("div");
    settingsPanel.id = "settings_panel";
    settingsPanel.style.cssText = `
        display: none;
        position: fixed;
        top: 65px;
        left: 12px;
        background: rgba(40, 40, 40, 0.97);
        border: 1px solid rgba(0, 153, 255, 0.5);
        border-radius: 12px;
        box-shadow: 0 5px 20px rgba(0, 153, 255, 0.3);
        padding: 10px;
        z-index: 9999;
        display: none;
        flex-direction: column;
        gap: 8px;
        min-width: 180px;
    `;

    const colorBtn = document.createElement("button");
    colorBtn.innerText = "🎨 Account color";
    colorBtn.style.cssText = `
        background: rgba(0, 153, 255, 0.2);
        border: 1px solid rgba(0, 153, 255, 0.5);
        color: white;
        padding: 10px 14px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
        text-align: left;
        transition: 0.2s;
    `;
    colorBtn.onmouseover = () => colorBtn.style.background = "rgba(0, 153, 255, 0.5)";
    colorBtn.onmouseout = () => colorBtn.style.background = "rgba(0, 153, 255, 0.2)";

    colorBtn.onclick = () => {
        const input = document.createElement("input");
        input.type = "color";
        input.value = userColor;
        input.oninput = async (e) => {
            userColor = e.target.value;
            await fetch("/me/color", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ color: userColor })
            });
            await calendar.refetchEvents();
        };
        input.click();
    };

    const logoutBtn = document.createElement("button");
    logoutBtn.innerText = "🚪 Disconnect";
    logoutBtn.style.cssText = `
        background: rgba(255, 60, 60, 0.2);
        border: 1px solid rgba(255, 60, 60, 0.5);
        color: white;
        padding: 10px 14px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
        text-align: left;
        transition: 0.2s;
    `;
    logoutBtn.onmouseover = () => logoutBtn.style.background = "rgba(255, 60, 60, 0.5)";
    logoutBtn.onmouseout = () => logoutBtn.style.background = "rgba(255, 60, 60, 0.2)";

    logoutBtn.onclick = async () => {
        await fetch("/logout", { method: "POST" });
        location.reload();
    };

    settingsPanel.appendChild(colorBtn);
    const fixBtn = document.createElement("button");
    fixBtn.innerText = "🔧 Claim old events";
    fixBtn.style.cssText = `
    background: rgba(255, 180, 0, 0.2);
    border: 1px solid rgba(255, 180, 0, 0.5);
    color: white;
    padding: 10px 14px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 14px;
    text-align: left;
    transition: 0.2s;
`;
    fixBtn.onmouseover = () => fixBtn.style.background = "rgba(255, 180, 0, 0.5)";
    fixBtn.onmouseout = () => fixBtn.style.background = "rgba(255, 180, 0, 0.2)";
    fixBtn.onclick = async () => {
        await fetch("/fix-my-events", { method: "POST" });
        await calendar.refetchEvents();
        settingsPanel.style.display = "none";
        settingsOpen = false;
    };
    settingsPanel.appendChild(fixBtn);
    settingsPanel.appendChild(logoutBtn);
    document.body.appendChild(settingsPanel);

    document.getElementById("setting_btn").onclick = (e) => {
        e.stopPropagation();
        settingsOpen = !settingsOpen;
        settingsPanel.style.display = settingsOpen ? "flex" : "none";
    };

    document.addEventListener("click", (e) => {
        if (settingsOpen && !settingsPanel.contains(e.target) && e.target.id !== "setting_btn") {
            settingsOpen = false;
            settingsPanel.style.display = "none";
        }
    });

    // ---------------- CALENDAR ----------------

    const calendarEl = document.getElementById("calendar");
    let editingEvent = null;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridWeek",
        timeZone: "local",
        events: "/events",
        headerToolbar: {
            left: "prev,next today addEvent",
            center: "title",
            right: "dayGridDay,dayGridWeek,dayGridMonth"
        },
        customButtons: {
            addEvent: { text: "+ Event", click: () => openModalEvent(null) }
        },
        locale: "fr",
        dayHeaderFormat: { weekday: "long", day: "2-digit", month: "2-digit" },
        editable: false,
        navLinks: true,
        dayMaxEvents: false,
        eventDisplay: "block",
        eventOverlap: false,
        slotEventOverlap: false,
        eventMaxStack: 999,
        views: {
            dayGridMonth: { dayMaxEvents: 3, fixedWeekCount: false }
        },
        eventOrder: "start,-duration,title",
        eventClick: (info) => openModalEvent(info.event)
    });

    // ---------------- EVENT MODAL ----------------

    const eventModal = document.getElementById("event_modal");
    const eventTitle = document.getElementById("event_title");
    const eventDate = document.getElementById("event_date");
    const sh = document.getElementById("start_hour");
    const sm = document.getElementById("start_minute");
    const eh = document.getElementById("end_hour");
    const em = document.getElementById("end_minute");
    const deleteBtn = document.getElementById("event_delete");

    function fill(e) {
        const s = new Date(e.start);
        const en = e.end ? new Date(e.end) : new Date(s.getTime() + 3600000);
        eventDate.value = s.toISOString().split("T")[0];
        sh.value = s.getHours();
        sm.value = s.getMinutes();
        eh.value = en.getHours();
        em.value = en.getMinutes();
    }

    function buildDate() {
        const d = eventDate.value;
        const start = new Date(d);
        start.setHours(sh.value, sm.value, 0, 0);
        const end = new Date(d);
        end.setHours(eh.value, em.value, 0, 0);
        return { start, end };
    }

    function openModalEvent(event) {
        eventModal.classList.remove("hidden");
        if (event) {
            editingEvent = event;
            eventTitle.value = event.title;
            fill(event);
            deleteBtn.style.display = "inline-block";
            document.getElementById("event_submit").innerText = "Modifier";
        } else {
            editingEvent = null;
            eventTitle.value = "";
            const now = new Date();
            eventDate.value = now.toISOString().split("T")[0];
            sh.value = now.getHours();
            sm.value = 0;
            eh.value = now.getHours() + 1;
            em.value = 0;
            deleteBtn.style.display = "none";
            document.getElementById("event_submit").innerText = "Créer";
        }
    }

    window.closeEventModal = () => {
        eventModal.classList.add("hidden");
        editingEvent = null;
    };

    document.getElementById("event_submit").onclick = async () => {
        const title = eventTitle.value;
        if (!title) return;
        const { start, end } = buildDate();
        if (editingEvent) {
            const res = await fetch("/events/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editingEvent.id, title, start, end })
            });
            if (res.status === 403) {
                alert("Vous ne pouvez pas modifier un événement d'un autre compte.");
                closeEventModal();
                return;
            }
        } else {
            await fetch("/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, start, end })
            });
        }
        await calendar.refetchEvents();
        closeEventModal();
    };

    deleteBtn.onclick = async () => {
        if (!editingEvent) return;
        const res = await fetch("/events/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingEvent.id })
        });
        if (res.status === 403) {
            alert("Vous ne pouvez pas supprimer un événement d'un autre compte.");
            closeEventModal();
            return;
        }
        editingEvent.remove();
        await calendar.refetchEvents();
        closeEventModal();
    };

    // ---------------- APP ----------------

    function showApp() {
        document.getElementById("login_btn").style.display = "none";
        document.getElementById("signin_btn").style.display = "none";
        document.querySelector(".page").style.display = "none";
        document.getElementById("calendar").style.display = "block";
        document.getElementById("setting_btn").style.display = "block";
        calendar.render();
    }

    checkSession();
};