use serde::{ Serialize, Deserialize };
use crate::repository::{
    args::CreatePrivateChat,
    chats::{ get_chat_type, is_user_part_of_group_chat, is_user_part_of_private_chat },
};

/// Data Transfer Object for chats sent to the client.
/// Includes enriched data like usernames and formatted timestamps.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatDTO {
    pub id: i32,
    pub chat_type: String,
    pub user_id_1: Option<i32>,
    pub user_id_2: Option<i32>,
    pub group_name: Option<String>,
    pub last_message_at: Option<String>,
    pub username_1: Option<String>,
    pub username_2: Option<String>,
}

/// Implementation to convert a repository Chat to a ChatDTO with enriched data.
impl From<crate::repository::chats::Chat> for ChatDTO {
    fn from(chat: crate::repository::chats::Chat) -> Self {
        let mut un1: Option<String> = None;
        let mut un2: Option<String> = None;
        match chat.user_id_1 {
            Some(uid1) => {
                un1 = Some(
                    crate::model::users
                        ::get_username_for_user_id(uid1)
                        .unwrap_or("UNKNOWN_USER".to_string())
                );
            }
            None => {}
        }
        match chat.user_id_2 {
            Some(uid2) => {
                un2 = Some(
                    crate::model::users
                        ::get_username_for_user_id(uid2)
                        .unwrap_or("UNKNOWN_USER".to_string())
                );
            }
            None => {}
        }
        ChatDTO {
            id: chat.id,
            chat_type: chat.chat_type,
            user_id_1: chat.user_id_1,
            user_id_2: chat.user_id_2,
            group_name: chat.group_name,
            last_message_at: chat.last_message_at
                .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
                .or(None),
            username_1: un1,
            username_2: un2,
        }
    }
}

/// Function to map a vector of Chat objects (directly retrieved from DB) to a vector of ChatDTO objects.
/// # Arguments
/// `chats` - A vector of Chat objects retrieved from the database.
/// # Returns
/// A vector of ChatDTO objects.
pub fn map_chats_to_dto(chats: Vec<crate::repository::chats::Chat>) -> Vec<ChatDTO> {
    chats.into_iter().map(ChatDTO::from).collect()
}

/// Function to map a single Chat object (directly retrieved from DB) to a ChatDTO object.
/// # Arguments
/// `chat` - A Chat object retrieved from the database.
/// # Returns
/// A ChatDTO object.
pub fn map_chat_to_dto(chat: crate::repository::chats::Chat) -> ChatDTO {
    ChatDTO::from(chat)
}

