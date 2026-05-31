import os
from datetime import timedelta
from flask import Flask, request, jsonify, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2

# ---------------- APP INIT ----------------
app = Flask(__name__)
app.secret_key = "N@rut0m272010admin"
app.permanent_session_lifetime = timedelta(days=30)

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("WARNING: DATABASE_URL not set")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.join(BASE_DIR, "..", "frontend")


# ---------------- DB CONNECTION ----------------
def get_db():
    if not DATABASE_URL:
        raise Exception("DATABASE_URL missing")
    return psycopg2.connect(DATABASE_URL)


# ---------------- INIT DB ----------------



# ---------------- FRONTEND ----------------
@app.route("/")
def home():
    return send_from_directory(FRONTEND, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND, path)


# =====================================================
# ================== AUTH SYSTEM ======================
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

        c.execute(
            """
            INSERT INTO users (username, password, status)
            VALUES (%s, %s, 'pending')
        """,
            (username, hashed),
        )

        conn.commit()
        conn.close()

    except psycopg2.IntegrityError:
        return jsonify({"error": "Username already exists"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"message": "Account created"})


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data["username"]
    password = data["password"]

    conn = get_db()
    c = conn.cursor()

    c.execute(
        """
        SELECT password, status FROM users WHERE username=%s
    """,
        (username,),
    )

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


@app.route("/me")
def me():
    username = session.get("user")

    if not username:
        return jsonify({"logged": False}), 401

    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT username FROM users WHERE username=%s", (username,))
    user = c.fetchone()
    conn.close()

    if not user:
        session.clear()
        return jsonify({"logged": False}), 401

    return jsonify({"logged": True, "user": username})


@app.route("/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


# =====================================================
# ================== ADMIN SYSTEM =====================
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
    users = [row[0] for row in c.fetchall()]

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

    c.execute(
        """
        UPDATE users SET status='approved'
        WHERE username=%s
    """,
        (username,),
    )

    conn.commit()
    conn.close()

    return jsonify({"message": "approved"})


@app.route("/admin/reject", methods=["POST"])
def admin_reject():
    if not is_admin():
        return jsonify({"error": "forbidden"}), 403

    username = request.json["username"].strip()

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
    new = request.json["new_username"].strip()

    conn = get_db()
    c = conn.cursor()

    try:
        c.execute(
            """
            UPDATE users
            SET username=%s
            WHERE id=%s
        """,
            (new, user_id),
        )

        conn.commit()

    except psycopg2.IntegrityError:
        return jsonify({"error": "username already exists"}), 400

    finally:
        conn.close()

    return jsonify({"message": "renamed"})


@app.route("/admin/delete", methods=["POST"])
def admin_delete():
    if not is_admin():
        return jsonify({"error": "forbidden"}), 403

    user_id = request.json["id"]

    conn = get_db()
    c = conn.cursor()

    c.execute("DELETE FROM users WHERE id=%s", (user_id,))

    conn.commit()
    conn.close()

    return jsonify({"message": "deleted"})


# =====================================================
# ================== EVENTS SYSTEM ====================
# =====================================================


@app.route("/events", methods=["GET"])
def get_events():
    conn = get_db()
    c = conn.cursor()

    c.execute("""
        SELECT id, title, description, start_time, end_time, all_day
        FROM events
    """)

    rows = c.fetchall()
    conn.close()

    return jsonify([
        {
            "id": r[0],
            "title": r[1],
            "description": r[2],
            "start": r[3],
            "end": r[4],
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
        data["description"],
        data["start"],
        data["end"],
        int(data.get("allDay", 0))
    ))

    conn.commit()
    conn.close()

    return jsonify({"message": "event created"})

# =====================================================
# ================== DEBUG ROUTES =====================
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


@app.route("/init-db")
def init_db_route():
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

    return "DB initialized"

@app.route("/fix-db")
def fix_db():
    conn = get_db()
    c = conn.cursor()

    # SUPPRIME TABLE CASSEE
    c.execute("DROP TABLE IF EXISTS events")

    # RECREATION PROPRE
    c.execute("""
        CREATE TABLE events (
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

    return "DB FIXED OK"

# ---------------- RUN ----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
