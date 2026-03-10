/// Table for chat components - defines user roles within group chats
/// Links users to chats with their assigned roles (e.g., 'ADMIN', 'MEMBER')
diesel::table! {
    chat_components (chat_id, user_id) {
        chat_id -> Int4,
        user_id -> Int4,
        #[max_length = 6]
        role -> Varchar,
    }
}

/// Table for chats - stores information about all chat conversations
/// Supports both private (user-to-user) and group chats
diesel::table! {
    chats (id) {
        id -> Int4,
        #[max_length = 7]
        chat_type -> Varchar,
        user_id_1 -> Nullable<Int4>,
        user_id_2 -> Nullable<Int4>,
        #[max_length = 30]
        group_name -> Nullable<Varchar>,
        created_at -> Nullable<Timestamp>,
        last_message_at -> Nullable<Timestamp>,
    }
}

/// Table for chat invites - manages pending invitations to join chats
/// Tracks who sent the invite, who received it, and its acceptance status
diesel::table! {
    invites (id) {
        id -> Int4,
        chat_id -> Nullable<Int4>,
        sender_id -> Nullable<Int4>,
        receiver_id -> Nullable<Int4>,
        sent_at -> Nullable<Timestamp>,
        accepted -> Nullable<Bool>,
    }
}

/// Table for messages - stores all chat messages with their content and metadata
/// Links messages to their sending user and containing chat
diesel::table! {
    messages (id) {
        id -> Int4,
        chat_id -> Int4,
        sender_id -> Int4,
        content -> Text,
        sent_at -> Nullable<Timestamp>,
    }
}

/// Table for users - stores user account information
/// Contains authentication data and profile information
diesel::table! {
    users (id) {
        id -> Int4,
        #[max_length = 25]
        username -> Varchar,
        created_at -> Nullable<Timestamp>,
        #[max_length = 255]
        hashed_password -> Varchar,
    }
}

// Table relationships - defines how tables can be joined together
// These allow Diesel to perform SQL joins between related tables
diesel::joinable!(chat_components -> chats (chat_id));
diesel::joinable!(chat_components -> users (user_id));
diesel::joinable!(invites -> chats (chat_id));
diesel::joinable!(messages -> chats (chat_id));
diesel::joinable!(messages -> users (sender_id));

// Allow these tables to be queried together in complex SQL statements
// This enables Diesel to generate queries that span multiple tables
diesel::allow_tables_to_appear_in_same_query!(chat_components, chats, invites, messages, users,);