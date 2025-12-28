use actix_web::{
    HttpRequest,
    HttpResponse,
    Responder,
    web,
    get,
    post,
    web::{ Json, Path },
};
use serde::{ Deserialize, Serialize };
use crate::{
    AppState,
    auth::extractor::extract_claims_from_request,
    model::{ chats::is_user_part_of_chat, messages::map_messages_to_dto },
};

#[derive(Debug, Serialize, Deserialize)]
pub struct SendMessagePayload {
    pub content: String,
}

/// API endpoint to get all messages from a specific chat
#[get("/{chat_id}/messages")]
pub async fn get_chat_messages(req: HttpRequest, path: Path<i32>) -> impl Responder {
    let chat_id: i32 = path.into_inner();
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(claims) => {
            let user_id_: i32 = claims.sub.parse().unwrap_or(0);
            if user_id_ == 0 {
                return HttpResponse::BadRequest().body("USER_NOT_FOUND_ERROR");
            }
            let is_part_res = is_user_part_of_chat(user_id_, chat_id);
            match is_part_res {
                Ok(val) => {
                    if val == true {
                        let messages = map_messages_to_dto(
                            crate::repository::messages::get_messages_by_chat_id(chat_id)
                        );
                        HttpResponse::Ok().json(messages)
                    } else {
                        return HttpResponse::Unauthorized().body("USER_NOT_AUTHORIZED");
                    }
                }
                Err(e) => {
                    return HttpResponse::BadRequest().body(e);
                }
            }
        }
        Err(err_msg) => { HttpResponse::Unauthorized().body(err_msg) }
    }
}

/// API endpoint to send a message to a specific chat
#[post("/{chat_id}/messages")]
pub async fn post_chat_message(
    req: HttpRequest,
    path: Path<i32>,
    body: Json<SendMessagePayload>,
    chat_server_data: web::Data<AppState>
) -> impl Responder {
    let chat_id: i32 = path.into_inner();
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(claims) => {
            let user_id_: i32 = claims.sub.parse().unwrap_or(0);
            if user_id_ == 0 {
                return HttpResponse::BadRequest().body("USER_NOT_FOUND_ERROR");
            }
            let is_part_res = is_user_part_of_chat(user_id_, chat_id);
            match is_part_res {
                Ok(val) => {
                    if val == true {
                        let send_res = crate::model::messages::send_message(
                            user_id_,
                            chat_id,
                            body.content.clone()
                        );
                        if send_res.is_err() {
                            return HttpResponse::InternalServerError().body(
                                "MESSAGE_SENDING_FAILED"
                            );
                        }

                        // here we notify via WebSocket the new message to all chat participants
                        let chat_server = &chat_server_data.chat_server;
                        let event_type = crate::web_socket::WsEventType::NewMessage;
                        let msg_dto = send_res.unwrap();
                        let msg = crate::web_socket::ServerWsMessage {
                            event_type,
                            payload: msg_dto,
                        };

                        let users_in_chat_res = crate::model::chats::get_users_in_chat(chat_id);
                        if users_in_chat_res.is_err() {
                            return HttpResponse::InternalServerError().body(
                                "FAILED_RETRIEVING_CHAT_USERS"
                            );
                        }
                        let users_in_chat = users_in_chat_res.unwrap();
                        let chat_server_locked = chat_server.lock().unwrap();
                        chat_server_locked.send_to_users(
                            &users_in_chat,
                            &serde_json::to_string(&msg).unwrap()
                        );


                        HttpResponse::Ok().body("MESSAGE_SENT_SUCCESSFULLY")
                    } else {
                        return HttpResponse::Unauthorized().body("USER_NOT_AUTHORIZED");
                    }
                }
                Err(e) => {
                    return HttpResponse::BadRequest().body(e);
                }
            }
        }
        Err(err_msg) => { HttpResponse::Unauthorized().body(err_msg) }
    }
}
