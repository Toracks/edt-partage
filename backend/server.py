import os
import sqlite3
from datetime import timedelta
from flask import Flask, request, jsonify, session, send_from_directory

app = Flask(__name__)
app.secret_key = "change_this_secret"
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
            password TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ---------------- FRONT ----------------
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

    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                  (username, password))
        conn.commit()
        conn.close()

        return jsonify({"message": "User created"})

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
    c.execute("SELECT * FROM users WHERE username=? AND password=?",
              (username, password))
    user = c.fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    session.permanent = True
    session["user"] = username

    return jsonify({"message": "Logged in"})

# ---------------- ME (AUTO LOGIN CHECK) ----------------
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

# ---------------- RUN ----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)