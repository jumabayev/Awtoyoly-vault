"""
Awtoyoly Vault - IT Infrastructure Password & Credential Manager
Multi-user, 2FA (TOTP), AES-256 encryption, RBAC, audit log
"""
from flask import Flask, render_template, jsonify, request, send_file
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timedelta
import sqlite3, os, json, io, base64, secrets, hashlib
import bcrypt, pyotp, qrcode
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from functools import wraps

app = Flask(__name__)
CORS(app)

app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET', secrets.token_hex(32))
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=8)
jwt = JWTManager(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'vault.db')
MASTER_KEY = os.environ.get('VAULT_MASTER_KEY', 'Awtoyoly-Vault-Master-Key-2026!!')


# ─── AES-256 Encryption ─────────────────────────────────────────────

def _derive_key(key_str):
    return hashlib.sha256(key_str.encode()).digest()

def encrypt(plaintext):
    if not plaintext:
        return ''
    key = _derive_key(MASTER_KEY)
    iv = os.urandom(16)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    ct = cipher.encrypt(pad(plaintext.encode('utf-8'), AES.block_size))
    return base64.b64encode(iv + ct).decode()

def decrypt(ciphertext):
    if not ciphertext:
        return ''
    try:
        key = _derive_key(MASTER_KEY)
        raw = base64.b64decode(ciphertext)
        iv, ct = raw[:16], raw[16:]
        cipher = AES.new(key, AES.MODE_CBC, iv)
        return unpad(cipher.decrypt(ct), AES.block_size).decode('utf-8')
    except Exception:
        return '[decryption error]'


