use std::collections::HashMap;
use qstring::QString;

/// Extracts JWT claims from an HTTP request.
/// Supports both Authorization header (Bearer token) and query parameter (?token=) authentication.
/// # Arguments
/// `req` - The Actix Web HTTP request.
/// # Returns
/// A Result containing Claims on success, or an error message on failure.
pub fn extract_claims_from_request(
    req: &actix_web::HttpRequest
) -> Result<crate::auth::Claims, String> {
    let token_owned: String =
        if let Some(auth_header) = req.headers().get("Authorization") {
            let auth_str = auth_header
                .to_str()
                .map_err(|_| "Invalid Authorization header encoding")?;
            auth_str.trim_start_matches("Bearer ").trim().to_string()
        } else {
            let query_string = req.query_string();
            let params: HashMap<String, String> = QString::from(query_string).into_iter().collect();

            match params.get("token") {
                Some(t) => t.clone(),
                None => {
                    return Err(
                        "Missing Authorization header or 'token' query parameter".to_string()
                    );
                }
            }
        };
    super::verify_token(&token_owned)
}