window.onload = () => {

    console.log("✔ SYSTEM READY");

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
            addEvent: {
                text: "+ Event",
                click: () => openModalEvent(null)
            }
        },

        locale: "fr",
        dayHeaderFormat: { weekday: "long", day: "2-digit", month: "2-digit" },
        initialView: "dayGridWeek",
        editable: false,
        navLinks: true,
        dayMaxEvents: false,
        eventDisplay: "block",
        eventOverlap: false,
        slotEventOverlap: false,
        dayMaxEventRows: false,
        eventMaxStack: 999,

        eventOrder: "start,-duration,title",

        eventClick: (info) => {
            openModalEvent(info.event);
        }
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
        }
    }

    window.closeEventModal = () => {
        eventModal.classList.add("hidden");
        editingEvent = null;
    };

    // ---------------- SAVE ----------------

    document.getElementById("event_submit").onclick = async () => {

        const title = eventTitle.value;
        if (!title) return;

        const { start, end } = buildDate();

        if (editingEvent) {

            await fetch("/events/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editingEvent.id,
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

        await calendar.refetchEvents();
        closeEventModal();
    };

    // ---------------- DELETE ----------------

    deleteBtn.onclick = async () => {

        if (!editingEvent) return;

        await fetch("/events/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingEvent.id })
        });

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

        calendar.render();
    }

    // ---------------- START ----------------
    checkSession();
};