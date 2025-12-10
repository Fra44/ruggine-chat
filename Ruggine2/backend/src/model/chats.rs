
/** This file contains the utilities to "use" a Chat object WITHOUT directly interacting with the one
 * extracted/inserted from/to the DB  */

use serde::{ Serialize, Deserialize };

use crate::repository::{
    args::CreatePrivateChat,
    chats::{ get_chat_type, is_user_part_of_group_chat, is_user_part_of_private_chat },
};

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatDTO {
    pub id: i32,
    pub chat_type: String,
    pub user_id_1: Option<i32>,
    pub user_id_2: Option<i32>,
    pub group_name: Option<String>,
}

impl From<crate::repository::chats::Chat> for ChatDTO {
    fn from(chat: crate::repository::chats::Chat) -> Self {
        ChatDTO {
            id: chat.id,
            chat_type: chat.chat_type,
            user_id_1: chat.user_id_1,
            user_id_2: chat.user_id_2,
            group_name: chat.group_name,
        }
    }
}

/// Function to map a vector of Chat objects (directly retrieved from DB) to a vector of ChatDTO objects
/// (that are the business-logic version of Chat)
pub fn map_chats_to_dto(chats: Vec<crate::repository::chats::Chat>) -> Vec<ChatDTO> {
    chats.into_iter().map(ChatDTO::from).collect()
}

/// Function to map a single Chat object (directly retrieved from DB) to a ChatDTO object
/// (that is the business-logic version of Chat)
pub fn map_chat_to_dto(chat: crate::repository::chats::Chat) -> ChatDTO {
    ChatDTO::from(chat)
}

/// Function to check if a user is part of a chat (private or group).
/// # Arguments
/// `user_id` - The ID of the user.
/// `chat_id` - The ID of the chat.
/// # Returns
/// A Result<bool, String> which is Ok(true) if the user is part of the chat,
/// Ok(false) if the user is not part of the chat,
/// Err(String) if there was an error (e.g. chat does not exist)
/// or chat type is invalid.
pub fn is_user_part_of_chat(user_id: i32, chat_id: i32) -> Result<bool, String> {
    let get_chat_res = get_chat_type(chat_id);
    match get_chat_res {
        Ok(chat_type) => {
            if chat_type == "GROUP" {
                let is_part_res = is_user_part_of_group_chat(user_id, chat_id);
                match is_part_res {
                    Ok(val) => {
                        return Ok(val);
                    }
                    Err(err_str) => {
                        return Err(err_str);
                    }
                }
            } else if chat_type == "PRIVATE" {
                let is_part_res = is_user_part_of_private_chat(user_id, chat_id);
                match is_part_res {
                    Ok(val) => {
                        return Ok(val);
                    }
                    Err(err_str) => {
                        return Err(err_str);
                    }
                }
            } else {
                // something NOT in ["GROUP", "PRIVATE"] was returned ==> unexpected behavior
                return Err("NOT_GROUP_OR_PRIVATE_CHATTYPE_ERROR".to_string());
            }
        }
        Err(err_str) => {
            return Err(err_str);
        }
    }
}

/// function to create a private chat between two users
/// # Arguments
/// `user_id_1` : the id of one user
/// `user_id_2` : the id of the other user
/// # Returns
/// A Result<(), String> which is Ok(()) if the chat was created successfully,
/// Err(String) if there was an error (e.g. chat already exists)
pub fn create_private_chat_between_users(user_id_1: i32, user_id_2: i32) -> Result<(), String>{
    use crate::repository::chats::{ create_private_chat };

    let alr_exists_res = crate::repository::chats::does_private_chat_between_users_exist(
        user_id_1,
        user_id_2
    );
    match alr_exists_res {
        Ok(exists) => {
            if exists {
                println!(
                    "Private chat between users {:?} and {:?} already exists, not creating a new one",
                    user_id_1,
                    user_id_2
                );
                return Err("PRIVATE_CHAT_ALREADY_EXISTS".to_string());
            } else {
                let payload = CreatePrivateChat {
                    chat_type: "PRIVATE".to_string(),
                    user_id_1: Some(user_id_1),
                    user_id_2: Some(user_id_2),
                };
                create_private_chat(payload)
            }
        }
        Err(err_str) => {
            println!(
                "Error checking if private chat between users {:?} and {:?} exists: {:?}",
                user_id_1,
                user_id_2,
                err_str
            );
            return Err(err_str);
        }
    }
}
