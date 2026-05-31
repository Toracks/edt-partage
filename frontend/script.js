window.onload = () => {

    let mode = "login";

    const modal = document.getElementById("auth_modal");
    const title = document.getElementById("modal_title");
    const submitBtn = document.getElementById("auth_submit");

    const eventModal = document.getElementById("event_modal");
    const eventTitle = document.getElementById("event_title");
    const deleteBtn = document.getElementById("event_delete");

    let calendar;
    let selectedRange = null;
    let editingEvent = null;

    // ---------------- AUTH ----------------

    document.getElementById("login_btn").onclick = () => openModal("login");
    document.getElementById("signin_btn").onclick = () => openModal("register");

    function openModal(type) {
        mode = type;
        modal.classList.remove("hidden");

        title.innerText = type === "login" ? "Login" : "Sign in";
        submitBtn.innerText = type === "login" ? "Login" : "Register";
    }

    window.closeModal = () => modal.classList.add("hidden");

    submitBtn.addEventListener("click", async () => {

        const username = document.getElementById("auth_user").value;
        const password = document.getElementById("auth_pass").value;

        const url = mode === "login" ? "/login" : "/register";

        const res = await fetch(url, {
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
    });

    async function checkSession() {
        const res = await fetch("/me");
        if (res.ok) showApp();
        else document.getElementById("calendar").style.display = "none";
    }

    // ---------------- CALENDAR ----------------

    const calendarEl = document.getElementById("calendar");

    window.openEventModal = openEventModal;

    calendar = new FullCalendar.Calendar(calendarEl, {

        initialView: "dayGridMonth",
        events: "/events",

        headerToolbar: {
            left: "prev,next today addEventButton",
            center: "title",
            right: "timeGridDay,timeGridWeek,dayGridMonth"
        },

        locale: "fr",

        editable: true,
        navLinks: true,
        dayMaxEvents: true,
        eventDisplay: "block",

        slotMinTime: "06:00:00",
        slotMaxTime: "23:00:00",

        customButtons: {
            addEventButton: {
                text: "+ Event",
                click: () => openEventModal()
            }
        },

        // ---------------- DISPLAY CLEAN + HOURS ----------------
        eventContent: function (arg) {

            const format = (d) => d
                ? new Date(d).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit"
                })
                : "";

            const time = arg.event.allDay
                ? ""
                : `${format(arg.event.start)} - ${format(arg.event.end)}`;

            return {
                html: `
                    <div class="fc-custom-event">
                        <div>${arg.event.title}</div>
                        ${time ? `<div style="font-size:11px;opacity:0.8">${time}</div>` : ""}
                    </div>
                `
            };
        },

        // ---------------- EDIT ----------------
        eventClick: function (info) {

            editingEvent = info.event;

            selectedRange = {
                start: info.event.start,
                end: info.event.end || new Date(info.event.start.getTime() + 3600000),
                allDay: info.event.allDay
            };

            eventTitle.value = info.event.title;

            deleteBtn.style.display = "inline-block";
            eventModal.classList.remove("hidden");
        }
    });

    // ---------------- CLOSE ----------------

    window.closeEventModal = () => {
        eventModal.classList.add("hidden");
        eventTitle.value = "";
        selectedRange = null;
        editingEvent = null;
        deleteBtn.style.display = "none";
    };

    // ---------------- SAVE ----------------

    document.getElementById("event_submit").onclick = async () => {

        const title = eventTitle.value;
        if (!title) return;

        const start = new Date(selectedRange.start);
        const end = new Date(selectedRange.end || (start.getTime() + 3600000));

        const payload = {
            title,
            start: start.toISOString(),
            end: end.toISOString(),
            allDay: selectedRange.allDay ?? false
        };

        // ---------------- UPDATE ----------------
        if (editingEvent) {

            payload.id = editingEvent.id;

            await fetch("/events/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            editingEvent.remove();
            calendar.addEvent(payload);

            closeEventModal();
            return;
        }

        // ---------------- CREATE ----------------
        await fetch("/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        calendar.refetchEvents();
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
        calendar.refetchEvents();

        closeEventModal();
    };

    // ---------------- OPEN CREATE ----------------

    function openEventModal() {

        const now = new Date();

        selectedRange = {
            start: now,
            end: new Date(now.getTime() + 3600000),
            allDay: false
        };

        editingEvent = null;
        eventTitle.value = "";

        deleteBtn.style.display = "none";
        eventModal.classList.remove("hidden");
    }

    // ---------------- APP ----------------

    function showApp() {

        document.getElementById("login_btn").style.display = "none";
        document.getElementById("signin_btn").style.display = "none";
        document.querySelector(".page").style.display = "none";
        document.getElementById("calendar").style.display = "block";

        calendar.render();
    }

    checkSession();
};