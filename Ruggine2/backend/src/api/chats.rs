use actix_web::{ HttpRequest, HttpResponse, Responder, get, post, delete, web::{ self, Json } };
use crate::{ AppState, auth::extractor::extract_claims_from_request };
use serde::{ Deserialize, Serialize };
use actix_web::web::Path;

/**
 * API endpoint to get all chats for the authenticated user.
 * # Arguments
 * `req` - The HTTP request containing authentication headers.
 * # Returns
 * An HttpResponse containing the list of chats in JSON format or an error response.
 */
#[get("/")]
pub async fn get_chats(req: HttpRequest) -> impl Responder {
    println!("GET /api/chats/ called");
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(claims) => {
            let user_id: i32 = claims.sub.parse().unwrap_or(0);
            let chats = crate::model::chats::get_user_chats(user_id);
            HttpResponse::Ok().json(chats)
        }
        Err(err_msg) => { HttpResponse::Unauthorized().body(err_msg) }
    }
}

/// Payload structure for creating a new group chat, containing the group name
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNewGroupPayload {
    pub group_name: String,
}

/**
 * API endpoint to create a new group chat.
 * # Arguments
 * `req` - The HTTP request containing authentication headers.
 * `body` - The JSON payload containing the group name.
 * # Returns
 * An HttpResponse containing the new chat ID or an error response.
 */
#[post("/new_group")]
pub async fn new_group_chat(req: HttpRequest, body: Json<CreateNewGroupPayload>) -> impl Responder {
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(claims) => {
            let user_id_: i32 = claims.sub.parse().unwrap_or(0);
            if user_id_ == 0 {
                return HttpResponse::BadRequest().body("USER_NOT_AUTHENTICATED_ERROR");
            } else {
                let create_group_res = crate::model::chats::create_group_chat(
                    user_id_,
                    body.group_name.clone()
                );
                match create_group_res {
                    Ok(val) => {
                        return HttpResponse::Ok().body(val.to_string());
                    }
                    Err(e) => {
                        return HttpResponse::BadRequest().body(e);
                    }
                }
            }
        }
        Err(e) => {
            return HttpResponse::BadRequest().body(e);
        }
    }
}

/**
 * API endpoint to create a new private chat with another user.
 * # Arguments
 * `req` - The HTTP request containing authentication headers.
 * `path` - The other user's ID as a path parameter.
 * `chat_server_data` - Shared application state for WebSocket server.
 * # Returns
 * An HttpResponse containing the new chat details in JSON format or an error response.
 */
#[get("/new_private/{other_user_id}")]
pub async fn new_private_chat(
    req: HttpRequest,
    path: Path<i32>,
    chat_server_data: web::Data<AppState>
) -> impl Responder {
    let other_user_id: i32 = path.into_inner();
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(claims) => {
            let user_id_: i32 = claims.sub.parse().unwrap_or(0);
            if user_id_ == 0 {
                return HttpResponse::BadRequest().body("USER_NOT_FOUND_ERROR");
            }
            let create_res = crate::model::chats::create_private_chat_between_users(
                user_id_,
                other_user_id
            );
            match create_res {
                Ok(val) => {
                    let event_type = crate::web_socket::WsEventType::NewChat;
                    let msg = crate::web_socket::ServerWsMessage {
                        event_type,
                        payload: val.clone(),
                    };
                    let chat_server = &chat_server_data.chat_server;
                    chat_server.lock().unwrap().send_to_users(&[other_user_id], &serde_json::to_string(&msg).unwrap());
                    return HttpResponse::Ok().json(val);
                }
                Err(e) => {
                    return HttpResponse::BadRequest().body(e);
                }
            }
        }
        Err(e) => { HttpResponse::Unauthorized().body(e) }
    }
}

/**
 * API endpoint to get members and pending invites for a chat.
 * # Arguments
 * `req` - The HTTP request containing authentication headers.
 * `path` - The chat ID as a path parameter.
 * # Returns
 * An HttpResponse containing the list of members and invites in JSON format or an error response.
 */
#[get("/members/{chat_id}")]
pub async fn get_chat_members(req: HttpRequest, path: Path<i32>) -> impl Responder {
    let chat_id: i32 = path.into_inner();
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(claims) => {
            let user_id: i32 = claims.sub.parse().unwrap_or(0);
            if user_id == 0 {
                return HttpResponse::Unauthorized().body("USER_NOT_AUTHENTICATED");
            }
            match crate::model::chats::is_user_part_of_chat(user_id, chat_id) {
                Ok(is_part) => {
                    if !is_part {
                        return HttpResponse::Forbidden().body("USER_NOT_PART_OF_CHAT");
                    }
                }
                Err(e) => return HttpResponse::InternalServerError().body(e),
            }
            let members = crate::model::chats::get_chat_members_and_invites(chat_id);
            match members {
                Ok(members) => HttpResponse::Ok().json(members),
                Err(e) => HttpResponse::InternalServerError().body(e),
            }
        }
        Err(err_msg) => HttpResponse::Unauthorized().body(err_msg),
    }
}

/**
 * API endpoint to remove a member from a chat (admin only).
 * # Arguments
 * `req` - The HTTP request containing authentication headers.
 * `path` - The chat ID and member user ID as path parameters.
 * # Returns
 * An HttpResponse indicating success or an error response.
 */
#[delete("/members/{chat_id}/{user_id}")]
pub async fn remove_chat_member(req: HttpRequest, path: Path<(i32, i32)>) -> impl Responder {
    let (chat_id, member_user_id) = path.into_inner();
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(claims) => {
            let remover_user_id: i32 = claims.sub.parse().unwrap_or(0);
            if remover_user_id == 0 {
                return HttpResponse::Unauthorized().body("USER_NOT_AUTHENTICATED");
            }
            match crate::model::chat_components::remove_member_from_chat(chat_id, member_user_id, remover_user_id) {
                Ok(_) => {
                    let group_name = crate::repository::chats::get_chat_by_id(chat_id)
                        .and_then(|chat| chat.group_name)
                        .unwrap_or("the group".to_string());
                    let event_type = crate::web_socket::WsEventType::RemovedFromGroup;
                    let payload = serde_json::json!({
                        "chat_id": chat_id,
                        "message": format!("You have been removed from the group '{}'", group_name)
                    });
                    let msg = crate::web_socket::ServerWsMessage {
                        event_type,
                        payload: payload.to_string(),
                    };
                    let chat_server_data = req.app_data::<web::Data<AppState>>().unwrap();
                    let chat_server = &chat_server_data.chat_server;
                    chat_server.lock().unwrap().send_to_users(&[member_user_id], &serde_json::to_string(&msg).unwrap());
                    HttpResponse::Ok().body("Member removed")
                }
                Err(e) => HttpResponse::Forbidden().body(e),
            }
        }
        Err(err_msg) => HttpResponse::Unauthorized().body(err_msg),
    }
}
