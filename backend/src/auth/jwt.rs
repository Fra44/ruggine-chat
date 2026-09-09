use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use chrono::{Duration, Utc};

/// Secret key for signing JWTs.
/// NOTE: In production, this should be loaded from environment variables or a secure key store.
const JWT_SECRET: &[u8] = b"your-secret-key-xd-xd-xd";

/// Token expiration time in hours.
const TOKEN_EXPIRATION_HOURS: i64 = 6;

/// JWT Claims structure, representing the data stored in the token.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub username: String,
    pub exp: i64,
    pub iat: i64,
}

/// Create a JWT token for a user.
/// # Arguments
/// `user_id` - The user ID to include in the token.
/// `username` - The username to include in the token.
/// # Returns
/// A Result containing the JWT token string or an error message.
pub fn create_token(user_id: i32, username: &str) -> Result<String, String> {
    let now = Utc::now();
    let expiration = now + Duration::hours(TOKEN_EXPIRATION_HOURS);

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        exp: expiration.timestamp(),
        iat: now.timestamp(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET),
    )
    .map_err(|e| format!("Token creation failed: {}", e))
}

/// Verify and decode a JWT token.
/// # Arguments
/// `token` - The JWT token string to verify.
/// # Returns
/// A Result containing the Claims if valid, or an error message.
pub fn verify_token(token: &str) -> Result<Claims, String> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(JWT_SECRET),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|e| format!("Token verification failed: {}", e))
}