# ─── Database ────────────────────────────────────────────────────────

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        role TEXT DEFAULT 'viewer',
        totp_secret TEXT,
        totp_enabled INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        last_login TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT DEFAULT 'building',
        color TEXT DEFAULT '#3b82f6',
        parent_id INTEGER,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER,
        name TEXT NOT NULL,
        device_type TEXT DEFAULT 'server',
        hostname TEXT,
        ip_address TEXT,
        port TEXT,
        username TEXT,
        password_enc TEXT,
        url TEXT,
        protocol TEXT DEFAULT 'ssh',
        notes TEXT,
        tags TEXT,
        icon TEXT DEFAULT 'server',
        color TEXT,
        created_by INTEGER,
        updated_by INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS credential_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        credential_id INTEGER,
        field_name TEXT,
        old_value TEXT,
        new_value TEXT,
        changed_by INTEGER,
        changed_at TEXT DEFAULT (datetime('now'))
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        action TEXT,
        target_type TEXT,
        target_id INTEGER,
        target_name TEXT,
        details TEXT,
        ip_address TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS user_branch_access (
        user_id INTEGER,
        branch_id INTEGER,
        permission TEXT DEFAULT 'read',
        PRIMARY KEY (user_id, branch_id)
    )''')

    # Default admin user (admin / admin123) - change on first login!
    admin_exists = c.execute("SELECT id FROM users WHERE username='admin'").fetchone()
    if not admin_exists:
        pw_hash = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode()
        c.execute("INSERT INTO users (username, password_hash, display_name, role) VALUES (?,?,?,?)",
                  ('admin', pw_hash, 'Administrator', 'admin'))

    # Default branches
    if not c.execute("SELECT id FROM branches").fetchone():
        for name, icon, color in [
            ('Merkez Ofis', 'building', '#3b82f6'),
            ('Sunucular', 'server', '#22c55e'),
            ('Firewall', 'shield-halved', '#f59e0b'),
            ('Switch & Network', 'network-wired', '#06b6d4'),
            ('NVR & Kamera', 'video', '#a855f7'),
            ('Santral (PBX)', 'phone', '#ec4899'),
            ('ESXi & VM', 'cubes', '#ef4444'),
        ]:
            c.execute("INSERT INTO branches (name, icon, color) VALUES (?,?,?)", (name, icon, color))

    conn.commit()
    conn.close()

init_db()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def log_audit(user_id, username, action, target_type, target_id, target_name, details='', ip=''):
    conn = get_db()
    conn.execute("INSERT INTO audit_log (user_id, username, action, target_type, target_id, target_name, details, ip_address) VALUES (?,?,?,?,?,?,?,?)",
                 (user_id, username, action, target_type, target_id, target_name, details, ip))
    conn.commit()
    conn.close()


# ─── Role decorator ─────────────────────────────────────────────────

def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            if claims.get('role') not in roles:
                return jsonify({"error": "Yetkiniz yok"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# ─── Auth Routes ─────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/auth/login', methods=['POST'])
def login():
    d = request.json
    username = d.get('username', '').strip()
    password = d.get('password', '').strip()
    totp_code = d.get('totp_code', '').strip()

    if not username or not password:
        return jsonify({"error": "Kullanici adi ve sifre gerekli"}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username=? AND active=1", (username,)).fetchone()
    conn.close()

    if not user or not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        return jsonify({"error": "Yanlis kullanici adi veya sifre"}), 401

    # 2FA check
    if user['totp_enabled']:
        if not totp_code:
            return jsonify({"requires_2fa": True, "message": "2FA kodu gerekli"}), 200
        totp = pyotp.TOTP(decrypt(user['totp_secret']))
        if not totp.verify(totp_code, valid_window=1):
            return jsonify({"error": "Yanlis 2FA kodu"}), 401

    # Update last login
    conn = get_db()
    conn.execute("UPDATE users SET last_login=datetime('now') WHERE id=?", (user['id'],))
    conn.commit()
    conn.close()

    token = create_access_token(identity=str(user['id']),
                                additional_claims={"role": user['role'], "username": user['username'], "display_name": user['display_name']})

    log_audit(user['id'], username, 'login', 'user', user['id'], username, ip=request.remote_addr)

    return jsonify({
        "token": token,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "display_name": user['display_name'],
            "role": user['role'],
            "totp_enabled": bool(user['totp_enabled']),
        }
    })


@app.route('/api/auth/me')
@jwt_required()
def me():
    uid = int(get_jwt_identity())
    conn = get_db()
    user = conn.execute("SELECT id, username, display_name, role, totp_enabled, last_login FROM users WHERE id=?", (uid,)).fetchone()
    conn.close()
    return jsonify(dict(user)) if user else jsonify({"error": "User not found"}), 404


# ─── 2FA Routes ──────────────────────────────────────────────────────

@app.route('/api/auth/2fa/setup', methods=['POST'])
@jwt_required()
def setup_2fa():
    uid = int(get_jwt_identity())
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)

    conn = get_db()
    user = conn.execute("SELECT username FROM users WHERE id=?", (uid,)).fetchone()
    conn.close()

    uri = totp.provisioning_uri(name=user['username'], issuer_name="Awtoyoly Vault")

    # Generate QR code
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    # Save encrypted secret (not yet enabled)
    conn = get_db()
    conn.execute("UPDATE users SET totp_secret=? WHERE id=?", (encrypt(secret), uid))
    conn.commit()
    conn.close()

    return jsonify({"qr_code": f"data:image/png;base64,{qr_b64}", "secret": secret, "uri": uri})


@app.route('/api/auth/2fa/verify', methods=['POST'])
@jwt_required()
def verify_2fa():
    uid = int(get_jwt_identity())
    code = request.json.get('code', '')

    conn = get_db()
    user = conn.execute("SELECT totp_secret FROM users WHERE id=?", (uid,)).fetchone()
    conn.close()

    secret = decrypt(user['totp_secret'])
    totp = pyotp.TOTP(secret)

    if totp.verify(code, valid_window=1):
        conn = get_db()
        conn.execute("UPDATE users SET totp_enabled=1 WHERE id=?", (uid,))
        conn.commit()
        conn.close()
        claims = get_jwt()
        log_audit(uid, claims.get('username'), '2fa_enabled', 'user', uid, '', ip=request.remote_addr)
        return jsonify({"success": True, "message": "2FA aktif edildi"})

    return jsonify({"error": "Yanlis kod"}), 400


@app.route('/api/auth/2fa/disable', methods=['POST'])
@jwt_required()
def disable_2fa():
    uid = int(get_jwt_identity())
    conn = get_db()
    conn.execute("UPDATE users SET totp_enabled=0, totp_secret=NULL WHERE id=?", (uid,))
    conn.commit()
    conn.close()
    claims = get_jwt()
    log_audit(uid, claims.get('username'), '2fa_disabled', 'user', uid, '', ip=request.remote_addr)
    return jsonify({"success": True})


# ─── User Management ─────────────────────────────────────────────────

@app.route('/api/users')
@role_required('admin')
def list_users():
    conn = get_db()
    users = conn.execute("SELECT id, username, display_name, role, totp_enabled, active, created_at, last_login FROM users ORDER BY id").fetchall()
    conn.close()
    return jsonify([dict(u) for u in users])


@app.route('/api/users', methods=['POST'])
@role_required('admin')
def create_user():
    d = request.json
    username = d.get('username', '').strip()
    password = d.get('password', '').strip()
    display_name = d.get('display_name', username)
    role = d.get('role', 'viewer')

    if not username or not password:
        return jsonify({"error": "Kullanici adi ve sifre gerekli"}), 400
    if len(password) < 8:
        return jsonify({"error": "Sifre en az 8 karakter olmali"}), 400
    if role not in ('admin', 'manager', 'viewer'):
        return jsonify({"error": "Gecersiz rol"}), 400

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    conn = get_db()
    try:
        conn.execute("INSERT INTO users (username, password_hash, display_name, role) VALUES (?,?,?,?)",
                     (username, pw_hash, display_name, role))
        conn.commit()
        claims = get_jwt()
        log_audit(int(get_jwt_identity()), claims.get('username'), 'create_user', 'user', 0, username, ip=request.remote_addr)
        return jsonify({"success": True, "message": f"Kullanici '{username}' olusturuldu"})
    except sqlite3.IntegrityError:
        return jsonify({"error": "Bu kullanici adi zaten var"}), 400
    finally:
        conn.close()


@app.route('/api/users/<int:uid>', methods=['PUT'])
@role_required('admin')
def update_user(uid):
    d = request.json
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "Kullanici bulunamadi"}), 404

    updates = []
    params = []
    if 'display_name' in d:
        updates.append("display_name=?"); params.append(d['display_name'])
    if 'role' in d and d['role'] in ('admin', 'manager', 'viewer'):
        updates.append("role=?"); params.append(d['role'])
    if 'active' in d:
        updates.append("active=?"); params.append(1 if d['active'] else 0)
    if 'password' in d and len(d['password']) >= 8:
        pw_hash = bcrypt.hashpw(d['password'].encode(), bcrypt.gensalt()).decode()
        updates.append("password_hash=?"); params.append(pw_hash)

    if updates:
        params.append(uid)
        conn.execute(f"UPDATE users SET {','.join(updates)} WHERE id=?", params)
        conn.commit()

    conn.close()
    claims = get_jwt()
    log_audit(int(get_jwt_identity()), claims.get('username'), 'update_user', 'user', uid, user['username'], ip=request.remote_addr)
    return jsonify({"success": True})


@app.route('/api/users/<int:uid>', methods=['DELETE'])
@role_required('admin')
def delete_user(uid):
    conn = get_db()
    user = conn.execute("SELECT username FROM users WHERE id=?", (uid,)).fetchone()
    if user and user['username'] == 'admin':
        conn.close()
        return jsonify({"error": "Admin silinemez"}), 400
    conn.execute("DELETE FROM users WHERE id=?", (uid,))
    conn.commit()
    conn.close()
    claims = get_jwt()
    log_audit(int(get_jwt_identity()), claims.get('username'), 'delete_user', 'user', uid, user['username'] if user else '', ip=request.remote_addr)
    return jsonify({"success": True})


# ─── Branch (Location) Management ───────────────────────────────────

@app.route('/api/branches')
@jwt_required()
def list_branches():
    conn = get_db()
    branches = conn.execute("SELECT * FROM branches ORDER BY sort_order, name").fetchall()
    conn.close()
    return jsonify([dict(b) for b in branches])


@app.route('/api/branches', methods=['POST'])
@role_required('admin', 'manager')
def create_branch():
    d = request.json
    conn = get_db()
    c = conn.execute("INSERT INTO branches (name, icon, color, parent_id) VALUES (?,?,?,?)",
                     (d.get('name', ''), d.get('icon', 'building'), d.get('color', '#3b82f6'), d.get('parent_id')))
    conn.commit()
    bid = c.lastrowid
    conn.close()
    claims = get_jwt()
    log_audit(int(get_jwt_identity()), claims.get('username'), 'create_branch', 'branch', bid, d.get('name'), ip=request.remote_addr)
    return jsonify({"success": True, "id": bid})


@app.route('/api/branches/<int:bid>', methods=['PUT'])
@role_required('admin', 'manager')
def update_branch(bid):
    d = request.json
    conn = get_db()
    conn.execute("UPDATE branches SET name=?, icon=?, color=?, parent_id=? WHERE id=?",
                 (d.get('name'), d.get('icon'), d.get('color'), d.get('parent_id'), bid))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


@app.route('/api/branches/<int:bid>', methods=['DELETE'])
@role_required('admin')
def delete_branch(bid):
    conn = get_db()
    conn.execute("DELETE FROM credentials WHERE branch_id=?", (bid,))
    conn.execute("DELETE FROM branches WHERE id=?", (bid,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# ─── Credential Management ──────────────────────────────────────────

@app.route('/api/credentials')
@jwt_required()
def list_credentials():
    branch_id = request.args.get('branch_id', '')
    q = request.args.get('q', '').lower()
    device_type = request.args.get('device_type', '')

    conn = get_db()
    query = "SELECT c.*, b.name as branch_name, b.icon as branch_icon FROM credentials c LEFT JOIN branches b ON c.branch_id=b.id WHERE 1=1"
    params = []

    if branch_id:
        query += " AND c.branch_id=?"
        params.append(int(branch_id))
    if device_type:
        query += " AND c.device_type=?"
        params.append(device_type)

    query += " ORDER BY c.name"
    rows = conn.execute(query, params).fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        # Decrypt password for response
        d['password'] = decrypt(d.pop('password_enc', ''))
        # Search filter
        if q:
            searchable = f"{d.get('name','')} {d.get('hostname','')} {d.get('ip_address','')} {d.get('username','')} {d.get('notes','')} {d.get('tags','')}".lower()
            if q not in searchable:
                continue
        results.append(d)

    # Log view action
    claims = get_jwt()
    log_audit(int(get_jwt_identity()), claims.get('username'), 'view_credentials', 'credential', 0, f"filter:{branch_id or 'all'}", ip=request.remote_addr)

    return jsonify(results)


@app.route('/api/credentials/<int:cid>')
@jwt_required()
def get_credential(cid):
    conn = get_db()
    r = conn.execute("SELECT c.*, b.name as branch_name FROM credentials c LEFT JOIN branches b ON c.branch_id=b.id WHERE c.id=?", (cid,)).fetchone()
    conn.close()
    if not r:
        return jsonify({"error": "Bulunamadi"}), 404

    d = dict(r)
    d['password'] = decrypt(d.pop('password_enc', ''))

    claims = get_jwt()
    log_audit(int(get_jwt_identity()), claims.get('username'), 'view_password', 'credential', cid, d.get('name', ''), ip=request.remote_addr)
    return jsonify(d)


@app.route('/api/credentials', methods=['POST'])
@role_required('admin', 'manager')
def create_credential():
    d = request.json
    uid = int(get_jwt_identity())

    conn = get_db()
    c = conn.execute("""INSERT INTO credentials
        (branch_id, name, device_type, hostname, ip_address, port, username, password_enc, url, protocol, notes, tags, icon, color, created_by, updated_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (d.get('branch_id'), d.get('name', ''), d.get('device_type', 'server'),
         d.get('hostname', ''), d.get('ip_address', ''), d.get('port', ''),
         d.get('username', ''), encrypt(d.get('password', '')),
         d.get('url', ''), d.get('protocol', 'ssh'),
         d.get('notes', ''), d.get('tags', ''),
         d.get('icon', 'server'), d.get('color'),
         uid, uid))
    conn.commit()
    cid = c.lastrowid
    conn.close()

    claims = get_jwt()
    log_audit(uid, claims.get('username'), 'create_credential', 'credential', cid, d.get('name', ''), ip=request.remote_addr)
    return jsonify({"success": True, "id": cid})


@app.route('/api/credentials/<int:cid>', methods=['PUT'])
@role_required('admin', 'manager')
def update_credential(cid):
    d = request.json
    uid = int(get_jwt_identity())
    claims = get_jwt()

    conn = get_db()
    old = conn.execute("SELECT * FROM credentials WHERE id=?", (cid,)).fetchone()
    if not old:
        conn.close()
        return jsonify({"error": "Bulunamadi"}), 404

    # Track password change in history
    if 'password' in d and d['password']:
        conn.execute("INSERT INTO credential_history (credential_id, field_name, old_value, new_value, changed_by) VALUES (?,?,?,?,?)",
                     (cid, 'password', '***', '***', uid))

    updates = {
        'name': d.get('name', old['name']),
        'branch_id': d.get('branch_id', old['branch_id']),
        'device_type': d.get('device_type', old['device_type']),
        'hostname': d.get('hostname', old['hostname']),
        'ip_address': d.get('ip_address', old['ip_address']),
        'port': d.get('port', old['port']),
        'username': d.get('username', old['username']),
        'password_enc': encrypt(d['password']) if d.get('password') else old['password_enc'],
        'url': d.get('url', old['url']),
        'protocol': d.get('protocol', old['protocol']),
        'notes': d.get('notes', old['notes']),
        'tags': d.get('tags', old['tags']),
        'icon': d.get('icon', old['icon']),
        'color': d.get('color', old['color']),
        'updated_by': uid,
        'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    }

    set_clause = ','.join(f"{k}=?" for k in updates)
    conn.execute(f"UPDATE credentials SET {set_clause} WHERE id=?", list(updates.values()) + [cid])
    conn.commit()
    conn.close()

    log_audit(uid, claims.get('username'), 'update_credential', 'credential', cid, d.get('name', ''), ip=request.remote_addr)
    return jsonify({"success": True})


@app.route('/api/credentials/<int:cid>', methods=['DELETE'])
@role_required('admin')
def delete_credential(cid):
    conn = get_db()
    cred = conn.execute("SELECT name FROM credentials WHERE id=?", (cid,)).fetchone()
    conn.execute("DELETE FROM credential_history WHERE credential_id=?", (cid,))
    conn.execute("DELETE FROM credentials WHERE id=?", (cid,))
    conn.commit()
    conn.close()
    claims = get_jwt()
    log_audit(int(get_jwt_identity()), claims.get('username'), 'delete_credential', 'credential', cid, cred['name'] if cred else '', ip=request.remote_addr)
    return jsonify({"success": True})


# ─── Audit Log ───────────────────────────────────────────────────────

@app.route('/api/audit')
@role_required('admin')
def get_audit():
    limit = request.args.get('limit', 100, type=int)
    conn = get_db()
    rows = conn.execute("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ─── Dashboard Stats ─────────────────────────────────────────────────

@app.route('/api/dashboard')
@jwt_required()
def dashboard():
    conn = get_db()
    stats = {
        'total_credentials': conn.execute("SELECT COUNT(*) FROM credentials").fetchone()[0],
        'total_branches': conn.execute("SELECT COUNT(*) FROM branches").fetchone()[0],
        'total_users': conn.execute("SELECT COUNT(*) FROM users WHERE active=1").fetchone()[0],
        'recent_activity': [dict(r) for r in conn.execute(
            "SELECT * FROM audit_log ORDER BY id DESC LIMIT 10").fetchall()],
        'by_device_type': [dict(r) for r in conn.execute(
            "SELECT device_type, COUNT(*) as cnt FROM credentials GROUP BY device_type ORDER BY cnt DESC").fetchall()],
        'by_branch': [dict(r) for r in conn.execute(
            "SELECT b.name, b.icon, b.color, COUNT(c.id) as cnt FROM branches b LEFT JOIN credentials c ON b.id=c.branch_id GROUP BY b.id ORDER BY cnt DESC").fetchall()],
    }
    conn.close()
    return jsonify(stats)


# ─── Password Generator ─────────────────────────────────────────────

@app.route('/api/generate-password')
def generate_password():
    length = request.args.get('length', 20, type=int)
    import string
    chars = string.ascii_letters + string.digits + '!@#$%&*'
    pw = ''.join(secrets.choice(chars) for _ in range(max(8, min(64, length))))
    return jsonify({"password": pw})


if __name__ == '__main__':
    print("=" * 55)
    print("  Awtoyoly Vault - IT Credential Manager")
    print("  http://0.0.0.0:5100")
    print("  Default login: admin / admin123")
    print("=" * 55)
    app.run(host='0.0.0.0', port=5100, debug=False, threaded=True)
