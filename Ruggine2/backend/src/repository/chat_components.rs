use crate::{ repository::args::AddUserToChat, schema::chat_components };
use super::db::establish_connection;
use diesel::prelude::*;

/// Struct representing a new chat component to be inserted into the database.
/// Contains the chat ID, user ID, and role for the component.
#[derive(Insertable)]
#[table_name = "chat_components"]
pub struct NewChatComponent<'a> {
    pub chat_id: i32,
    pub user_id: i32,
    pub role: &'a str,
}

/// Struct representing a chat component record from the database.
/// Links a user to a chat with their assigned role (e.g., 'ADMIN', 'MEMBER').
#[derive(Queryable, Debug, AsChangeset)]
pub struct ChatComponent {
    pub chat_id: i32,
    pub user_id: i32,
    pub role: String,
}

/**
 * Repository level function that adds a user to a chat as a chat component into the database.
 * (this can be called when creating a group chat to add the creator as ADMIN, or when accepting an invite to add the invited user as MEMBER)
 * # Arguments
 * `chat_component` - An AddUserToChat struct containing the chat component details.
 * # Returns
 * A Result<(), String> which is Ok(()) if the component was added successfully,
 * Err(String) if there was an error.
 */
pub fn add_chat_component(chat_component: AddUserToChat) -> Result<(), String> {
    println!(
        "Adding user {:?} to chat {:?} as {:?}",
        chat_component.user_id,
        chat_component.chat_id,
        chat_component.role
    );

    use crate::schema::chat_components::dsl::*;

    let new_chat_component = NewChatComponent {
        chat_id: chat_component.chat_id,
        user_id: chat_component.user_id,
        role: &chat_component.role,
    };

    let connection = &mut establish_connection();

    let insertion = diesel
        ::insert_into(chat_components)
        .values(&new_chat_component)
        .execute(connection)
        .expect("Error saving new chat component");

    if insertion == 1 {
        Ok(())
    } else {
        Err("FAILED_TO_ADD_CHAT_COMPONENT".to_string())
    }
}

/**
 * Repository level function that retrieves all chat components for a given chat ID from the database.
 * # Arguments
 * `target_chat_id` - An integer representing the chat ID whose components are to be retrieved.
 * # Returns
 * A vector of ChatComponent structs representing the chat components of the specified chat.
 */
pub fn get_chat_components_by_chat_id(target_chat_id: i32) -> Vec<ChatComponent> {
    println!("Retrieving chat components for chat ID {:?}", target_chat_id);

    use crate::schema::chat_components::dsl::*;

    let connection = &mut establish_connection();

    let results = chat_components
        .filter(chat_id.eq(target_chat_id))
        .load::<ChatComponent>(connection)
        .expect("Error loading chat components");

    results
}

/**
 * Repository level function that removes a user from a chat as a chat component from the database.
 * # Arguments
 * `chat_id_val` - An integer representing the chat ID.
 * `user_id_val` - An integer representing the user ID.
 */
pub fn remove_chat_component(chat_id_val: i32, user_id_val: i32) {
    println!("Removing user {:?} from chat {:?}", user_id_val, chat_id_val);

    use crate::schema::chat_components::dsl::*;

    let connection = &mut establish_connection();

    diesel
        ::delete(chat_components.filter(chat_id.eq(chat_id_val)).filter(user_id.eq(user_id_val)))
        .execute(connection)
        .expect("Error deleting chat component");
}
