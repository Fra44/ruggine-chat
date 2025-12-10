use std::fmt;
use actix_web::{
    HttpResponse,
    body,
    error::ResponseError,
    get,
    http::{ StatusCode, header::ContentType },
    post,
    put,
    web::{ Data, Json, Path },
};
use serde::{ Deserialize, Serialize };
use crate::repository::args::{ CreateUser, LoginUser };


/// function inserted to test if the authentication middleware is working properly -- TO REMOVE
#[post("/test")]
pub async fn test() -> Result<HttpResponse, actix_web::Error> {
    Ok(HttpResponse::Ok().body("Chat API is working"))
}