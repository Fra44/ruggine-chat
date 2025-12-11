use std::{ fmt, path };
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
    web::{ Data, Json, Path },
};
use serde::{ Deserialize, Serialize };
use crate::{
    auth::{ Claims, extractor::extract_claims_from_request },
    model::{ chats::is_user_part_of_chat, messages::{ map_message_to_dto, map_messages_to_dto } },
    repository::args::{ CreateUser, LoginUser },
    schema::chat_components::user_id,
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
    body: Json<SendMessagePayload>
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
                            return HttpResponse::InternalServerError().body("MESSAGE_SENDING_FAILED");
                        }
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
