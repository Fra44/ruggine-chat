use bcrypt::{hash, verify};

/// Hash a plain password using bcrypt.
/// # Arguments
/// `password` - The plain password to hash
/// # Returns
/// A Result containing the hashed password or an error string
pub fn hash_password(password: &str) -> Result<String, String> {
    hash(password, 4).map_err(|e| format!("Password hashing failed: {}", e))
}

/// Verify a plain password against a hashed password.
/// # Arguments
/// `password` - The plain password to verify
/// `hash` - The hashed password to verify against
/// # Returns
/// A Result containing true if the password matches, false otherwise, or an error
pub fn verify_password(password: &str, hash: &str) -> Result<bool, String> {
    verify(password, hash).map_err(|e| format!("Password verification failed: {}", e))
}
