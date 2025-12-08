use crate::schema::invites;
use super::db::establish_connection;
use diesel::{ connection, prelude::* };
use super::args::{ CreateInvite, ActionOnInvite };

#[derive(Insertable)]
#[table_name = "invites"]
pub struct NewInvite {
    pub chat_id: Option<i32>,
    pub sender_id: Option<i32>,
    pub receiver_id: Option<i32>,
}

#[derive(Queryable, Debug, AsChangeset)]
pub struct Invite {
    pub id: i32,
    pub chat_id: Option<i32>,
    pub sender_id: Option<i32>,
    pub receiver_id: Option<i32>,
    pub accepted: Option<bool>, // can only be NULL (pending), TRUE (accepted) or FALSE (rejected)
    pub sent_at: Option<chrono::NaiveDateTime>,
}

/**
 * Repository level function that creates a new invite into the database.
 * # Arguments
 * `invite` - A CreateInvite struct containing the invite details.
 */
pub fn create_invite(invite: CreateInvite) {
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

    diesel
        ::insert_into(invites)
        .values(&new_invite)
        .execute(connection)
        .expect("Error saving new invite");
}

/**
 * Repository level function that accets an incoming invite.
 * # Arguments
 * `action` - An ActionOnInvite struct containing the invite ID to be acted upon.
 */
pub fn accept_invite(action: ActionOnInvite) {
    println!("Accepting invite with ID {:?}", action.invite_id);

    use crate::schema::invites::dsl::*;

    let connection = &mut establish_connection();

    diesel
        ::update(invites.filter(id.eq(action.invite_id)))
        .set(accepted.eq(Some(true)))
        .execute(connection)
        .expect("Error accepting invite");
}

/**
 * Repository level function that rejects an incoming invite.
 * # Arguments
 * `action` - An ActionOnInvite struct containing the invite ID to be acted upon.
 */
pub fn reject_invite(action: ActionOnInvite) {
    println!("Rejecting invite with ID {:?}", action.invite_id);

    use crate::schema::invites::dsl::*;

    let connection = &mut establish_connection();

    diesel
        ::update(invites.filter(id.eq(action.invite_id)))
        .set(accepted.eq(Some(false)))
        .execute(connection)
        .expect("Error rejecting invite");
}