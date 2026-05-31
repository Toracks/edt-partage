import os
from datetime import timedelta, datetime
from flask import Flask, request, jsonify, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2

# =====================================================
# APP INIT
# =====================================================

app = Flask(__name__)
app.secret_key = "N@rut0m272010admin"
app.permanent_session_lifetime = timedelta(days=30)

DATABASE_URL = os.environ.get("DATABASE_URL")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.join(BASE_DIR, "..", "frontend")


# =====================================================
# DB CONNECTION
# =====================================================

def get_db():
    if not DATABASE_URL:
        raise Exception("DATABASE_URL missing")
    return psycopg2.connect(DATABASE_URL)


# =====================================================
# FRONTEND
# =====================================================

@app.route("/")
def home():
    return send_from_directory(FRONTEND, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND, path)


# =====================================================
# AUTH SYSTEM (INCHANGED LOGIC)
# =====================================================

@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data["username"]
    password = data["password"]

    hashed = generate_password_hash(password)

    try:
        conn = get_db()
        c = conn.cursor()

        c.execute("""
            INSERT INTO users (username, password, status)
            VALUES (%s, %s, 'pending')
        """, (username, hashed))

        conn.commit()
        conn.close()

    except psycopg2.IntegrityError:
        return jsonify({"error": "Username already exists"}), 400

    return jsonify({"message": "Account created"})


@app.route("/login", methods=["POST"])
def login():
    data = request.json

    conn = get_db()
    c = conn.cursor()

    c.execute("""
        SELECT password, status FROM users WHERE username=%s
    """, (data["username"],))

    user = c.fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    hashed_password, status = user

    if not check_password_hash(hashed_password, data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    if status != "approved":
        return jsonify({"error": "Account not approved yet"}), 403

    session.permanent = True
    session["user"] = data["username"]

    return jsonify({"message": "Logged in"})


@app.route("/me")
def me():
    if not session.get("user"):
        return jsonify({"logged": False}), 401

    return jsonify({"logged": True})


@app.route("/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


# =====================================================
# ADMIN SYSTEM (UNCHANGED)
# =====================================================

ADMIN_PASSWORD = "Greninj@272010admin"

def is_admin():
    return session.get("admin") is True


@app.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.json

    if data.get("password") == ADMIN_PASSWORD:
        session["admin"] = True
        return jsonify({"message": "admin connected"})

    return jsonify({"error": "forbidden"}), 403


@app.route("/admin/logout", methods=["POST", "GET"])
def admin_logout():
    session.pop("admin", None)
    return jsonify({"message": "admin disconnected"})


@app.route("/admin/pending")
def admin_pending():
    if not is_admin():
        return jsonify({"error": "forbidden"}), 403

    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT username FROM users WHERE status='pending'")
    users = [r[0] for r in c.fetchall()]

    conn.close()
    return jsonify(users)


@app.route("/admin/approved")
def admin_approved():
    if not is_admin():
        return jsonify({"error": "forbidden"}), 403

    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT id, username FROM users WHERE status='approved'")
    users = [{"id": r[0], "username": r[1]} for r in c.fetchall()]

    conn.close()
    return jsonify(users)


@app.route("/admin/approve", methods=["POST"])
def admin_approve():
    if not is_admin():
        return jsonify({"error": "forbidden"}), 403

    username = request.json["username"]

    conn = get_db()
    c = conn.cursor()

    c.execute("""
        UPDATE users SET status='approved'
        WHERE username=%s
    """, (username,))

    conn.commit()
    conn.close()

    return jsonify({"message": "approved"})


@app.route("/admin/reject", methods=["POST"])
def admin_reject():
    if not is_admin():
        return jsonify({"error": "forbidden"}), 403

    username = request.json["username"]

    conn = get_db()
    c = conn.cursor()

    c.execute("DELETE FROM users WHERE username=%s", (username,))

    conn.commit()
    conn.close()

    return jsonify({"message": "rejected"})


@app.route("/admin/rename", methods=["POST"])
def admin_rename():
    if not is_admin():
        return jsonify({"error": "forbidden"}), 403

    user_id = request.json["id"]
    new = request.json["new_username"]

    conn = get_db()
    c = conn.cursor()

    try:
        c.execute("""
            UPDATE users SET username=%s WHERE id=%s
        """, (new, user_id))

        conn.commit()

    except psycopg2.IntegrityError:
        return jsonify({"error": "exists"}), 400

    finally:
        conn.close()

    return jsonify({"message": "renamed"})


# =====================================================
# EVENTS SYSTEM (FIX COMPLET + STABLE)
# =====================================================

def to_iso(v):
    """FullCalendar FIX: always ISO format"""
    if not v:
        return None
    return str(v).replace(" ", "T")


@app.route("/events", methods=["GET"])
def get_events():
    conn = get_db()
    c = conn.cursor()

    c.execute("""
        SELECT id, title, description, start_time, end_time, all_day
        FROM events
        ORDER BY start_time
    """)

    rows = c.fetchall()
    conn.close()

    return jsonify([
        {
            "id": r[0],
            "title": r[1],
            "description": r[2],
            "start": to_iso(r[3]),
            "end": to_iso(r[4]),
            "allDay": bool(r[5])
        }
        for r in rows
    ])


@app.route("/events", methods=["POST"])
def add_event():
    data = request.json

    conn = get_db()
    c = conn.cursor()

    c.execute("""
        INSERT INTO events (title, description, start_time, end_time, all_day)
        VALUES (%s, %s, %s, %s, %s)
    """, (
        data["title"],
        data.get("description", ""),
        data["start"],
        data["end"],
        int(data.get("allDay", 0))
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "created"})


@app.route("/events/update", methods=["POST"])
def update_event():
    data = request.json

    conn = get_db()
    c = conn.cursor()

    c.execute("""
        UPDATE events
        SET title=%s,
            start_time=%s,
            end_time=%s,
            all_day=%s
        WHERE id=%s
    """, (
        data["title"],
        data["start"],
        data["end"],
        int(data.get("allDay", 0)),
        data["id"]
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "updated"})


@app.route("/events/delete", methods=["POST"])
def delete_event():
    data = request.json

    conn = get_db()
    c = conn.cursor()

    c.execute("DELETE FROM events WHERE id=%s", (data["id"],))

    conn.commit()
    conn.close()

    return jsonify({"message": "deleted"})


# =====================================================
# DEBUG
# =====================================================

@app.route("/debug/users")
def debug_users():
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT id, username, status FROM users")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


@app.route("/debug/raw_users")
def raw_users():
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT * FROM users")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


@app.route("/debug/clear_session")
def clear_session():
    session.clear()
    return "cleared"


@app.route("/debug/approved")
def debug_approved():
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT username, status FROM users")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# =====================================================
# INIT DB
# =====================================================

@app.route("/init-db")
def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            status TEXT DEFAULT 'pending'
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            title TEXT,
            description TEXT,
            start_time TEXT,
            end_time TEXT,
            all_day INTEGER DEFAULT 0
        )
    """)

    conn.commit()
    conn.close()

    return "OK"


# =====================================================
# RUN
# =====================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)