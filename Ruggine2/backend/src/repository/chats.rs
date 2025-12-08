use crate::schema::chats;
use super::db::establish_connection;
use diesel::{ connection, prelude::* };
use super::args::{ CreatePrivateChat, CreateGroupChat };

/**
 * Struct representing a new chat to be inserted into the database.
 */
#[derive(Insertable)]
#[table_name = "chats"]
pub struct NewChat<'a> {
    pub chat_type: &'a str, // "PRIVATE" or "GROUP"
    pub user_id_1: Option<i32>, // NOT NULL only if chat_type == "PRIVATE"
    pub user_id_2: Option<i32>, // NOT NULL only if chat_type == "PRIVATE"
    pub created_at: Option<chrono::NaiveDateTime>,
    pub group_name: Option<&'a str>, // NOT NULL only if chat_type == "GROUP"
}

/**
 * Struct representing a user retrieved from the database.
 * (used also to MODIFY an existing user)
 */
#[derive(Queryable, Debug, AsChangeset)]
pub struct Chat {
    pub id: i32,
    pub chat_type: String,
    pub user_id_1: Option<i32>,
    pub user_id_2: Option<i32>,
    pub created_at: Option<chrono::NaiveDateTime>,
    pub group_name: Option<String>,
}

/**
 * Repository level function that creates a new private chat into the database.
 * # Arguments
 * `chat` - A CreatePrivateChat struct containing the chat details.
 */
pub fn create_private_chat(chat: CreatePrivateChat) {
    println!(
        "Creating new private chat between users: {:?} and {:?}",
        chat.user_id_1,
        chat.user_id_2
    );

    use crate::schema::chats::dsl::*;

    let connection = &mut establish_connection();

    let new_chat = NewChat {
        chat_type: &chat.chat_type,
        user_id_1: chat.user_id_1,
        user_id_2: chat.user_id_2,
        created_at: None,
        group_name: None,
    };

    diesel
        ::insert_into(chats)
        .values(&new_chat)
        .execute(connection)
        .expect("Error saving new private chat");
}

/**
 * Repository level function that creates a new group chat into the database.
 * # Arguments
 * `chat` - A CreateGroupChat struct containing the chat details.
 */
pub fn create_group_chat(chat: CreateGroupChat) {
    println!(
        "Creating new group chat named `{:?}` by creator user: {:?}",
        chat.group_name,
        chat.creator_id
    );

    use crate::schema::chats::dsl::*;

    let connection = &mut establish_connection();

    let new_chat = NewChat {
        chat_type: &chat.chat_type,
        user_id_1: None,
        user_id_2: None,
        created_at: None,
        group_name: Some(&chat.group_name),
    };

    diesel
        ::insert_into(chats)
        .values(&new_chat)
        .execute(connection)
        .expect("Error saving new group chat");
}
