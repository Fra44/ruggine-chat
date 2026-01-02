use diesel::prelude::*;
use dotenv::dotenv;
use std::env;

/**
 * Establishes a connection to the PostgreSQL database.
 * Loads environment variables from .env file and uses DATABASE_URL.
 * # Returns
 * A PgConnection object for interacting with the database.
 * Panics if DATABASE_URL is not set or connection fails.
 */
pub fn establish_connection() -> PgConnection {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    PgConnection::establish(&database_url)
        .expect(&format!("Error connecting to {}", database_url))
}