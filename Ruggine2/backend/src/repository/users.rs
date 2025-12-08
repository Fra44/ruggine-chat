use crate::schema::users;
use super::db::establish_connection;
use diesel::{ connection, prelude::* };
use super::args::{ CreateUser };

/**
 * Struct representing a new user to be inserted into the database.
 */
#[derive(Insertable)]
#[table_name = "users"]
pub struct NewUser<'a> {
    username: &'a str,
    hashed_password: &'a str,
}

/**
 * Struct representing a user retrieved from the database.
 * (used also to MODIFY an existing user)
 */
#[derive(Queryable, Debug, AsChangeset)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub created_at: Option<chrono::NaiveDateTime>, 
    pub hashed_password: String,
}

/**
 * Repository level function that inserts a new user into the database.
 * # Arguments
 * `user` - A CreateUser struct containing the username and plain password of the user to be registered.
 */
pub fn register_user(user: CreateUser) {
    println!("Registering new user with username: {:?}", user.username);

    use crate::schema::users::dsl::*;

    let connection = &mut establish_connection();

    let my_hashed_password = format!("hashed_{}", user.plain_password); // Placeholder for hashing logic

    let new_user = NewUser {
        username: &user.username,
        hashed_password: &my_hashed_password,
    };

    diesel
        ::insert_into(users)
        .values(&new_user)
        .execute(connection)
        .expect("Error saving new user");
}

/**
 * Repository level function that retrieves a user by username from the database.
 * # Arguments
 * `target_username` - A string slice representing the username of the user to be retrieved.
 * # Returns
 * An Option<User> which is Some(User) if found, or None if no user with the given username exists.
 */
pub fn find_user_by_username(target_username: &str) -> Option<User> {
    use crate::schema::users::dsl::*;

    let connection = &mut establish_connection();

    let result = users
        .filter(username.eq(target_username))
        .first::<User>(connection)
        .optional()
        .expect("Error loading user");
    result
}

/**
 * Repository level function that retrieves a user by ID from the database.
 * # Arguments
 * `target_id` - An integer representing the ID of the user to be retrieved.
 * # Returns
 * An Option<User> which is Some(User) if found, or None if no user with the given ID exists.
 */
pub fn find_user_by_id(target_id: i32) -> Option<User> {
    use crate::schema::users::dsl::*;

    let connection = &mut establish_connection();

    let result = users
        .filter(id.eq(target_id))
        .first::<User>(connection)
        .optional()
        .expect("Error loading user");

    result
}
