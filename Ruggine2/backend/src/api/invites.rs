use actix_web::{
    HttpRequest,
    HttpResponse,
    Responder,
    get,
    post,
    web::{ self, Json, Path },
};
use serde::{ Deserialize, Serialize };
use crate::{
    AppState,
    auth::extractor::extract_claims_from_request,
};

/// Payload structure for sending an invite, containing chat and receiver IDs
#[derive(Debug, Serialize, Deserialize)]
pub struct SendInvitePayload {
    pub chat_id: i32,
    pub receiver_id: i32,
}

/**
 * API endpoint to get all invites for the authenticated user.
 * # Arguments
 * `req` - The HTTP request containing authentication headers.
 * # Returns
 * An HttpResponse containing a list of invites in JSON format or an error response.
 */
#[get("/")]
pub async fn get_user_invites(req: HttpRequest) -> impl Responder {
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(claims) => {
            let user_id: i32 = claims.sub.parse().unwrap_or(0);
            let get_user_inv_res = crate::model::invites::get_user_invites(user_id);
            match get_user_inv_res {
                Ok(invites) => { HttpResponse::Ok().json(invites) }
                Err(err_msg) => { HttpResponse::InternalServerError().body(err_msg) }
            }
        }
        Err(err_msg) => { HttpResponse::Unauthorized().body(err_msg) }
    }
}

/**
 * API endpoint to invite a user to a chat.
 * # Arguments
 * `req` - The HTTP request containing authentication headers.
 * `body` - The JSON payload containing chat_id and receiver_id.
 * `chat_server_data` - Shared application state for WebSocket server.
 * # Returns
 * An HttpResponse indicating success or an error response.
 */
#[post("/create")]
pub async fn invite_user(
    req: HttpRequest,
    body: Json<SendInvitePayload>,
    chat_server_data: web::Data<AppState>
) -> impl Responder {
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(claims) => {
            let user_id_sender: i32 = claims.sub.parse().unwrap_or(0);
            if user_id_sender == 0 {
                return HttpResponse::BadRequest().body("USER_NOT_AUTHENTICATED_ERROR");
            }
            let user_id_receiver: i32 = body.receiver_id;
            let chat_id_: i32 = body.chat_id;
            let create_invite_res = crate::model::invites::create_invite_for_user(
                user_id_sender,
                user_id_receiver,
                chat_id_
            );

            if let Ok(invite_id) = &create_invite_res {
                let chat_server = &chat_server_data.chat_server;
                let chat_server_locked = chat_server.lock().unwrap();
                let event_type = crate::web_socket::WsEventType::NewInvite;
                let mut payload_json = None;
                match crate::repository::invites::get_invite_by_id(*invite_id) {
                    Ok(Some(inv)) => {
                        let invite_dto = crate::model::invites::map_invite_to_dto(inv);
                        let msg = crate::web_socket::ServerWsMessage {
                            event_type: event_type.clone(),
                            payload: invite_dto,
                        };
                        payload_json = Some(serde_json::to_string(&msg).unwrap_or_else(|e| {
                            log::error!("Failed to serialize invite DTO: {}", e);
                            "{}".to_string()
                        }));
                    }
                    Ok(None) => {
                        log::warn!("Invite {} created but not found by id for user {}", invite_id, user_id_receiver);
                    }
                    Err(e) => {
                        log::warn!("Failed to fetch invite {}: {}", invite_id, e);
                    }
                }

                if payload_json.is_none() {
                    let fallback_msg = crate::web_socket::ServerWsMessage {
                        event_type: event_type.clone(),
                        payload: serde_json::json!({
                            "id": invite_id,
                            "chat_id": chat_id_,
                            "sender_id": user_id_sender,
                            "receiver_id": user_id_receiver,
                            "accepted": null,
                            "sent_at": chrono::Utc::now().to_rfc3339(),
                        }),
                    };
                    payload_json = Some(serde_json::to_string(&fallback_msg).unwrap_or_else(|e| {
                        log::error!("Failed to serialize fallback invite payload: {}", e);
                        "{}".to_string()
                    }));
                }

                if let Some(json) = payload_json {
                    chat_server_locked.send_to_users(&[user_id_receiver], &json);
                }
            }

            match create_invite_res {
                Ok(_) => { HttpResponse::Ok().body("INVITE_SENT_SUCCESSFULLY") }
                Err(err_msg) => { HttpResponse::InternalServerError().body(err_msg) }
            }
        }
        Err(err_msg) => { HttpResponse::Unauthorized().body(err_msg) }
    }
}

/**
 * API endpoint to accept an invite.
 * # Arguments
 * `req` - The HTTP request containing authentication headers.
 * `path` - The invite ID as a path parameter.
 * `chat_server_data` - Shared application state for WebSocket server.
 * # Returns
 * An HttpResponse containing the new chat ID or an error response.
 */
#[get("/accept/{invite_id}")]
pub async fn accept_invite(
    req: HttpRequest,
    path: Path<i32>,
    chat_server_data: web::Data<AppState>
) -> impl Responder {
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(_claims) => {
            let invite_id: i32 = path.into_inner();
            let user_id_: i32 = _claims.sub.parse().unwrap_or(0);
            if user_id_ == 0 {
                return HttpResponse::BadRequest().body("USER_NOT_AUTHENTICATED_ERROR");
            }
            let accept_invite_res = crate::model::invites::accept_invite_model(invite_id, user_id_);
            match accept_invite_res {
                Ok(new_id) => { 
                    let chat_server = &chat_server_data.chat_server;
                    let chat_server_locked = chat_server.lock().unwrap();
                    let event_type = crate::web_socket::WsEventType::NewChat;
                    let new_chat = crate::repository::chats::get_chat_by_id(new_id);
                    
                    if let Some(chat) = new_chat {
                        let chat_dto = crate::model::chats::map_chat_to_dto(chat);
                        let msg = crate::web_socket::ServerWsMessage {
                            event_type,
                            payload: chat_dto,
                        };
                        chat_server_locked.send_to_users(
                            &[user_id_],
                            &serde_json::to_string(&msg).unwrap()
                        );
                    }
                    
                    HttpResponse::Ok().body(new_id.to_string()) }
                Err(err_msg) => { HttpResponse::InternalServerError().body(err_msg) }
            }
        }
        Err(err_msg) => { HttpResponse::Unauthorized().body(err_msg) }
    }
}

/**
 * API endpoint to reject an invite.
 * # Arguments
 * `req` - The HTTP request containing authentication headers.
 * `path` - The invite ID as a path parameter.
 * # Returns
 * An HttpResponse indicating success or an error response.
 */
#[get("/reject/{invite_id}")]
pub async fn reject_invite(req: HttpRequest, path: Path<i32>) -> impl Responder {
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(_claims) => {
            let invite_id: i32 = path.into_inner();
            let user_id_: i32 = _claims.sub.parse().unwrap_or(0);
            if user_id_ == 0 {
                return HttpResponse::BadRequest().body("USER_NOT_AUTHENTICATED_ERROR");
            }
            let reject_invite_res = crate::model::invites::reject_invite_model(invite_id, user_id_);
            match reject_invite_res {
                Ok(_) => { HttpResponse::Ok().body("INVITE_REJECTED_SUCCESSFULLY") }
                Err(err_msg) => { HttpResponse::InternalServerError().body(err_msg) }
            }
        }
        Err(err_msg) => { HttpResponse::Unauthorized().body(err_msg) }
    }
}
