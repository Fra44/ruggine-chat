use crate::schema::chats;
use super::db::establish_connection;
use diesel::{ connection, prelude::* };
use serde::{ Deserialize, Serialize };
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
    pub group_name: Option<String>,
    pub created_at: Option<chrono::NaiveDateTime>,
    pub last_message_at: Option<chrono::NaiveDateTime>,
}

/// Repository level function that retrieves a chat by ID from the database.
/// # Arguments
/// `chat_id` - An integer representing the chat ID to be retrieved.
/// # Returns
/// A Chat struct representing the chat with the specified ID.
/// If no chat is found, returns None.
pub fn get_chat_by_id(chat_id: i32) -> Option<Chat> {
    println!("Retrieving chat with ID {:?}", chat_id);

    use crate::schema::chats::dsl::*;

    let mut connection = establish_connection();

    match
        chats
            .filter(id.eq(chat_id as i32))
            .first::<Chat>(&mut connection)
            .optional()
    {
        Ok(chat_opt) => chat_opt,
        Err(e) => {
            println!("Database error: {}", e);
            None
        }
    }
}

/**
 * Repository level function that creates a new private chat into the database.
 * # Arguments
 * `chat` - A CreatePrivateChat struct containing the chat details.
 */
pub fn create_private_chat(chat: CreatePrivateChat) -> Result<Chat, String> {
    println!(
        "Creating new private chat between users: {:?} and {:?}",
        chat.user_id_1,
        chat.user_id_2
    );

    use crate::schema::chats::dsl::*;

    // we return the id of the newly created chat
    let connection = &mut establish_connection();

    let new_chat = NewChat {
        chat_type: &chat.chat_type,
        user_id_1: Some(chat.user_id_1.unwrap()),
        user_id_2: Some(chat.user_id_2.unwrap()),
        created_at: None,
        group_name: None,
    };
    let res = diesel::insert_into(chats).values(&new_chat).execute(connection).unwrap_or(0);
    if res == 1 {
        // we retrieve the id of the newly created chat
        let created_chat = chats
            .order(id.desc())
            .first::<Chat>(connection)
            .expect("Error loading chat");
        Ok(created_chat)
    } else {
        Err("Failed to create private chat".to_string())
    }
}

/// Repository level function that creates a new group chat into the database.
/// # Arguments
///`chat` - A CreateGroupChat struct containing the chat details.
/// # Returns
/// A Result<i32, String> which is Ok(val: i32) if the chat was created successfully,
/// where val is the id of the newly created chat,
/// Err(String) if there was an error.
pub fn create_group_chat(chat: CreateGroupChat) -> Result<i32, String> {
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

    let res = diesel::insert_into(chats).values(&new_chat).execute(connection).unwrap_or(0);
    if res == 1 {
        let created_chat = chats
            .order(id.desc())
            .first::<Chat>(connection)
            .expect("RETRIEVING_NEWLY_CREATED_GROUP_CHAT_ERROR");
        Ok(created_chat.id)
    } else {
        Err("GROUP_CREATION_FAILED".to_string())
    }
}

/// Repository level function that retrieves all chats for a given user ID from the database.
/// # Arguments
/// `user_id` - An integer representing the user ID whose chats are to be retrieved.
/// # Returns
/// A vector of Chat structs representing the chats of the specified user.
pub fn get_private_chats_for_user(user_id: i32) -> Vec<Chat> {
    println!("Retrieving private chats for user ID {:?}", user_id);

    use crate::schema::chats::dsl::*;

    let connection = &mut establish_connection();

    let results = chats
        .filter(chat_type.eq("PRIVATE").and(user_id_1.eq(user_id).or(user_id_2.eq(user_id))))
        .load::<Chat>(connection)
        .expect("Error loading chats");

    results
}

pub fn get_group_chats_for_user(user_id_: i32) -> Vec<Chat> {
    println!("Retrieving group chats for user ID {:?}", user_id_);

    use crate::schema::chats::dsl::*;
    use crate::schema::chat_components::dsl as cc_dsl;

    let connection = &mut establish_connection();

    let results = chats
        .inner_join(cc_dsl::chat_components.on(cc_dsl::chat_id.eq(id)))
        .filter(chat_type.eq("GROUP").and(cc_dsl::user_id.eq(user_id_)))
        .select(chats::all_columns())
        .load::<Chat>(connection)
        .expect("Error loading group chats");
    //println!("Found group chats: {:?}", results);
    results
}

