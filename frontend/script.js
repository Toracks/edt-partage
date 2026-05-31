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

    let selectedEvent = null;

    const calendar = new FullCalendar.Calendar(calendarEl, {

        initialView: "dayGridMonth",
        timeZone: "local",

        events: "/events",

        headerToolbar: {
            left: "prev,next today addEvent",
            center: "title",
            right: "timeGridDay,timeGridWeek,dayGridMonth"
        },

        locale: "fr",

        editable: true,
        navLinks: true,
        dayMaxEvents: true,

        eventDisplay: "block",

        eventOrder: "start,-duration,title",

        customButtons: {
            addEvent: {
                text: "+ Event",
                click: () => openEventModal()
            }
        },

        // ---------------- CLICK EVENT ----------------
        eventClick: (info) => {
            selectedEvent = info.event;

            openEventModal({
                id: info.event.id,
                title: info.event.title,
                start: info.event.start,
                end: info.event.end
            });
        }
    });

    // ---------------- EVENT MODAL ----------------

    const eventModal = document.getElementById("event_modal");
    const eventTitle = document.getElementById("event_title");
    const eventDate = document.getElementById("event_date");
    const startHour = document.getElementById("start_hour");
    const startMinute = document.getElementById("start_minute");
    const endHour = document.getElementById("end_hour");
    const endMinute = document.getElementById("end_minute");
    const deleteBtn = document.getElementById("event_delete");

    let editingId = null;

    function fillFields(event) {
        if (!event) return;

        const s = new Date(event.start);
        const e = event.end ? new Date(event.end) : new Date(s.getTime() + 3600000);

        eventDate.value = s.toISOString().split("T")[0];

        startHour.value = s.getHours();
        startMinute.value = s.getMinutes();

        endHour.value = e.getHours();
        endMinute.value = e.getMinutes();
    }

    window.openEventModal = (event = null) => {

        eventModal.classList.remove("hidden");

        if (event) {
            editingId = event.id;
            eventTitle.value = event.title;
            fillFields(event);
            deleteBtn.style.display = "inline-block";
        } else {
            editingId = null;
            eventTitle.value = "";
            eventDate.value = "";
            startHour.value = "";
            startMinute.value = "";
            endHour.value = "";
            endMinute.value = "";
            deleteBtn.style.display = "none";
        }
    };

    window.closeEventModal = () => {
        eventModal.classList.add("hidden");
        selectedEvent = null;
        editingId = null;
    };

    function buildDate() {

        const date = eventDate.value;
        const sh = parseInt(startHour.value);
        const sm = parseInt(startMinute.value);
        const eh = parseInt(endHour.value);
        const em = parseInt(endMinute.value);

        const start = new Date(date);
        start.setHours(sh, sm, 0, 0);

        const end = new Date(date);
        end.setHours(eh, em, 0, 0);

        return { start, end };
    }

    // ---------------- SAVE (CREATE + UPDATE) ----------------

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
                body: JSON.stringify({
                    title,
                    start,
                    end
                })
            });
        }

        calendar.refetchEvents(); // IMPORTANT (évite doublons)
        closeEventModal();
    };

    // ---------------- DELETE ----------------

    deleteBtn.onclick = async () => {

        if (!editingId) return;

        await fetch("/events/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId })
        });

        calendar.refetchEvents(); // IMPORTANT (évite réapparition)
        closeEventModal();
    };

    // ---------------- DISPLAY FIX (HORAIRES VISIBLES) ----------------

    calendar.setOption("eventTimeFormat", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });

    // ---------------- APP ----------------

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

    // ---------------- START ----------------

    checkSession();
};