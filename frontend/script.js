window.onload = () => {

    let mode = "login";

    const modal = document.getElementById("auth_modal");
    const title = document.getElementById("modal_title");
    const submitBtn = document.getElementById("auth_submit");

    document.getElementById("login_btn").onclick = () => openModal("login");
    document.getElementById("signin_btn").onclick = () => openModal("register");

    function openModal(type) {
        mode = type;
        modal.classList.remove("hidden");

        title.innerText = type === "login" ? "Login" : "Sign in";
        submitBtn.innerText = type === "login" ? "Login" : "Register";
    }

    const loginAdmin = async () => {
        const password = document.getElementById("admin_pass").value;

        const res = await fetch("/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });

        const data = await res.json();
        alert(data.message || data.error);

        if (res.ok) {
            loadPending();
            loadApproved();
        }
    };

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
            document.getElementById("login_btn").style.display = "none";
            document.getElementById("signin_btn").style.display = "none";
            document.getElementById("calendar").style.display = "block";
            calendar.render();
            calendar.updateSize();

        } else {
            document.getElementById("calendar").style.display = "none";
        }
    });

    async function checkSession() {
        const res = await fetch("/me");

        if (res.ok) {
            document.getElementById("login_btn").style.display = "none";
            document.getElementById("signin_btn").style.display = "none";
        }
    }

    const calendarEl = document.getElementById('calendar');

    const calendar = new FullCalendar.Calendar(calendarEl, {

        initialView: 'dayGridMonth',

        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth,multiMonthYear'
        },

        locale: 'fr',

        selectable: true,

        navLinks: true,

        editable: false,

        dayMaxEvents: true
    });

    // ❌ NE PAS exporter des fonctions qui n’existent pas
    window.loginAdmin = loginAdmin;

    checkSession();
};