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
    pub chat_id: i32,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNewGroupPayload {
    pub group_name: String,
}

/// API endpoint to create a new group chat
#[post("/new_group")]
pub async fn post_new_group_chat(
    req: HttpRequest,
    body: Json<CreateNewGroupPayload>
) -> impl Responder {
    return HttpResponse::NotImplemented().body("NOT_IMPLEMENTED_YET");
}

/// API endpoint to create a new private chat
/// !!!
/// NOTE: we have to understand HOW to create/ WHEN to create the private chats
/// --> when "selecting" a user
/// !!!
#[get("/new_private/{other_user_id}")]
pub async fn new_private_chat(req: HttpRequest, path: Path<i32>) -> impl Responder {
    let other_user_id: i32 = path.into_inner();
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(claims) => {
            let user_id_: i32 = claims.sub.parse().unwrap_or(0);
            if user_id_ == 0 {
                return HttpResponse::BadRequest().body("USER_NOT_FOUND_ERROR");
            }
            // we can now create the private chat between user_id_ and other_user_id :
            let create_res = crate::model::chats::create_private_chat_between_users(
                user_id_,
                other_user_id
            );
            match create_res {
                Ok(()) => {
                    return HttpResponse::Ok().body("PRIVATE_CHAT_CREATED_SUCCESSFULLY");
                }
                Err(e) => {
                    return HttpResponse::BadRequest().body(e);
                }
            }
        }
        Err(e) => { HttpResponse::Unauthorized().body(e) }
    }
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
                        crate::model::messages::send_message(
                            user_id_,
                            chat_id,
                            body.content.clone()
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
