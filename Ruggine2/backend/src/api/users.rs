use std::fmt::Display;
use derive_more::Display;
use actix_web::{
    HttpResponse,
    body,
    error::ResponseError,
    get,
    http::{ StatusCode, header::ContentType },
    post,
    put,
    web::{ Data, Json, Path },
};
use serde::{ Deserialize, Serialize };
use crate::repository::args::{ CreateUser, LoginUser };

#[derive(Debug, Display)]
pub enum UserError {
    UserNotFound, // in case of login with wrong username (or password !!)
    UsernameAlreadyExists, // in case of trying to register with existing username,
    BadUserRequest, // general error if none of the above ones is matched
}

impl ResponseError for UserError {
    fn error_response(&self) -> HttpResponse<body::BoxBody> {
        HttpResponse::build(self.status_code())
            .insert_header(ContentType::json())
            .body(self.to_string())
    }

    fn status_code(&self) -> StatusCode {
        match *self {
            UserError::UserNotFound => StatusCode::NOT_FOUND,
            UserError::UsernameAlreadyExists => StatusCode::CONFLICT,
            UserError::BadUserRequest => StatusCode::BAD_REQUEST,
        }
    }
}

/**
 * API endpoint to register a new user.
 * # Arguments
 * `body` - A Json<CreateUser> struct containing the user registration details.
 */
#[post("/register")]
pub async fn register_user(body: Json<CreateUser>) -> Result<HttpResponse, UserError> {
    let user = crate::repository::users::find_user_by_username(&body.username);
    if let Some(_) = user {
        return Err(UserError::UsernameAlreadyExists);
    } else {
        crate::repository::users::register_user(body.into_inner());
        Ok(HttpResponse::Ok().body("User registered successfully"))
    }
}

/**
 * API endpoint to login as a user.
 * # Arguments
 * `body` - A Json<LoginUser> struct containing the user login details.
 */
#[post("/login")]
pub async fn login_user(body: Json<LoginUser>) -> Result<HttpResponse, UserError> {
    let user_opt = crate::repository::users::find_user_by_username(&body.username);
    match user_opt {
        Some(user) => {
            let hashed_input_password = format!("hashed_{}", body.hashed_password); // Placeholder for hashing logic
            if user.hashed_password == hashed_input_password {
                Ok(HttpResponse::Ok().body("Login successful"))
            } else {
                Err(UserError::UserNotFound)
            }
        }
        None => Err(UserError::UserNotFound),
    }
}