/// function to retrieve the chatType of the chat which id is passed as parameter
/// # Arguments
/// `chat_id` : the id of the chat we want to retrieve the type for
/// # Returns
/// A String representing the chat type ("PRIVATE" or "GROUP")
pub fn get_chat_type(chat_id: i32) -> Result<String, String> {
    use crate::schema::chats::dsl::*;
    let mut connection = establish_connection();

    match
        chats
            .filter(id.eq(chat_id as i32))
            .first::<Chat>(&mut connection)
            .optional()
    {
        Ok(Some(chat)) => Ok(chat.chat_type),
        Ok(None) => Err(format!("Chat with id {} not found", chat_id)),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

/// function to check if a user is part of a private chat
/// # Arguments
/// `user_id` : the id of the user we want to check
/// `chat_id` : the id of the private chat we want to check
/// # Returns
/// A Result<bool, String> which is Ok(true) if the user is part of the private chat,
/// Ok(false) if the user is not part of the private chat,
/// Err(String) if there was an error (e.g. chat is not private)
pub fn is_user_part_of_private_chat(user_id: i32, chat_id: i32) -> Result<bool, String> {
    // we check if chat is actually a private chat, if it's not then we return a String
    // "NOT_PRIVATE_CHAT_ERROR"
    let chat_type_ = get_chat_type(chat_id);
    let chat_type_ = match chat_type_ {
        Ok(ct) => ct,
        Err(e) => {
            return Err(e);
        }
    };
    if chat_type_ != "PRIVATE" {
        return Err("NOT_PRIVATE_CHAT_ERROR".to_string());
    }
    // if it's actually a private chat, we check user_id_* and if one of them == to user_id param then true, else false
    use crate::schema::chats::dsl::*;
    let connection = &mut establish_connection();
    let chat = chats
        .filter(id.eq(chat_id as i32))
        .first::<Chat>(connection)
        .expect("Error loading chat");
    if chat.user_id_1 == Some(user_id as i32) || chat.user_id_2 == Some(user_id as i32) {
        Ok(true)
    } else {
        Ok(false)
    }
}

/// function to check if a user is part of a group chat
/// # Arguments
/// `user_id_` : the id of the user we want to check
/// `chat_id_` : the id of the group chat we want to check
/// # Returns
/// A Result<bool, String> which is Ok(true) if the user is part of the group chat,
/// Ok(false) if the user is not part of the group chat,
/// Err(String) if there was an error (e.g. chat is not group)
pub fn is_user_part_of_group_chat(user_id_: i32, chat_id_: i32) -> Result<bool, String> {
    // we check if chat is actually a group chat, if it's not then we return a String
    // "NOT_GROUP_CHAT_ERROR"
    let chat_type_ = get_chat_type(chat_id_);
    let chat_type_ = match chat_type_ {
        Ok(ct) => ct,
        Err(e) => {
            return Err(e);
        }
    };
    if chat_type_ != "GROUP" {
        return Err("NOT_GROUP_CHAT_ERROR".to_string());
    }
    // if it's actually a group chat, we check in chat_components table if user is part of that chat
    use crate::schema::chat_components::dsl::*;
    let connection = &mut establish_connection();
    let result = chat_components
        .filter(chat_id.eq(chat_id_ as i32).and(user_id.eq(user_id_ as i32)))
        .first::<super::chat_components::ChatComponent>(connection)
        .optional()
        .expect("Error loading chat component");
    match result {
        Some(_) => Ok(true),
        None => Ok(false),
    }
}

/// Function to check if a private chat between two users already exists
/// # Arguments
/// `user_id_1` - The ID of the first user.
/// `user_id_2` - The ID of the second user.
/// # Returns
/// A Result<bool, String> which is Ok(true) if the private chat exists,
/// Ok(false) if the private chat does not exist,
/// Err(String) if there was an error.
pub fn does_private_chat_between_users_exist(
    user_id_1_: i32,
    user_id_2_: i32
) -> Result<bool, String> {
    use crate::schema::chats::dsl::*;
    let mut connection = establish_connection();

    match
        chats
            .filter(
                chat_type.eq("PRIVATE").and(
                    user_id_1
                        .eq(user_id_1_)
                        .and(user_id_2.eq(user_id_2_))
                        .or(user_id_1.eq(user_id_2_).and(user_id_2.eq(user_id_1_)))
                )
            )
            .first::<Chat>(&mut connection)
            .optional()
    {
        Ok(Some(_)) => Ok(true),
        Ok(None) => Ok(false),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

/// Function at repository level to update the last_message_at field of a chat
/// # Arguments
/// `chat_id_` : the id of the chat to update
/// `timestamp` : the new timestamp to set
/// # Returns
/// A Result<(), String> which is Ok(()) if the update was successful,
/// Err(String) if there was an error (e.g. chat not found)
pub fn update_chat_last_message_at(
    chat_id_: i32,
    timestamp: chrono::NaiveDateTime
) -> Result<(), String> {
    use crate::schema::chats::dsl::*;
    let mut connection = establish_connection();

    let target = chats.filter(id.eq(chat_id_ as i32));

    let updated_rows = diesel
        ::update(target)
        .set(last_message_at.eq(timestamp))
        .execute(&mut connection)
        .map_err(|e| format!("Error updating last_message_at: {}", e))?;

    if updated_rows == 1 {
        Ok(())
    } else {
        Err("No chat found with the given ID".to_string())
    }
}

/// Repository level function that retrieves all user IDs in a given chat.
/// # Arguments
/// `chat_id_` - An integer representing the chat ID whose user IDs are to be retrieved.
/// # Returns
/// A Result<Vec<i32>, String> which is Ok(Vec<i32>) containing user IDs if successful,
/// Err(String) if there was an error.
pub fn get_users_in_group_chat(chat_id_: i32) -> Result<Vec<i32>, String> {
    use crate::schema::chat_components::dsl::*;
    let mut connection = establish_connection();

    let results = chat_components
        .filter(chat_id.eq(chat_id_ as i32))
        .load::<super::chat_components::ChatComponent>(&mut connection)
        .map_err(|e| format!("Error loading chat components: {}", e))?;

    let user_ids: Vec<i32> = results
        .into_iter()
        .map(|cc| cc.user_id)
        .collect();
    Ok(user_ids)
}

pub fn get_users_in_private_chat(chat_id_: i32) -> Result<Vec<i32>, String> {
    let chat_opt = get_chat_by_id(chat_id_);
    match chat_opt {
        Some(chat) => {
            if chat.chat_type != "PRIVATE" {
                return Err("CHAT_NOT_PRIVATE_ERROR".to_string());
            }
            let mut user_ids = Vec::new();
            if let Some(uid1) = chat.user_id_1 {
                user_ids.push(uid1);
            }
            if let Some(uid2) = chat.user_id_2 {
                user_ids.push(uid2);
            }
            Ok(user_ids)
        }
        None => { Err("CHAT_NOT_FOUND_ERROR".to_string()) }
    }
}
