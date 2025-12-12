mod schema;
mod model;
mod api;
mod repository;
mod auth;
mod monitor_cpu;

use actix_cors::Cors;
use actix_web::{ App, HttpServer, web, middleware::Logger, http::header };
use std::io::Result;

/**
 * main function, it starts the backend server
 */
#[actix_web::main]
async fn main() -> Result<()> {
    unsafe {
        std::env::set_var("RUST_LOG", "debug");
        std::env::set_var("RUST_BACKTRACE", "1");
        env_logger::init();
    }

    // monitor_cpu::start_logging();

    HttpServer::new(move || {
        let logger = Logger::default();
        let auth_middleware = auth::Auth;
        let cors = Cors::default()
            .allowed_origin("http://localhost:5173")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![header::AUTHORIZATION, header::CONTENT_TYPE])
            .max_age(3600);

        App::new()
            .wrap(logger)
            .wrap(cors)
            // Public routes (no auth required)
            .service(
                web
                    ::scope("/api/users")
                    .service(api::users::register_user)
                    .service(api::users::login_user)
                    .service(api::users::get_username_from_id)
            )
            // Protected routes (auth required)
            .service(
                web
                    ::scope("/api/chats")
                    .wrap(auth_middleware.clone())
                    .service(api::chats::get_chats) // in api.ts
                    .service(api::chats::new_private_chat) // in api.ts
                    .service(api::chats::new_group_chat) // in api.ts
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
                    .service(api::invites::reject_invite) //
                // .service(api::invites::get_invites) // => to add methods later
            )
    })
        .bind(("127.0.0.1", 8080))?
        .run().await
}
