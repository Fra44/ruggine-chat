use crate::repository::users::{ find_user_by_id };

/**
 * Retrieves the username for a given user ID.
 * # Arguments
 * `user_id_` - The ID of the user whose username is to be retrieved.
 * # Returns
 * A Result<String, String> which is Ok(username) if the user is found,
 * Err("USER_NOT_FOUND") if the user does not exist.
 */
pub fn get_username_for_user_id(user_id_: i32) -> Result<String, String> {
    let user = find_user_by_id(user_id_);
    match user {
        Some(u) => {
            return Ok(u.username);
        }
        None => {
            return Err("USER_NOT_FOUND".to_string());
        }
    }
}
