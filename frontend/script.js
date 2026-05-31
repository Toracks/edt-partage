window.onload = () => {

    let mode = "login";

    const modal = document.getElementById("auth_modal");
    const title = document.getElementById("modal_title");
    const submitBtn = document.getElementById("auth_submit");

    const eventModal = document.getElementById("event_modal");
    const eventTitle = document.getElementById("event_title");
    const deleteBtn = document.getElementById("event_delete");

    let calendar = null;
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

    window.closeModal = () => {
        modal.classList.add("hidden");
    };

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

        if (res.ok) {
            showApp();
        } else {
            document.getElementById("calendar").style.display = "none";
        }
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

        selectable: false,
        navLinks: true,
        editable: true,
        dayMaxEvents: true,

        eventDisplay: "block",

        customButtons: {
            addEventButton: {
                text: "+ Event",
                click: () => openEventModal()
            }
        },

        // ---------------- EDIT EVENT ----------------
        eventClick: function (info) {

            editingEvent = info.event;

            selectedRange = {
                start: new Date(info.event.start),
                end: info.event.end ? new Date(info.event.end) : new Date(info.event.start.getTime() + 3600000),
                allDay: info.event.allDay
            };

            eventTitle.value = info.event.title;

            deleteBtn.style.display = "inline-block";

            eventModal.classList.remove("hidden");
        }
    });

    // ---------------- EVENT MODAL ----------------

    window.closeEventModal = () => {
        eventModal.classList.add("hidden");
        eventTitle.value = "";
        selectedRange = null;
        editingEvent = null;
        deleteBtn.style.display = "none";
    };

    // ---------------- CREATE / UPDATE ----------------

    document.getElementById("event_submit").onclick = async () => {

        const title = eventTitle.value;
        if (!title) return;

        // ---------------- EDIT ----------------
        if (editingEvent) {

            const start = selectedRange.start;
            const end = selectedRange.end || new Date(start.getTime() + 3600000);

            await fetch("/events/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editingEvent.id,
                    title,
                    start,
                    end,
                    allDay: selectedRange.allDay
                })
            });

            editingEvent.setProp("title", title);
            editingEvent.setStart(start);
            editingEvent.setEnd(end);

            closeEventModal();
            return;
        }

        // ---------------- CREATE ----------------
        const start = selectedRange?.start || new Date();
        const end = selectedRange?.end || new Date(start.getTime() + 3600000);

        await fetch("/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                description: "",
                start,
                end,
                allDay: selectedRange?.allDay ?? true
            })
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
        closeEventModal();
    };

    // ---------------- OPEN CREATE ----------------

    function openEventModal() {

        const now = new Date();

        selectedRange = {
            start: now,
            end: new Date(now.getTime() + 3600000),
            allDay: true
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