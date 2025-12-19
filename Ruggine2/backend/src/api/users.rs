use std::fmt;
use actix_web::{
    HttpResponse, Responder, body, error::ResponseError, get, http::{ StatusCode, header::ContentType }, post, put, web::{ Data, Json, Path, Query }
};
use serde::{ Deserialize, Serialize };
use crate::repository::args::{ CreateUser, LoginUser };

#[derive(Debug)]
pub enum UserError {
    UserNotFound,
    UsernameAlreadyExists,
    BadUserRequest,
    InvalidCredentials,
    RegistrationFailed(String),
}

/// Implement Display for UserError to provide error messages
impl fmt::Display for UserError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            UserError::UserNotFound => write!(f, "User not found"),
            UserError::UsernameAlreadyExists => write!(f, "Username already exists"),
            UserError::BadUserRequest => write!(f, "Bad user request"),
            UserError::InvalidCredentials => write!(f, "Invalid credentials"),
            UserError::RegistrationFailed(msg) => write!(f, "Registration failed: {}", msg),
        }
    }
}

/// Implement ResponseError for UserError to convert "application" errors into HTTP responses
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
            UserError::InvalidCredentials => StatusCode::UNAUTHORIZED,
            UserError::RegistrationFailed(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

/// Response structure for successful login
#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user_id: i32,
    pub username: String,
}

/// Response structure for successful registration
#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterResponse {
    pub user_id: i32,
    pub username: String,
    pub message: String,
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
    }

    match crate::repository::users::register_user(body.into_inner()) {
        Ok(user) => {
            let response = RegisterResponse {
                user_id: user.id,
                username: user.username,
                message: "User registered successfully".to_string(),
            };
            Ok(HttpResponse::Created().json(response))
        }
        Err(e) => Err(UserError::RegistrationFailed(e)),
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
            // Verify the password using bcrypt
            match crate::auth::verify_password(&body.plain_password, &user.hashed_password) {
                Ok(true) => {
                    // Create JWT token
                    match crate::auth::create_token(user.id, &user.username) {
                        Ok(token) => {
                            let response = LoginResponse {
                                token,
                                user_id: user.id,
                                username: user.username,
                            };
                            Ok(HttpResponse::Ok().json(response))
                        }
                        Err(_) => Err(UserError::BadUserRequest),
                    }
                }
                Ok(false) => Err(UserError::InvalidCredentials),
                Err(_) => Err(UserError::BadUserRequest),
            }
        }
        None => Err(UserError::UserNotFound),
    }
}


/// # `NOT USED ANYMORE`  
/// API endpoint to get the username for a given user ID.
/// # Arguments
/// `user_id` - The ID of the user as a path parameter.
/// # Returns
/// An HttpResponse containing the username in JSON format or an appropriate error.
#[get("/{id}")]
pub async fn get_username_from_id(user_id: Path<i32>) -> impl Responder {
    let user_id_ = user_id.into_inner();
    let get_username_res = crate::model::users::get_username_for_user_id(user_id_);
    match get_username_res {
        Ok(username) => {
            return Ok(HttpResponse::Ok().json(username));
        }
        Err(err_str) => {
            if err_str == "USER_NOT_FOUND" {
                return Err(UserError::UserNotFound);
            } else {
                return Err(UserError::BadUserRequest);
            }
        }
    }
}

#[get("/by_username/{username}")]
pub async fn get_user_id_by_username(username: Path<String>) -> impl Responder {
    let username_ = username.into_inner();
    match crate::repository::users::find_user_by_username(&username_) {
        Some(user) => Ok(HttpResponse::Ok().json(user.id)),
        None => Err(UserError::UserNotFound),
    }
}

/// Search users by prefix (protected)
#[derive(Deserialize)]
pub struct SearchQuery {
    pub prefix: String,
    pub limit: Option<i32>,
}

#[get("/search")] 
pub async fn search_users_by_prefix(q: Query<SearchQuery>) -> impl Responder {
    let prefix = q.prefix.clone();
    let limit = q.limit.unwrap_or(5) as i64;
    match crate::repository::users::search_usernames_by_prefix(&prefix, limit) {
        Ok(list) => Ok(HttpResponse::Ok().json(list)),
        Err(e) => {
            log::error!("search_users_by_prefix error: {}", e);
            Err(UserError::BadUserRequest)
        }
    }
}

/// Debug endpoint (public) - returns the Authorization header value and logs it.
#[get("/search_debug")] 
pub async fn search_users_debug(req: actix_web::HttpRequest, q: Query<SearchQuery>) -> impl Responder {
    let auth_hdr = req.headers().get("authorization").and_then(|v| v.to_str().ok()).map(|s| s.to_string());
    let _ = &auth_hdr; // no debug logging
    let resp = serde_json::json!({ "authorization": auth_hdr });
    HttpResponse::Ok().json(resp)
}
