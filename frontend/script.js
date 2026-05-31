window.onload = () => {

    // ---------------- AUTH ----------------
    let mode = "login";

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
            closeModal();
            showApp();
        }
    };

    async function checkSession() {
        const res = await fetch("/me");
        if (res.ok) showApp();
        else document.getElementById("calendar").style.display = "none";
    }

    // ---------------- CALENDAR ----------------

    const calendarEl = document.getElementById("calendar");

    let editingId = null;

    const calendar = new FullCalendar.Calendar(calendarEl, {

        initialView: "dayGridMonth",
        events: "/events",

        timeZone: "local",

        headerToolbar: {
            left: "prev,next today addEvent",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
        },

        customButtons: {
            addEvent: {
                text: "+ Event",
                click: () => openModal()
            }
        },

        editable: true,
        navLinks: true,
        dayMaxEvents: true,

        eventDisplay: "block",

        eventTimeFormat: {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        },

        eventOrder: "start,-duration,title",

        // IMPORTANT: empêche conflits visuels
        eventOverlap: true,

        // ---------------- EDIT ----------------
        eventClick: (info) => {
            editingId = info.event.id;

            openModal({
                id: info.event.id,
                title: info.event.title,
                start: info.event.start,
                end: info.event.end
            });
        }
    });

    // ---------------- MODAL ----------------

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

    window.openModal = (event = null) => {

        eventModal.classList.remove("hidden");

        if (event) {
            editingId = event.id;
            eventTitle.value = event.title;
            fill(event);
            deleteBtn.style.display = "inline-block";
        } else {
            editingId = null;
            eventTitle.value = "";
            deleteBtn.style.display = "none";
        }
    };

    window.closeEventModal = () => {
        eventModal.classList.add("hidden");
        editingId = null;
    };

    // ---------------- SAVE (ANTI BUG IMPORTANT) ----------------

    document.getElementById("event_submit").onclick = async () => {

        const title = eventTitle.value;
        if (!title) return;

        const { start, end } = buildDate();

        if (editingId) {

            await fetch("/events/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editingId,
                    title,
                    start,
                    end
                })
            });

        } else {

            await fetch("/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, start, end })
            });
        }

        await calendar.refetchEvents(); // IMPORTANT
        closeEventModal();
    };

    // ---------------- DELETE (FIX BUG REAPPEAR) ----------------

    deleteBtn.onclick = async () => {

        if (!editingId) return;

        await fetch("/events/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId })
        });

        await calendar.refetchEvents(); // CRUCIAL
        closeEventModal();
    };

    // ---------------- SHOW ----------------

    function showApp() {
        document.getElementById("login_btn").style.display = "none";
        document.getElementById("signin_btn").style.display = "none";
        document.querySelector(".page").style.display = "none";
        document.getElementById("calendar").style.display = "block";

        calendar.render();
    }

    // ---------------- ADMIN ----------------

    window.loginAdmin = async () => {
        const password = document.getElementById("admin_pass").value;

        const res = await fetch("/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });

        const data = await res.json();
        alert(data.message || data.error);
    };

    checkSession();
};