use crate::model::chats::is_user_part_of_chat;
use serde::{ Serialize, Deserialize };

/// Data Transfer Object for messages sent to the client.
/// Contains message details with formatted timestamp.
#[derive(Debug, Serialize, Deserialize)]
pub struct MessageDTO {
    pub id: i32,
    pub chat_id: i32,
    pub sender_id: i32,
    pub content: String,
    pub sent_at: String,
}

/// Implementation to convert a repository Message to a MessageDTO.
impl From<crate::repository::messages::Message> for MessageDTO {
    fn from(message: crate::repository::messages::Message) -> Self {
        MessageDTO {
            id: message.id,
            chat_id: message.chat_id,
            sender_id: message.sender_id,
            content: message.content,
            sent_at: message.sent_at
                .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
                .unwrap_or_else(|| "unknown".to_string()),
        }
    }
}

/// Function to map a vector of Message objects (directly retrieved from DB) to a vector of MessageDTO objects
/// (that are the business-logic version of Message)
/// # Arguments
/// `messages` - A vector of Message objects retrieved from the database.
/// # Returns
/// A vector of MessageDTO objects.
pub fn map_messages_to_dto(messages: Vec<crate::repository::messages::Message>) -> Vec<MessageDTO> {
    messages.into_iter().map(MessageDTO::from).collect()
}

/// Function to map a single Message object (directly retrieved from DB) to a MessageDTO object
/// (that is the business-logic version of Message)
/// # Arguments
/// `message` - A Message object retrieved from the database.
/// # Returns
/// A MessageDTO object.
pub fn map_message_to_dto(message: crate::repository::messages::Message) -> MessageDTO {
    MessageDTO::from(message)
}

/// Function to send a message in a chat (private or group).
/// # Arguments
/// `user_id` - The ID of the user sending the message.
/// `chat_id` - The ID of the chat where the message is being sent.
/// `content` - The content of the message being sent.
/// # Returns
/// A Result<MessageDTO, String> which is Ok(MessageDTO) if the message was sent successfully,
/// Err(String) if there was an authorization error or database failure.
pub fn send_message(user_id: i32, chat_id: i32, content: String) -> Result<MessageDTO, String> {
    let is_part_res = is_user_part_of_chat(user_id, chat_id);
    match is_part_res {
        Ok(is_part) => {
            if !is_part {
                return Err("USER_NOT_AUTHORIZED".to_string());
            }
        }
        Err(err_str) => {
            return Err(err_str);
        }
    }
    let new_message = crate::repository::args::CreateMessage {
        chat_id,
        sender_id: user_id,
        content,
    };

    let create_res = crate::repository::messages::create_message(new_message);
    match create_res {
        Ok(msg) => {
            let update_res = crate::repository::chats::update_chat_last_message_at(
                chat_id,
                chrono::Utc::now().naive_utc()
            );
            if update_res.is_err() {
                return Err("FAILED_UPDATING_CHAT_TIMESTAMP".to_string());
            }
            Ok(map_message_to_dto(msg))
        }
        Err(err_str) => {
            return Err(err_str);
        }
    }
}
