window.onload = () => {

    let mode = "login";

    const modal = document.getElementById("auth_modal");
    const title = document.getElementById("modal_title");
    const submitBtn = document.getElementById("auth_submit");

    // EVENT MODAL (une seule fois)
    const eventModal = document.getElementById("event_modal");
    const eventTitle = document.getElementById("event_title");
    const eventSubmit = document.getElementById("event_submit");

    let calendar;
    let selectedRange = null;

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

    calendar = new FullCalendar.Calendar(calendarEl, {

        initialView: "dayGridMonth",

        events: "/events",

        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "timeGridDay,timeGridWeek,dayGridMonth"
        },

        locale: "fr",

        selectable: true,
        selectMirror: true,
        navLinks: true,
        editable: false,
        dayMaxEvents: true,

        dateClick: function (info) {

            selectedRange = {
                start: info.date,
                end: info.date,
                allDay: true
            };

            eventTitle.value = "";
            eventModal.classList.remove("hidden");
        }

    });

    // ---------------- EVENT MODAL ----------------

    eventSubmit.onclick = async () => {

        const title = eventTitle.value;
        if (!title || !selectedRange) return;

        await fetch("/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: title,
                description: "",
                start: selectedRange.start,
                end: selectedRange.end,
                allDay: selectedRange.allDay
            })
        });

        eventModal.classList.add("hidden");
        eventTitle.value = "";

        calendar.refetchEvents();
    };

    window.closeEventModal = () => {
        eventModal.classList.add("hidden");
        eventTitle.value = "";
        selectedRange = null;
    };

    // ---------------- APP ----------------

    function showApp() {

        document.getElementById("login_btn").style.display = "none";
        document.getElementById("signin_btn").style.display = "none";

        document.querySelector(".page").style.display = "none";

        document.getElementById("calendar").style.display = "block";

        calendar.render();
    }

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