use actix_web::{
    HttpRequest,
    HttpResponse,
    Responder,
    get,
    web::{ Path },
};

use crate::auth::extractor::extract_claims_from_request;

/// Struct for the path parameter
#[derive(serde::Deserialize)]
pub struct ChatIdPath {
    chat_id: i32,
}

/// API endpoint to get chat components for a specific chat
/// GET /api/chat_components/{chat_id}/
#[get("/{chat_id}/")]
pub async fn get_chat_components_handler(
    path: Path<ChatIdPath>,
    req: HttpRequest,
) -> impl Responder {
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(claims) => {
            let user_id: i32 = claims.sub.parse().unwrap_or(0);
            if user_id == 0 {
                return HttpResponse::Unauthorized().json("Invalid user ID");
            }

            let chat_id = path.chat_id;

            // TODO: Check if user is member of the chat
            // For now, assume they can access if authenticated

            let components = crate::model::chat_components::get_chat_components(chat_id);

            HttpResponse::Ok().json(components)
        }
        Err(err_msg) => HttpResponse::Unauthorized().body(err_msg),
    }
}