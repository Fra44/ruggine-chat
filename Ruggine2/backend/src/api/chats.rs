use std::fmt;
use actix_web::{
    HttpRequest, HttpResponse, Responder, body, error::ResponseError, get, http::{ StatusCode, header::ContentType }, post, put, web::{ Data, Json, Path }
};
use serde::{ Deserialize, Serialize };
use crate::{auth::{Claims, extractor::extract_claims_from_request}, model::chats::map_chats_to_dto, repository::args::{ CreateUser, LoginUser }};

/// function to get ALL the chats for the authenticated user
#[get("/")]
pub async fn get_chats(req: HttpRequest) -> impl Responder {
    let claims = extract_claims_from_request(&req);
    match claims {
        Ok(claims) => {
            let user_id: i32 = claims.sub.parse().unwrap_or(0);
            let chats = map_chats_to_dto(crate::repository::chats::get_chats_for_user(user_id));
            HttpResponse::Ok().json(chats)
        },
        Err(err_msg) => {
            HttpResponse::Unauthorized().body(err_msg)
        }
    }
}


