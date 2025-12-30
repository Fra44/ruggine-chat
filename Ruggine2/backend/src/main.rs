mod schema;
mod model;
mod api;
mod repository;
mod auth;
mod monitor_cpu;
mod web_socket;

// imports from web_socket module
use web_socket::{ WsConn, ChatServer };

use std::sync::{ Arc, Mutex };
use actix_web_actors::ws; // Necessario per l'handler WS
use actix_cors::Cors;
use actix_web::{
    App,
    HttpServer,
    web,
    middleware::Logger,
    http::header,
    HttpRequest,
    Result as ActixResult,
};
use std::io::Result;

/// Application state shared across handlers
pub struct AppState {
    pub chat_server: Arc<Mutex<ChatServer>>,
    // ... if others "global data" nedd to be added, do it HERE
}

/// WebSocket route handler, it upgrades HTTP connection to WebSocket !!
/// (the incoming request will upgrade to WS)
async fn ws_route(
    req: HttpRequest,
    stream: web::Payload,
    data: web::Data<AppState>
) -> ActixResult<actix_web::HttpResponse> {
    let claims = crate::auth::extractor::extract_claims_from_request(&req);
    match claims {
        Ok(c) => {
            // check for user id validity
            let user_id = c.sub.parse::<i32>().unwrap_or(0);
            if user_id == 0 {
                log::error!("WebSocket connection with invalid user ID!");
                return Err(actix_web::error::ErrorUnauthorized("Invalid user ID"));
            }

            // we can start the WebSocket connection succesfully
            return ws::start(
                WsConn {
                    id: user_id,
                    addr: data.chat_server.clone(),
                },
                &req,
                stream
            );
        }
        Err(e) => {
            log::error!("WebSocket connection authentication failed: {}", e);
            return Err(actix_web::error::ErrorUnauthorized("Authentication failed"));
        }
    }
}

/// main function, it starts the backend server

#[actix_web::main]
async fn main() -> Result<()> {
    unsafe {
        std::env::set_var("RUST_LOG", "debug");
        std::env::set_var("RUST_BACKTRACE", "1");
        env_logger::init();
    }

    let chat_server = Arc::new(Mutex::new(ChatServer::new()));
    let to_use = chat_server.clone();
    // creiamo un thread, che dopo 1 minuto dall'avvio del server, tramite il websocket dell'utente 1,
    // invia un messaggio di tipo NEW_MESSAGE importando da web_socket il ServerWsMessage e WsEventType:
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(60));
        let my_type = web_socket::WsEventType::NewMessage;
        let msg = web_socket::ServerWsMessage {
            event_type: my_type,
            payload: serde_json::json!({
                "chat_id": 1,
                "message_id": 999,
                "sender_id": 1,
                "content": "This is a test message sent after 1 minute from server start.".to_string(),
                "sent_at": chrono::Utc::now().to_rfc3339(),
            }),
        };
        to_use.lock().unwrap().send_to_users(&[1], &serde_json::to_string(&msg).unwrap());
    });

    HttpServer::new(move || {
        let logger = Logger::default();
        let auth_middleware = auth::Auth;
        let cors = Cors::default()
            .allowed_origin("http://localhost:5173")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![header::AUTHORIZATION, header::CONTENT_TYPE])
            .max_age(3600);

        App::new()
            .app_data(web::Data::new(AppState { chat_server: chat_server.clone() }))
            .wrap(logger)
            .wrap(cors)
            // Routes for /api/users (register and login are public, get_user_id_by_username is protected)
            .service(
                web
                    ::scope("/api/users")
                    .service(api::users::register_user) // in api.ts
                    .service(api::users::login_user) // in api.ts
                    .service(api::users::search_users_debug) // debug endpoint (public)
                    .service(
                        web::scope("")
                            .wrap(auth_middleware.clone())
                                .service(api::users::get_user_id_by_username) // protected
                                .service(api::users::search_users_by_prefix)
                                .service(api::users::get_username_from_id)
                    )
            )
            .service(
                web
                    ::scope("/api/chats")
                    .wrap(auth_middleware.clone())
                    .service(api::chats::get_chats) // in api.ts
                    .service(api::chats::new_private_chat) // in api.ts
                    .service(api::chats::new_group_chat) // in api.ts
                    .service(api::chats::get_chat_members) // new endpoint
                    .service(api::chats::remove_chat_member) // new endpoint
                    .service(api::messages::get_chat_messages) // in api.ts
                    .service(api::messages::post_chat_message) // in api.ts
            )
            .service(
                web::scope("/api/messages").wrap(auth_middleware.clone())
                // .service(api::messages::get_messages) // => to add methods later
            )
            .service(
                web
                    ::scope("/api/invites")
                    .wrap(auth_middleware.clone())
                    .service(api::invites::invite_user) // in api.ts
                    .service(api::invites::get_user_invites) // in api.ts
                    .service(api::invites::accept_invite) // in api.ts
                    .service(api::invites::reject_invite) // in api.ts
            )
            .service(
                web
                    ::scope("/api/chat_components")
                    .wrap(auth_middleware.clone())
                    .service(api::chat_components::get_chat_components_handler)
            )
            .service(web::scope("/ws").route("/", web::get().to(ws_route)))
    })
        .bind(("127.0.0.1", 8080))?
        .run().await
}
