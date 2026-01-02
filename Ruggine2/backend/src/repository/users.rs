use super::db::establish_connection;
use super::args::{ CreateUser };
use crate::schema::users;
use diesel::prelude::*;

/**
 * Struct representing a new user to be inserted into the database.
 */
#[derive(Insertable)]
#[table_name = "users"]
pub struct NewUser<'a> {
    pub username: &'a str,
    pub hashed_password: &'a str,
}

/**
 * Struct representing a user retrieved from the database.
 * (used also to MODIFY an existing user)
 */
#[derive(Queryable, Debug, AsChangeset, serde::Serialize)]
pub struct User {
    pub id: i32,
    pub username: String,
    #[serde(skip)]
    pub created_at: Option<chrono::NaiveDateTime>, 
    #[serde(skip)]
    pub hashed_password: String,
}

/**
 * Repository level function that inserts a new user into the database.
 * Handles password hashing before storing and returns the created user.
 * # Arguments
 * `user` - A CreateUser struct containing the username and plain password of the user to be registered.
 * # Returns
 * Result<User, String> - The created user on success, or an error message on failure
 */
pub fn register_user(user: CreateUser) -> Result<User, String> {
    println!("Registering new user with username: {:?}", user.username);

    use crate::schema::users::dsl::*;

    let mut connection = establish_connection();

    let hashed_pass = crate::auth::hash_password(&user.plain_password)?;

    let new_user = NewUser {
        username: &user.username,
        hashed_password: &hashed_pass,
    };

    // Insert the new user into the database
    diesel::insert_into(users)
        .values(&new_user)
        .execute(&mut connection)
        .map_err(|e| format!("Error saving new user: {}", e)
    )?;

    // Retrieve and return the newly created user
    find_user_by_username(&user.username)
        .ok_or_else(|| "Failed to retrieve newly created user".to_string())
}

/**
 * Repository level function that retrieves a user by username from the database.
 * Performs a case-sensitive search for exact username match.
 * # Arguments
 * `target_username` - A string slice representing the username of the user to be retrieved.
 * # Returns
 * An Option<User> which is Some(User) if found, or None if no user with the given username exists.
 */
pub fn find_user_by_username(target_username: &str) -> Option<User> {
    use crate::schema::users::dsl::*;

    let mut connection = establish_connection();

    let result = users
        .filter(username.eq(target_username))
        .first::<User>(&mut connection)
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

    let mut connection = establish_connection();

    let result = users
        .filter(id.eq(target_id))
        .first::<User>(&mut connection)
        .optional()
        .expect("Error loading user");

    result
}

/**
 * Search for users by username prefix using case-insensitive pattern matching.
 * Returns up to the specified limit of results, useful for user search/autocomplete features.
 * # Arguments
 * `prefix` - The username prefix to search for (case-insensitive)
 * `limit_results` - Maximum number of results to return
 * # Returns
 * Result<Vec<User>, String> - Vector of matching users on success, or error message on failure
 */
pub fn search_users_by_prefix(prefix: &str, limit_results: i64) -> Result<Vec<User>, String> {
    use crate::schema::users::dsl::*;
    let mut connection = establish_connection();

    let pattern = format!("{}%", prefix);
    let results = users
        .filter(username.ilike(pattern))
        .limit(limit_results)
        .load::<User>(&mut connection)
        .map_err(|e| format!("DB error searching users: {}", e))?;

    Ok(results)
}
