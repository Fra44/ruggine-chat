use actix_web::HttpResponse;


/// Utility function to extract claims from the HttpRequest
/// Returns Claims on success, or an error message String on failure
pub fn extract_claims_from_request(req: &actix_web::HttpRequest) -> Result<crate::auth::Claims, String> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .ok_or("Missing Authorization header")?
        .to_str()
        .map_err(|_| "Invalid Authorization header")?;

    let token = auth_header
        .trim_start_matches("Bearer ")
        .trim();

    crate::auth::verify_token(token)
}   

