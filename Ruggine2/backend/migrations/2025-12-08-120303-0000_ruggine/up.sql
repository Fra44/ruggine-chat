CREATE TABLE
    users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(25) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hashed_password VARCHAR(255) NOT NULL
    );

-- chat_type has values 'GROUP' or 'PRIVATE', user_id_1 AND user_id_2 must be NULL if chat_type is 'GROUP'
CREATE TABLE
    chats (
        id SERIAL PRIMARY KEY,
        chat_type VARCHAR(7) NOT NULL CHECK (chat_type IN ('GROUP', 'PRIVATE')),
        user_id_1 INT REFERENCES users (id) ON DELETE CASCADE,
        user_id_2 INT REFERENCES users (id) ON DELETE CASCADE,
        group_name VARCHAR(30),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chats_type_users_chk CHECK (
            (
                chat_type = 'GROUP'
                AND user_id_1 IS NULL
                AND user_id_2 IS NULL
            )
            OR (
                chat_type = 'PRIVATE'
                AND user_id_1 IS NOT NULL
                AND user_id_2 IS NOT NULL
            )
        ),
        CONSTRAINT group_name_not_null_chk CHECK (
            (
                chat_type = 'GROUP'
                AND group_name IS NOT NULL
            )
            OR (
                chat_type = 'PRIVATE'
                AND group_name IS NULL
            )
        )
    );

-- role has values 'ADMIN' or 'GUEST'
CREATE TABLE
    chat_components (
        chat_id INT REFERENCES chats (id) ON DELETE CASCADE,
        user_id INT REFERENCES users (id) ON DELETE CASCADE,
        role VARCHAR(6) NOT NULL CHECK (role IN ('ADMIN', 'MEMBER')),
        PRIMARY KEY (chat_id, user_id)
    );

-- index to ensure only one ADMIN per chat
CREATE UNIQUE INDEX chat_components_one_admin_per_chat ON chat_components (chat_id)
WHERE
    role = 'ADMIN';

CREATE TABLE
    messages (
        id SERIAL PRIMARY KEY,
        chat_id INT REFERENCES chats (id) ON DELETE CASCADE NOT NULL,
        sender_id INT REFERENCES users (id) ON DELETE CASCADE NOT NULL,
        content TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE
    invites (
        id SERIAL PRIMARY KEY,
        chat_id INT REFERENCES chats (id) ON DELETE CASCADE,
        sender_id INT REFERENCES users (id) ON DELETE SET NULL,
        receiver_id INT REFERENCES users (id) ON DELETE CASCADE,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted BOOLEAN DEFAULT NULL
    );