mod schema;
mod model;
mod api;
mod repository;

use actix_web::{ App, HttpServer, web::Data, middleware::Logger };
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

    HttpServer::new(move || {
        let logger = Logger::default();
        App::new().wrap(logger).service(None)
    })
        .bind(("127.0.0.1", 80))?
        .run().await
}
