use serde::{ Serialize, Deserialize };

use crate::repository::{
    chat_components::{ get_chat_components_by_chat_id, ChatComponent },
};

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatComponentDTO {
    pub chat_id: i32,
    pub user_id: i32,
    pub role: String,
    pub username: Option<String>,
}

impl From<ChatComponent> for ChatComponentDTO {
    fn from(component: ChatComponent) -> Self {
        let mut dto = ChatComponentDTO {
            chat_id: component.chat_id,
            user_id: component.user_id,
            role: component.role,
            username: None,
        };

        // try to resolve username
        if let Some(user) = crate::repository::users::find_user_by_id(component.user_id) {
            dto.username = Some(user.username);
        }

        dto
    }
}

/// Function to map a vector of ChatComponent objects to a vector of ChatComponentDTO objects
pub fn map_chat_components_to_dto(components: Vec<ChatComponent>) -> Vec<ChatComponentDTO> {
    components.into_iter().map(ChatComponentDTO::from).collect()
}

/// Function to get chat components for a chat
pub fn get_chat_components(chat_id: i32) -> Vec<ChatComponentDTO> {
    let components = get_chat_components_by_chat_id(chat_id);
    map_chat_components_to_dto(components)
}