mod schema;
mod model;
mod api;
mod repository;
mod auth;
mod monitor_cpu;

use actix_web::{ App, HttpServer, web, middleware::Logger };
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

    monitor_cpu::start_logging();

    HttpServer::new(move || {
        let logger = Logger::default();
        let auth_middleware = auth::Auth;

        App::new()
            .wrap(logger)
            // Public routes (no auth required)
            .service(
                web::scope("/api/users")
                    .service(api::users::register_user)
                    .service(api::users::login_user)
            )
            // Protected routes (auth required)
            .service(
                web::scope("/api/chats")
                    .wrap(auth_middleware.clone())
                    .service(api::chats::get_chats)
                    .service(api::messages::get_chat_messages)
                    .service(api::messages::post_chat_message)
                    // .service(api::chats::get_chats) // => to add methods later
            )
            .service(
                web::scope("/api/messages")
                    .wrap(auth_middleware.clone())
                    // .service(api::messages::get_messages) // => to add methods later
            )
            .service(
                web::scope("/api/invites")
                    .wrap(auth_middleware.clone())
                    // .service(api::invites::get_invites) // => to add methods later
            )
    })
        .bind(("127.0.0.1", 8080))?
        .run().await
}