/// Function to retrieve all chats (private and group) for a given user ID, ordered by last message time descending.
/// # Arguments
/// `user_id` - An integer representing the user ID whose chats are to be retrieved.
/// # Returns
/// A vector of ChatDTO structs representing the chats of the specified user, ordered by last message time descending.
pub fn get_user_chats(user_id: i32) -> Vec<ChatDTO> {
    let private_chats = crate::repository::chats::get_private_chats_for_user(user_id);
    let group_chats = crate::repository::chats::get_group_chats_for_user(user_id);

    let mut chats = private_chats;
    chats.extend(group_chats);
    let mut chats_dto = map_chats_to_dto(chats);
    chats_dto.sort_by(|a, b| {
        let a_time = a.last_message_at.clone().unwrap_or_else(|| "1970-01-01 00:00:00".to_string());
        let b_time = b.last_message_at.clone().unwrap_or_else(|| "1970-01-01 00:00:00".to_string());
        b_time.cmp(&a_time)
    });
    chats_dto
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

/// Function to create a private chat between two users.
/// Performs validation: users exist, not self-chat, chat doesn't already exist.
/// # Arguments
/// `user_id_1` - The ID of the first user.
/// `user_id_2` - The ID of the second user.
/// # Returns
/// A Result<ChatDTO, String> which is Ok(ChatDTO) if the chat was created successfully,
/// Err(String) if there was an error (e.g. users not found, chat already exists).
pub fn create_private_chat_between_users(
    user_id_1: i32,
    user_id_2: i32
) -> Result<ChatDTO, String> {
    if user_id_1 == user_id_2 {
        return Err("CANNOT_CREATE_PRIVATE_CHAT_WITH_SELF".to_string());
    }

    use crate::repository::chats::{ create_private_chat };

    let exists_1 = crate::repository::users::find_user_by_id(user_id_1);
    match exists_1 {
        None => {
            return Err("USER_NOT_FOUND".to_string());
        }
        Some(_) => {}
    }
    let exists_2 = crate::repository::users::find_user_by_id(user_id_2);
    match exists_2 {
        None => {
            return Err("USER_NOT_FOUND".to_string());
        }
        Some(_) => {}
    }

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
                let create_res = create_private_chat(payload);
                match create_res {
                    Ok(chat) => {
                        let chat_dto = map_chat_to_dto(chat);
                        return Ok(chat_dto);
                    }
                    Err(e) => {
                        return Err(e);
                    }
                }
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

/// function to create a group chat, it checks if creator exists, then creates the group chat
/// adding the creator as admin in chat_components
/// # Arguments
/// `creator_id` : the id of the user creating the group chat
/// `group_name` : the name of the group chat
/// # Returns
/// A Result<i32, String> which is Ok(val: i32) if the chat was created successfully,
/// where val is the id of the newly created chat,
/// Err(String) if there was an error
pub fn create_group_chat(creator_id: i32, group_name: String) -> Result<i32, String> {
    let exists = crate::repository::users::find_user_by_id(creator_id);
    match exists {
        None => {
            return Err("CREATOR_USER_NOT_FOUND".to_string());
        }
        Some(_) => {}
    }

    let payload = crate::repository::args::CreateGroupChat {
        chat_type: "GROUP".to_string(),
        creator_id,
        group_name,
    };

    let to_ret = crate::repository::chats::create_group_chat(payload);

    match to_ret {
        Ok(chat_id) => {
            let add_component_payload = crate::repository::args::AddUserToChat {
                chat_id,
                user_id: creator_id,
                role: "ADMIN".to_string(),
            };
            let add_res =
                crate::repository::chat_components::add_chat_component(add_component_payload);
            match add_res {
                Ok(_) => {
                    return Ok(chat_id);
                }
                Err(e) => {
                    return Err(e);
                }
            }
        }
        Err(e) => {
            return Err(e);
        }
    }
}

/// Function to retrieve all user IDs in a given chat (private or group).
/// # Arguments
/// `chat_id` - The ID of the chat whose user IDs are to be retrieved.
/// # Returns
/// A Result<Vec<i32>, String> which is Ok(Vec<i32>) containing user IDs if successful,
/// Err(String) if the chat is not found or invalid.
pub fn get_users_in_chat(chat_id: i32) -> Result<Vec<i32>, String> {
    let chat_opt = crate::repository::chats::get_chat_by_id(chat_id);
    match chat_opt {
        None => {
            return Err("CHAT_NOT_FOUND".to_string());
        }
        Some(_) => {}
    }

    let chat_type_res = get_chat_type(chat_id);
    match chat_type_res {
        Ok(chat_type) => {
            if chat_type == "PRIVATE" {
                crate::repository::chats::get_users_in_private_chat(chat_id)
            } else if chat_type == "GROUP" {
                crate::repository::chats::get_users_in_group_chat(chat_id)
            } else {
                Err("INVALID_CHAT_TYPE".to_string())
            }
        }
        Err(err_str) => { Err(err_str) }
    }
}

/// Data Transfer Object for chat members and pending invites.
/// Contains user information and their status in the chat.
#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMemberDTO {
    pub user_id: i32,
    pub username: String,
    pub status: String,
}

/// Function to get all members and pending invites for a chat.
/// # Arguments
/// `chat_id` - The ID of the chat.
/// # Returns
/// A Result<Vec<ChatMemberDTO>, String> containing members with status "member" and invites with status "invited".
pub fn get_chat_members_and_invites(chat_id: i32) -> Result<Vec<ChatMemberDTO>, String> {
    let mut members: Vec<ChatMemberDTO> = Vec::new();

    let components = crate::model::chat_components::get_chat_components(chat_id);
    for comp in components {
        if let Some(username) = comp.username {
            members.push(ChatMemberDTO {
                user_id: comp.user_id,
                username,
                status: "member".to_string(),
            });
        }
    }

    let pending_invites = crate::repository::invites::get_pending_invites_for_chat(chat_id)?;
    for invite in pending_invites {
        if let Some(receiver_id) = invite.receiver_id {
            if let Some(user) = crate::repository::users::find_user_by_id(receiver_id) {
                members.push(ChatMemberDTO {
                    user_id: receiver_id,
                    username: user.username,
                    status: "invited".to_string(),
                });
            }
        }
    }

    Ok(members)
}