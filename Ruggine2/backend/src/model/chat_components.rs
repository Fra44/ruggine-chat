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

/// Function to remove a member from a chat, only if the remover is an admin
pub fn remove_member_from_chat(chat_id: i32, member_user_id: i32, remover_user_id: i32) -> Result<(), String> {
    // Check if remover is admin
    let components = get_chat_components_by_chat_id(chat_id);
    let is_admin = components.iter().any(|c| c.user_id == remover_user_id && c.role == "ADMIN");
    if !is_admin {
        return Err("Only admins can remove members".to_string());
    }

    // Cannot remove self? Maybe allow, but for now, allow
    // if member_user_id == remover_user_id {
    //     return Err("Cannot remove yourself".to_string());
    // }

    // Remove the component
    crate::repository::chat_components::remove_chat_component(chat_id, member_user_id);
    Ok(())
}