// @generated automatically by Diesel CLI.

diesel::table! {
    groups (id) {
        id -> Nullable<Integer>,
        name -> Text,
        creator -> Nullable<Integer>,
        created_at -> Nullable<Text>,
    }
}

diesel::table! {
    invites (id) {
        id -> Nullable<Integer>,
        group_id -> Nullable<Integer>,
        invited_user -> Nullable<Integer>,
        inviter_user -> Nullable<Integer>,
        created_at -> Nullable<Text>,
        status -> Nullable<Text>,
    }
}

diesel::table! {
    messages (id) {
        id -> Nullable<Integer>,
        group_id -> Nullable<Integer>,
        sender_id -> Nullable<Integer>,
        content -> Text,
        send_time -> Nullable<Text>,
    }
}

diesel::table! {
    user_groups (user_id, group_id) {
        user_id -> Nullable<Integer>,
        group_id -> Nullable<Integer>,
        role -> Text,
    }
}

diesel::table! {
    users (id) {
        id -> Nullable<Integer>,
        username -> Text,
        hashed_pass -> Text,
        salt -> Text,
    }
}

diesel::joinable!(groups -> users (creator));
diesel::joinable!(invites -> groups (group_id));
diesel::joinable!(messages -> groups (group_id));
diesel::joinable!(messages -> users (sender_id));
diesel::joinable!(user_groups -> groups (group_id));
diesel::joinable!(user_groups -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(groups, invites, messages, user_groups, users,);
