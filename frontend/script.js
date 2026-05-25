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

    // 🔥 ICI ON GARDE UN SEUL ONCLICK FIABLE
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
        }
    });

    async function checkSession() {
        const res = await fetch("/me");

        if (res.ok) {
            document.getElementById("login_btn").style.display = "none";
            document.getElementById("signin_btn").style.display = "none";
        }
    }

    async function loadApproved() {
        const res = await fetch("/admin/approved");
        const users = await res.json();

        const list = document.getElementById("approved_list");
        list.innerHTML = "";

        users.forEach(u => {
            const li = document.createElement("li");

            li.innerHTML = `
            ${u}
            <button onclick="renameUser('${u}')">✏️</button>
            <button onclick="deleteUser('${u}')">❌</button>
        `;

            list.appendChild(li);
        });
    }

    async function renameUser(oldName) {
        const newName = prompt("New username:");

        if (!newName) return;

        await fetch("/admin/rename", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ old_username: oldName, new_username: newName })
        });

        loadApproved();
    }

    async function deleteUser(username) {
        await fetch("/admin/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        });

        loadApproved();
    }


    window.loadApproved = loadApproved;
    window.renameUser = renameUser;
    window.deleteUser = deleteUser;
    window.loginAdmin = loginAdmin;
    checkSession();
};