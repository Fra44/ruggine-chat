// @generated automatically by Diesel CLI.

diesel::table! {
    chat_components (chat_id, user_id) {
        chat_id -> Int4,
        user_id -> Int4,
        #[max_length = 6]
        role -> Varchar,
    }
}

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

diesel::table! {
    messages (id) {
        id -> Int4,
        chat_id -> Int4,
        sender_id -> Int4,
        content -> Text,
        sent_at -> Nullable<Timestamp>,
    }
}

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

diesel::joinable!(chat_components -> chats (chat_id));
diesel::joinable!(chat_components -> users (user_id));
diesel::joinable!(invites -> chats (chat_id));
diesel::joinable!(messages -> chats (chat_id));
diesel::joinable!(messages -> users (sender_id));

diesel::allow_tables_to_appear_in_same_query!(chat_components, chats, invites, messages, users,);
