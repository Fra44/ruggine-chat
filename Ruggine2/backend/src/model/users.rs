use crate::repository::users::{ find_user_by_id };

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
