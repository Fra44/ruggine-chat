use std::collections::HashMap;

use qstring::QString;

/// Utility function to extract claims from the HttpRequest
/// Returns Claims on success, or an error message String on failure
pub fn extract_claims_from_request(
    req: &actix_web::HttpRequest
) -> Result<crate::auth::Claims, String> {
    // Inizializziamo il token come String che conterrà il token (owned data)
    let token_owned: String =
        // 1. Tenta di estrarre dall'Header Authorization (Standard REST)
        if let Some(auth_header) = req.headers().get("Authorization") {
            let auth_str = auth_header
                .to_str()
                .map_err(|_| "Invalid Authorization header encoding")?;

            // CLONIAMO il token dall'header
            auth_str.trim_start_matches("Bearer ").trim().to_string() // <-- Clonazione per proprietà
        } else {
            // 2. Tenta di estrarre dal Query Parameter 'token' (Standard WS)
            let query_string = req.query_string();

            // Creiamo la HashMap (params)
            let params: HashMap<String, String> = QString::from(query_string).into_iter().collect();

            match params.get("token") {
                Some(t) => t.clone(), // <-- CLONIAMO IL VALORE DALLA MAPPA
                None => {
                    return Err(
                        "Missing Authorization header or 'token' query parameter".to_string()
                    );
                }
            }
        };

    // 3. Verifica il token estratto (ora è una String owned)
    // Passiamo il riferimento (&str) alla funzione verify_token
    super::verify_token(&token_owned)
}
