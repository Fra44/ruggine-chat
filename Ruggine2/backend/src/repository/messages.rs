use super::db::establish_connection;
use super::args::{ CreateMessage };
use crate::schema::messages;
use diesel::prelude::*;

/**
 * Struct representing a new message to be inserted into the database.
 */
#[derive(Insertable)]
#[table_name = "messages"]
pub struct NewMessage<'a> {
    pub chat_id: i32,
    pub sender_id: i32,
    pub content: &'a str,
}

/**
 * Struct representing a message retrieved from the database.
 * (used also to MODIFY an existing message)
 */
#[derive(Queryable, Debug, AsChangeset)]
pub struct Message {
    pub id: i32,
    pub chat_id: i32,
    pub sender_id: i32,
    pub content: String,
    pub sent_at: Option<chrono::NaiveDateTime>,
}

/**
 * Repository level function that creates a new message in the database.
 * Inserts the message and retrieves the created record with its generated ID and timestamp.
 * # Arguments
 * `message` - A CreateMessage struct containing chat_id, sender_id, and message content.
 * # Returns
 * A Result containing the created Message struct with database-generated fields, or an error string.
 */
pub fn create_message(message: CreateMessage) -> Result<Message, String> {
    println!(
        "Creating new message in chat {:?} from sender {:?}: {:?}",
        message.chat_id,
        message.sender_id,
        message.content
    );

    use crate::schema::messages::dsl::*;

    let connection = &mut establish_connection();

    let new_message = NewMessage {
        chat_id: message.chat_id,
        sender_id: message.sender_id,
        content: &message.content,
    };

    let insert_res = diesel
        ::insert_into(messages)
        .values(&new_message)
        .execute(connection)
        .expect("Error saving new message");
    if insert_res == 1 {
        let created_message = messages
            .order(id.desc())
            .first::<Message>(connection)
            .map_err(|e| format!("Error retrieving newly created message: {}", e))?;
        Ok(created_message)
    } else {
        Err("FAILED_SENDING_MESSAGE".to_string())
    }
}

/**
 * Repository level function that retrieves all messages for a given chat ID from the database.
 * Messages are returned in the order they appear in the database (typically insertion order).
 * # Arguments
 * `target_chat_id` - An integer representing the chat ID whose messages are to be retrieved.
 * # Returns
 * A vector of Message structs representing all messages in the specified chat.
 */
pub fn get_messages_by_chat_id(target_chat_id: i32) -> Vec<Message> {
    println!("Retrieving messages for chat ID {:?}", target_chat_id);

    use crate::schema::messages::dsl::*;

    let connection = &mut establish_connection();

    let results = messages
        .filter(chat_id.eq(target_chat_id))
        .load::<Message>(connection)
        .expect("Error loading messages");
    results
}

