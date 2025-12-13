use std::fmt;
use actix_web::{
    HttpRequest,
    HttpResponse,
    Responder,
    body,
    error::ResponseError,
    get,
    http::{ StatusCode, header::ContentType },
    post,
    put,
    web::{ self, Data, Json, Path },
};
use serde::{ Deserialize, Serialize };
use crate::{
    AppState,
    auth::{ Claims, extractor::extract_claims_from_request },
    model::chats::map_chats_to_dto,
    repository::args::{ CreateUser, LoginUser },
};

#[derive(Debug, Serialize, Deserialize)]
pub struct SendInvitePayload {
    pub chat_id: i32,
    pub receiver_id: i32,
}

/// API endpoint to get all invites for the authenticated user
/// # Returns
/// HttpResponse containing a list of invites or an error message
/// SUCCESS: returns a JSON array of invites
/// FAILURE: returns an error message
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

/// API endpoint to invite a user to a chat
/// # Arguments
/// `chat_id` - the ID of the chat to which the user is invited
/// `receiver_id` - the ID of the user to be invited
/// Returns
/// HttpResponse indicating success or failure
/// SUCCESS: returns a success message
/// FAILURE: returns an error message
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

            // after the actual modifies in the DB, we add logic to notify the user through WebSocket about the new state :
            if let Ok(invite_id) = &create_invite_res {
                // we notify the user through WebSocket about the new invite
                let chat_server = &chat_server_data.chat_server;
                let chat_server_locked = chat_server.lock().unwrap();
                let event_type = crate::web_socket::WsEventType::NewInvite;
                let msg = crate::web_socket::ServerWsMessage {
                    event_type,
                    payload: serde_json::json!({
                        "id": invite_id,
                        "chat_id": chat_id_,
                        "sender_id": user_id_sender,
                        "receiver_id": user_id_receiver,
                        "accepted": null,
                        "sent_at": chrono::Utc::now().to_rfc3339(),
                    }),
                };
                chat_server_locked.send_to_users(
                    &[user_id_receiver],
                    &serde_json::to_string(&msg).unwrap()
                );
            }

            match create_invite_res {
                Ok(_) => { HttpResponse::Ok().body("INVITE_SENT_SUCCESSFULLY") }
                Err(err_msg) => { HttpResponse::InternalServerError().body(err_msg) }
            }
        }
        Err(err_msg) => { HttpResponse::Unauthorized().body(err_msg) }
    }
}

/// API endpoint to accept an invite
/// # Arguments
/// `invite_id` - the ID of the invite to accept
/// Returns
/// HttpResponse indicating success or failure
/// SUCCESS: returns the ID of the newly joined chat
/// FAILURE: returns an error message
#[get("/accept/{invite_id}")]
pub async fn accept_invite(req: HttpRequest, path: Path<i32>) -> impl Responder {
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
                Ok(new_id) => { HttpResponse::Ok().body(new_id.to_string()) }
                Err(err_msg) => { HttpResponse::InternalServerError().body(err_msg) }
            }
        }
        Err(err_msg) => { HttpResponse::Unauthorized().body(err_msg) }
    }
}

/// API endpoint to reject an invite
/// # Arguments
/// `invite_id` - the ID of the invite to reject
/// Returns
/// HttpResponse indicating success or failure
/// SUCCESS: returns a success message
/// FAILURE: returns an error message
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
