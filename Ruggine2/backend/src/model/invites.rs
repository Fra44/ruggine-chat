/* This file contains the utilities to "use" an Invite object WITHOUT directly interacting with the one
 * extracted/inserted from/to the DB */

use serde::{ Serialize, Deserialize };

use crate::{
    repository::{
        args::CreateInvite,
        invites::{ accept_invite, create_invite, get_invited_user_from_invite_id, reject_invite },
    },
    schema::chat_components::chat_id,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct InviteDTO {
    pub id: i32,
    pub chat_id: Option<i32>,
    pub sender_id: Option<i32>,
    pub receiver_id: Option<i32>,
    pub accepted: Option<bool>, // can only be NULL (pending), TRUE (accepted) or FALSE (rejected)
    pub sent_at: String,
}

impl From<crate::repository::invites::Invite> for InviteDTO {
    fn from(invite: crate::repository::invites::Invite) -> Self {
        InviteDTO {
            id: invite.id,
            chat_id: invite.chat_id,
            sender_id: invite.sender_id,
            receiver_id: invite.receiver_id,
            accepted: invite.accepted,
            sent_at: match invite.sent_at {
                Some(dt) => dt.format("%Y-%m-%d %H:%M:%S").to_string(),
                None => "N/A".to_string(),
            },
        }
    }
}

/// Function to map a vector of Invite objects (directly retrieved from DB) to a vector of InviteDTO objects
/// (that are the business-logic version of Invite)
/// # Arguments
/// `invites` - A vector of Invite objects retrieved from the database.
/// # Returns
/// A vector of InviteDTO objects.
pub fn map_invites_to_dto(invites: Vec<crate::repository::invites::Invite>) -> Vec<InviteDTO> {
    invites.into_iter().map(InviteDTO::from).collect()
}

/// Function to map a single Invite object (directly retrieved from DB) to an InviteDTO object
/// (that is the business-logic version of Invite)
/// # Arguments
/// `invite` - An Invite object retrieved from the database.
/// # Returns
/// An InviteDTO object.
pub fn map_invite_to_dto(invite: crate::repository::invites::Invite) -> InviteDTO {
    InviteDTO::from(invite)
}

/// Function to accept an invite for a user, it first checks if the invite is for the given user,
/// then it accepts the invite and adds the user to the chat as MEMBER.
/// # Arguments
/// `invite_id` - The ID of the invite to be accepted.
/// `accepting_user` - The ID of the user accepting the invite.
/// # Returns
/// A Result<i32, String> which is Ok(val: i32) if the invite was accepted successfully,
/// where val is the chat ID the user is being invited to,
/// Err(String) if there was an error.
pub fn accept_invite_model(invite_id: i32, accepting_user: i32) -> Result<i32, String> {
    let should_be_user = get_invited_user_from_invite_id(invite_id);
    if should_be_user.is_none() || should_be_user.unwrap() != accepting_user {
        return Err("INVITE_NOT_FOR_THIS_USER".to_string());
    } else {
        let action = crate::repository::args::ActionOnInvite {
            invite_id,
        };
        let res = crate::repository::invites::accept_invite(action);
        match res {
            Ok(chat_id_) => {
                // now we add the user to the chat as MEMBER
                let add_component_payload = crate::repository::args::AddUserToChat {
                    chat_id: chat_id_,
                    user_id: accepting_user,
                    role: "MEMBER".to_string(),
                };
                let add_res =
                    crate::repository::chat_components::add_chat_component(add_component_payload);
                match add_res {
                    Ok(_) => {
                        return Ok(chat_id_);
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
}

/// Function to reject an invite for a user, it first checks if the invite is for the given user,
/// then it rejects the invite.
/// # Arguments
/// `invite_id` - The ID of the invite to be rejected.
/// `rejecting_user` - The ID of the user rejecting the invite.
/// # Returns
/// A Result<(), String> which is Ok(()) if the invite was rejected successfully,
/// Err(String) if there was an error.
pub fn reject_invite_model(invite_id: i32, rejecting_user: i32) -> Result<(), String> {
    let should_be_user = get_invited_user_from_invite_id(invite_id);
    if should_be_user.is_none() || should_be_user.unwrap() != rejecting_user {
        return Err("INVITE_NOT_FOR_THIS_USER".to_string());
    } else {
        let action = crate::repository::args::ActionOnInvite {
            invite_id,
        };
        reject_invite(action)
    }
}

/// function to retrieve all invites for a given user ID from the database,
/// mapping them to InviteDTO objects.
/// # Arguments
/// `user_id` - The ID of the user whose invites are to be retrieved.
/// # Returns
/// A Result<Vec<InviteDTO>, String> which is Ok(val: Vec<InviteDTO>) if the invites were retrieved successfully,
/// where val is a vector of InviteDTO objects,
/// Err(String) if there was an error.
pub fn get_user_invites(user_id: i32) -> Result<Vec<InviteDTO>, String> {
    // first we check if user exists :
    let user_exists = crate::repository::users::find_user_by_id(user_id);
    if user_exists.is_none() {
        return Err("USER_NOT_FOUND".to_string());
    }
    let invites = crate::repository::invites::get_invites_for_user(user_id);
    match invites {
        Ok(inv_vec) => {
            let dto_vec = map_invites_to_dto(inv_vec);
            Ok(dto_vec)
        }
        Err(e) => { Err(e) }
    }
}

pub fn create_invite_for_user(user_id_sender: i32, user_id_receiver: i32, chat_id_: i32) -> Result<i32, String> {
    // we check that user exists
    let user_exists = crate::repository::users::find_user_by_id(user_id_sender);
    if user_exists.is_none() {
        return Err("USER_SENDER_NOT_FOUND".to_string());
    }
    let user_exists = crate::repository::users::find_user_by_id(user_id_receiver);
    if user_exists.is_none() {
        return Err("USER_RECEIVER_NOT_FOUND".to_string());
    }
    // we check that chat exists and it is a GROUP chat
    let chat_type_res = crate::repository::chats::get_chat_type(chat_id_);
    match chat_type_res {
        Ok(chat_type) => {
            if chat_type != "GROUP" {
                return Err("CANNOT_INVITE_TO_NON_GROUP_CHAT".to_string());
            }
        }
        Err(e) => {
            return Err(e);
        }
    }

    // we check that sender is part of the chat
    let is_part_res = crate::repository::chats::is_user_part_of_group_chat(user_id_sender, chat_id_);
    match is_part_res {
        Ok(is) => {
            if !is {
                return Err("SENDER_NOT_IN_CHAT".to_string());
            }
        }
        Err(e) => {
            return Err(e);
        }
    }

    // we check that user is NOT already part of the chat
    let is_part_res = crate::repository::chats::is_user_part_of_group_chat(user_id_receiver, chat_id_);
    match is_part_res {
        Ok(is) => {
            if is {
                return Err("USER_ALREADY_IN_CHAT".to_string());
            } else {
                // here it is NOT part of the chat
                // we check that there is no PENDING invite for that user to that chat
                let existing_invites_res =
                    crate::repository::invites::get_invites_for_user(user_id_receiver);
                match existing_invites_res {
                    Ok(existing_invites) => {
                        for inv in existing_invites {
                            if inv.chat_id == Some(chat_id_) && inv.accepted.is_none() {
                                return Err("PENDING_INVITE_ALREADY_EXISTS".to_string());
                            }
                        }
                        // if we reach here, it means there is no pending invite for that user to that chat
                        let create_payload = CreateInvite {
                            chat_id: Some(chat_id_),
                            sender_id: Some(user_id_sender),
                            receiver_id: Some(user_id_receiver),
                        };
                        crate::repository::invites::create_invite(create_payload)
                    }
                    Err(e) => {
                        return Err(e);
                    }
                }
            }
        }
        Err(e) => {
            return Err(e);
        }
    }
}
