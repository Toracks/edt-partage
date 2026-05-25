import os
import sqlite3
from datetime import timedelta
from flask import Flask, request, jsonify, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash

# ---------------- APP INIT ----------------
app = Flask(__name__)
app.secret_key = "N@rut0m272010admin"
app.permanent_session_lifetime = timedelta(days=30)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.join(BASE_DIR, "..", "frontend")
DB_PATH = os.path.join(BASE_DIR, "users.db")

# ---------------- DB INIT ----------------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            status TEXT DEFAULT 'pending'
        )
    """)

    conn.commit()
    conn.close()

init_db()

# ---------------- FRONTEND ----------------
@app.route("/")
def home():
    return send_from_directory(FRONTEND, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND, path)

# ---------------- REGISTER ----------------
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data["username"]
    password = data["password"]

    hashed = generate_password_hash(password)

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        c.execute("""
            INSERT INTO users (username, password, status)
            VALUES (?, ?, 'pending')
        """, (username, hashed))

        conn.commit()
        conn.close()

        return jsonify({
            "message": "Account created, waiting admin approval"
        })

    except:
        return jsonify({"error": "User already exists"}), 400

# ---------------- LOGIN ----------------
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data["username"]
    password = data["password"]

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""
        SELECT password, status FROM users WHERE username=?
    """, (username,))

    user = c.fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    hashed_password, status = user

    if not check_password_hash(hashed_password, password):
        return jsonify({"error": "Invalid credentials"}), 401

    if status != "approved":
        return jsonify({"error": "Account not approved yet"}), 403

    session.permanent = True
    session["user"] = username

    return jsonify({"message": "Logged in"})

# ---------------- AUTO LOGIN CHECK ----------------
@app.route("/me")
def me():
    if "user" not in session:
        return jsonify({"logged": False}), 401

    return jsonify({
        "logged": True,
        "user": session["user"]
    })

# ---------------- LOGOUT ----------------
@app.route("/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})

# =====================================================
# ================== ADMIN SYSTEM ======================
# =====================================================

ADMIN_PASSWORD = "Greninj@272010admin"

def is_admin():
    return session.get("admin") is True

# ---------------- ADMIN LOGIN ----------------
@app.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.json


    if check_password_hash(ADMIN_PASSWORD, data.get("password")):
        session["admin"] = True
        return jsonify({"message": "admin connected"})

    return jsonify({"error": "forbidden"}), 403

# ---------------- LIST PENDING USERS ----------------
@app.route("/admin/pending", methods=["GET"])
def admin_pending():
    if not is_admin():
        return jsonify({"error": "forbidden"}), 403

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("SELECT username FROM users WHERE status='pending'")
    users = [row[0] for row in c.fetchall()]

    conn.close()

    return jsonify(users)

# ---------------- APPROVE USER ----------------
@app.route("/admin/approve", methods=["POST"])
def admin_approve():
    if not is_admin():
        return jsonify({"error": "forbidden"}), 403

    username = request.json["username"]

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""
        UPDATE users SET status='approved'
        WHERE username=?
    """, (username,))

    conn.commit()
    conn.close()

    return jsonify({"message": "approved"})

# ---------------- REJECT USER ----------------
@app.route("/admin/reject", methods=["POST"])
def admin_reject():
    if not is_admin():
        return jsonify({"error": "forbidden"}), 403

    username = request.json["username"]

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("DELETE FROM users WHERE username=?", (username,))

    conn.commit()
    conn.close()

    return jsonify({"message": "rejected"})

# ---------------- RUN ----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)