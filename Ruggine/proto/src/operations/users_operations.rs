use crate::models::{NewUser, User};
use crate::db::establish_connection;
use diesel::prelude::*;

pub fn create_user(user: &NewUser){
    println!("Creazione utente: {:?}", user);
    use crate::schema::users::dsl::*;
    let mut connection = establish_connection();
    // teoricamente da passare alla funzione NON sarà il tipo &NewUser, ma qualcos altro e QUA dobbiamo creare NewUser da inserire
    let new_user = NewUser{
        username : &user.username,
        hashed_pass : &user.hashed_pass,
        salt: &user.salt
    };
    diesel::insert_into(users)
    .values(&new_user)
    .execute(&mut connection)
    .expect("Error in inserting new User");
}