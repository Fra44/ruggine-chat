use crate::models::{NewUser, User};
use crate::db::establish_connection;
use diesel::prelude::*;
use proto::ProtoUser;

pub fn create_user(user: ProtoUser){
    println!("Creazione utente: {:?}", user);
    use crate::schema::users::dsl::*;
    let mut connection = establish_connection();
    // teoricamente da passare alla funzione NON sarà il tipo &NewUser, ma qualcos altro e QUA dobbiamo creare NewUser da inserire
    let new_user = NewUser{
        username : &user.username,
        hashed_pass : &user.hashed_password,
        salt: "randomString"
    };
    diesel::insert_into(users)
    .values(&new_user)
    .execute(&mut connection)
    .expect("Error in inserting new User");
}

pub fn get_user_by_id(user_id: i32) -> User {
    use crate::schema::users::dsl::*;
    let mut connection = establish_connection();
    users.filter(id.eq(user_id))
        .first::<User>(&mut connection)
        .expect(&format!("Unable to find user with id {}", user_id))
}

pub fn get_user_by_username(user_name: &String) -> User {
    use crate::schema::users::dsl::*;
    let mut connection = establish_connection();
    users.filter(username.eq(user_name))
        .first::<User>(&mut connection)
        .expect(&format!("Unable to find user with username {}", user_name))
}

pub fn get_all_users() -> Vec<User> {
    use crate::schema::users::dsl::*;
    let mut connection = establish_connection();
    users.load::<User>(&mut connection)
        .expect("Error loading users")
}

pub fn delete_user(user_id: i32) -> usize {
    use crate::schema::users::dsl::*;
    let mut connection = establish_connection();
    diesel::delete(users.filter(id.eq(user_id)))
        .execute(&mut connection)
        .expect(&format!("Unable to find user with id {}", user_id))
}

pub fn modify_user(prev_username: &String, new_username: &String) -> usize {
    use crate::schema::users::dsl::*;
    let mut connection = establish_connection();
    diesel::update(users.filter(username.eq(prev_username)))
        .set(username.eq(new_username))
        .execute(&mut connection)
        .expect(&format!("Unable to find user with username {}", prev_username))
}