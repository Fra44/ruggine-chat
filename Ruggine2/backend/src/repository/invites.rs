use super::args::{ CreateInvite, ActionOnInvite };
use super::db::establish_connection;
use crate::schema::invites;
use diesel::prelude::*;

/// Struct representing a new invite to be inserted into the database.
/// Contains the chat ID, sender ID, and receiver ID for the invite.
#[derive(Insertable)]
#[table_name = "invites"]
pub struct NewInvite {
    pub chat_id: Option<i32>,
    pub sender_id: Option<i32>,
    pub receiver_id: Option<i32>,
}

/// Struct representing an invite record from the database.
/// Includes the invite ID, chat ID, sender/receiver IDs, timestamp, and acceptance status.
#[derive(Queryable, Debug, AsChangeset)]
pub struct Invite {
    pub id: i32,
    pub chat_id: Option<i32>,
    pub sender_id: Option<i32>,
    pub receiver_id: Option<i32>,
    pub sent_at: Option<chrono::NaiveDateTime>,
    pub accepted: Option<bool>,
}

/**
 * Repository level function that creates a new invite into the database.
 * # Arguments
 * `invite` - A CreateInvite struct containing the invite details.
 * # Returns
 * A Result<i32, String> which is Ok(val: i32) if the invite was created successfully,
 * where val is the ID of the newly created invite,
 * Err(String) if there was an error.
 */
pub fn create_invite(invite: CreateInvite) -> Result<i32, String> {
    println!(
        "Creating new invite from user {:?} to user {:?} for chat {:?}",
        invite.sender_id,
        invite.receiver_id,
        invite.chat_id
    );

    use crate::schema::invites::dsl::*;

    let connection = &mut establish_connection();

    let new_invite = NewInvite {
        chat_id: invite.chat_id,
        sender_id: invite.sender_id,
        receiver_id: invite.receiver_id,
    };

    let res = diesel
        ::insert_into(invites)
        .values(&new_invite)
        .execute(connection)
        .expect("Error saving new invite");

    if res == 1 {
        let created_invite_id = invites
            .order(id.desc())
            .select(id)
            .first::<i32>(connection)
            .expect("Error loading created invite ID");
        Ok(created_invite_id)
    } else {
        Err("Failed to create invite".to_string())
    }
}

/**
 * Repository level function that accepts an incoming invite and returns the chat ID
 * the user is being invited to.
 * # Arguments
 * `action` - An ActionOnInvite struct containing the invite ID to be acted upon.
 * # Returns
 * A Result<i32, String> which is Ok(val: i32) if the invite was accepted successfully,
 * where val is the chat ID the user is being invited to,
 * Err(String) if there was an error.
 */
pub fn accept_invite(action: ActionOnInvite) -> Result<i32, String> {
    println!("Accepting invite with ID {:?}", action.invite_id);

    use crate::schema::invites::dsl::*;

    let connection = &mut establish_connection();

    let res = diesel
        ::update(invites.filter(id.eq(action.invite_id)))
        .set(accepted.eq(Some(true)))
        .execute(connection)
        .expect("Error accepting invite");

    if res == 1 {
        let invited_chat_id = invites
            .filter(id.eq(action.invite_id))
            .select(chat_id)
            .first::<Option<i32>>(connection)
            .expect("Error loading invited chat ID");
        match invited_chat_id {
            Some(chat_id_val) => { Ok(chat_id_val) }
            None => { Err("INVITE_HAS_NO_CHAT_ID".to_string()) }
        }
    } else {
        Err("FAILED_TO_ACCEPT_INVITE".to_string())
    }
}

/**
 * Repository level function that rejects an incoming invite.
 * # Arguments
 * `action` - An ActionOnInvite struct containing the invite ID to be acted upon.
 * # Returns
 * A Result<(), String> which is Ok(()) if the invite was rejected successfully,
 * Err(String) if there was an error.
 */
pub fn reject_invite(action: ActionOnInvite) -> Result<(), String> {
    println!("Rejecting invite with ID {:?}", action.invite_id);

    use crate::schema::invites::dsl::*;

    let connection = &mut establish_connection();

    let res = diesel
        ::update(invites.filter(id.eq(action.invite_id)))
        .set(accepted.eq(Some(false)))
        .execute(connection)
        .expect("Error rejecting invite");

    if res == 1 {
        Ok(())
    } else {
        Err("FAILED_TO_REJECT_INVITE".to_string())
    }
}

/// Repository level function that retrieves the invited user ID from an invite ID.
/// # Arguments
/// `invite_id` - An integer representing the invite ID.
/// # Returns
/// An Option<i32> which is Some(i32) if the invited user ID was found,
/// or None if no invite with the given ID exists.
pub fn get_invited_user_from_invite_id(invite_id: i32) -> Option<i32> {
    use crate::schema::invites::dsl::*;

    let mut connection = establish_connection();

    let result = invites
        .filter(id.eq(invite_id))
        .select(receiver_id)
        .first::<Option<i32>>(&mut connection)
        .optional()
        .expect("Error loading invite receiver");

    match result {
        Some(user_id_opt) => user_id_opt,
        None => None,
    }
}

/// Repository level function that retrieves all pending invites for a specific user.
/// # Arguments
/// `target_user_id` - The ID of the user for whom to retrieve invites.
/// # Returns
/// A Result<Vec<Invite>, String> containing all pending invites for the user if successful,
/// or an error message if the database query fails.
pub fn get_invites_for_user(target_user_id: i32) -> Result<Vec<Invite>, String> {
    println!("Retrieving invites for user ID {:?}", target_user_id);

    use crate::schema::invites::dsl::*;

    let connection = &mut establish_connection();

    let results = invites
        .filter(receiver_id.eq(target_user_id).and(accepted.is_null()))
        .load::<Invite>(connection);
    match results {
        Err(e) => Err(format!("Error loading invites: {}", e)),
        Ok(results) => Ok(results),
    }
}

/// Repository level function that retrieves all pending invites for a specific chat.
/// # Arguments
/// `chat_id_param` - The ID of the chat for which to retrieve pending invites.
/// # Returns
/// A Result<Vec<Invite>, String> containing all pending invites for the chat if successful,
/// or an error message if the database query fails.
pub fn get_pending_invites_for_chat(chat_id_param: i32) -> Result<Vec<Invite>, String> {
    println!("Retrieving pending invites for chat ID {:?}", chat_id_param);

    use crate::schema::invites::dsl::*;

    let connection = &mut establish_connection();

    let results = invites
        .filter(chat_id.eq(chat_id_param).and(accepted.is_null()))
        .load::<Invite>(connection);
    match results {
        Err(e) => Err(format!("Error loading pending invites for chat {}: {}", chat_id_param, e)),
        Ok(results) => Ok(results),
    }
}

/// Repository level function that retrieves a single invite by its ID.
/// # Arguments
/// `invite_id_param` - The ID of the invite to retrieve.
/// # Returns
/// A Result<Option<Invite>, String> which is Ok(Some(invite)) if the invite was found,
/// Ok(None) if no invite with the given ID exists, or Err(String) on database error.
pub fn get_invite_by_id(invite_id_param: i32) -> Result<Option<Invite>, String> {
    use crate::schema::invites::dsl::*;

    let mut connection = establish_connection();

    match invites
        .filter(id.eq(invite_id_param))
        .first::<Invite>(&mut connection)
        .optional()
    {
        Ok(inv_opt) => Ok(inv_opt),
        Err(e) => Err(format!("Error loading invite by id {}: {}", invite_id_param, e)),
    }
}
