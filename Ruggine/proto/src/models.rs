use crate::schema::{groups, invites, messages, user_groups, users};

#[derive(Insertable, Debug)]
#[table_name = "users"]
pub struct NewUser<'a> {
    pub username: &'a str,
    pub hashed_pass: &'a str,
    pub salt: &'a str,
}

#[derive(Queryable, Debug, AsChangeset)]
pub struct User {
    pub id: Option<i32>,
    pub username: String,
    pub hashed_pass: String,
    pub salt: String
}

#[derive(Insertable, Debug)]
#[table_name = "groups"]
pub struct NewGroup<'a> {
    pub name: &'a str,
    pub creator: Option<i32>,
}

#[derive(Queryable, Debug, AsChangeset)]
pub struct Group {
    pub id: Option<i32>,
    pub name: String,
    pub creator: Option<i32>,
    pub created_at: Option<String>,
}

#[derive(Insertable, Debug)]
#[table_name = "user_groups"]
pub struct NewUserGroup<'a> {
    pub user_id: Option<i32>,
    pub group_id: Option<i32>,
    pub role: &'a str,
}
#[derive(Queryable, Debug, AsChangeset)]
pub struct UserGroup {
    pub user_id: Option<i32>,
    pub group_id: Option<i32>,
    pub role: String,
}

#[derive(Insertable, Debug)]
#[table_name = "invites"]
pub struct NewInvite {
    pub group_id: Option<i32>,
    pub invited_user: Option<i32>,
    pub inviter_user: Option<i32>,
}
#[derive(Queryable, Debug, AsChangeset)]
pub struct Invite {
    pub id: Option<i32>,
    pub group_id: Option<i32>,
    pub invited_user: Option<i32>,
    pub inviter_user: Option<i32>,
    pub created_at: Option<String>,
    pub status: Option<String>,
}

#[derive(Insertable, Debug)]
#[table_name = "messages"]
pub struct NewMessage<'a> {
    pub group_id: Option<i32>,
    pub sender_id: Option<i32>,
    pub content: &'a str,
}
#[derive(Queryable, Debug, AsChangeset)]
pub struct Message {
    pub id: Option<i32>,
    pub group_id: Option<i32>,
    pub sender_id: Option<i32>,
    pub content: String,
    pub send_time: Option<String>,
}



