use actix_web::{ HttpRequest, HttpResponse, Responder, get, post, web::{ self, Json } };
use serde::{ Deserialize, Serialize };
use actix_web::web::Path;
use crate::{ AppState, auth::extractor::extract_claims_from_request };

/// function to get ALL the chats for the authenticated user
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

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNewGroupPayload {
    pub group_name: String,
}

/// API endpoint to create a new group chat
/// # Arguments
/// `group_name` - the name of the new group chat
/// Returns
/// HttpResponse indicating success or failure
/// SUCCESS: returns the ID of the newly created group chat
/// FAILURE: returns an error message
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

/// API endpoint to create a new private chat
/// !!!
/// NOTE: we have to understand HOW to create/ WHEN to create the private chats
/// --> when "selecting" a user
/// !!!
/// #Arguments
/// `other_user_id` - the ID of the other user to create the private chat with
/// Returns
/// HttpResponse indicating success or failure
/// SUCCESS: returns the ID of the newly created private chat
/// FAILURE: returns an error message
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
            // we can now create the private chat between user_id_ and other_user_id :
            let create_res = crate::model::chats::create_private_chat_between_users(
                user_id_,
                other_user_id
            );
            match create_res {
                Ok(val) => {
                    // we notify the other user (if connected) that a new private chat has been created
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
