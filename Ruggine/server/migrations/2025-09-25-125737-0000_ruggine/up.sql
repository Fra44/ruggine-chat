-- Your SQL goes here

-- Format of dates: YYYY-MM-DD HH:MM:SS -> used type TEXT !!

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    hashed_pass TEXT UNIQUE NOT NULL,
    salt TEXT NOT NULL
);

CREATE TABLE groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    creator INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  --visualizzato BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (creator) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE user_groups (
    user_id INTEGER,
    group_id INTEGER,
    role TEXT CHECK(role IN ('admin', 'member')) NOT NULL,
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE TABLE invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    invited_user INTEGER,
    inviter_user INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK(status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_user) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_user) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    sender_id INTEGER,
    content TEXT NOT NULL,
    send_time TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
);