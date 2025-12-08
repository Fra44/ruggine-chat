/* This file contains all the structs related to the JSON-format datas sent
by the user through HTTP requests */
use serde::{Deserialize, Serialize};

/* USERS ----------------------------------------------------------------------------------------- */
/**
 * datas received from the client to create a new user
 * # Fields
 * `username` - the username of the new user
 * `plain_password` - the plain password of the new user
 */
#[derive(Serialize, Deserialize, Debug)]
pub struct CreateUser {
    pub username: String,
    pub plain_password: String,
}

/**
 * datas received from the client to login 
 * # Fields
 * `username` - the username of the user trying to login
 * `hashed_password` - the hashed password of the user trying to login
 */
#[derive(Serialize, Deserialize, Debug)]
pub struct LoginUser {
    pub username: String,
    pub hashed_password: String,
}

/* CHATS ----------------------------------------------------------------------------------------- */
/**
 * datas received from the client to create a new private chat 
 * # Fields
 * `chat_type` - the type of chat, must be "PRIVATE"
 * `user_id_1` - one of the two users in the private chat (usually the one who is creating/starting it)
 * `user_id_2` - the other user in the private chat
 * 
 */
#[derive(Serialize, Deserialize, Debug)]
pub struct CreatePrivateChat {
    pub chat_type: String,
    pub user_id_1: Option<i32>,
    pub user_id_2: Option<i32>,
}

/**
 * datas received from the client to create a new user
 * # Fields
 * `chat_type` - the type of chat, must be "group"
 * `creator_id` - the user who is creating the group chat
 * `group_name` - the name of the group chat
 */
#[derive(Serialize, Deserialize, Debug)]
pub struct CreateGroupChat {
    pub chat_type: String,
    pub creator_id: i32, // creator will be marked as admin in chat_components
    pub group_name: String,
}


/* CHAT COMPONENTS --------------------------------------------------------------------------------- */

/**
 * datas received from the client to add a user to a chat as a chat component
 * # Fields
 * `chat_id` - the chat to which the user is being added
 * `user_id` - the user being added to the chat
 * `role` - the role of the user in the chat, either "ADMIN" or "MEMBER"
 */
pub struct AddUserToChat {
    pub chat_id: i32,
    pub user_id: i32,
    pub role: String, // "ADMIN" or "MEMBER"
}

/* INVITES ----------------------------------------------------------------------------------------- */

/**
 * datas received from the client to create a new invite 
 * # Fields
 * `chat_id` - the chat (groupchat) to which the invite refers
 * `sender_id` - the user who is sending the invite
 * `receiver_id` - the user who is receiving the invite
 */
#[derive(Serialize, Deserialize, Debug)]
pub struct CreateInvite {
    pub chat_id: Option<i32>,
    pub sender_id: Option<i32>,
    pub receiver_id: Option<i32>,
}

/**
 * datas received from the client to accept OR reject an invite
 * # Fields
 * `invite_id` - the invite to be acted upon
 */
#[derive(Serialize, Deserialize, Debug)]
pub struct ActionOnInvite {
    pub invite_id: i32,
}

/* MESSAGES ----------------------------------------------------------------------------------------- */

/**
 * datas received from the client to send/create a new message, this is used 
 * in both cases of private chat and group chat (the chat_id refers to either one)
 * # Fields
 * `chat_id` - the chat to which the message belongs
 * `sender_id` - the user who is sending the message
 * `content` - the content of the message
 */
#[derive(Serialize, Deserialize, Debug)]
pub struct CreateMessage {
    pub chat_id: i32,
    pub sender_id: i32,
    pub content: String,
}