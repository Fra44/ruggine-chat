#[macro_use]
extern crate diesel; // ci permette di usare le macro di Diesel

mod db;
mod operations;
mod models;
mod schema;
use proto::ProtoUser;

use crate::operations::users_operations::*;
use crate::operations::groups_operations::*;
use crate::operations::invites_operations::*;

fn main() {
    let my_user1 = ProtoUser {
        username: String::from("giaco"),
        hashed_password: String::from("hashed_password1"),
    };
    create_user(my_user1);
    let my_user2 = ProtoUser {
        username: String::from("mario"),
        hashed_password: String::from("hashed_password2"),
    };
    create_user(my_user2);
    let users = get_all_users();
    println!("All users: {:?}", users);
    let user = get_user_by_id(1);
    println!("User with ID 1: {:?}", user);
    let user = get_user_by_username(&String::from("mario"));
    println!("User with username 'mario': {:?}", user);
    let rows_deleted = delete_user(2);
    println!("Number of users deleted: {}", rows_deleted);
    let rows_modified = modify_user(&String::from("giaco"), &String::from("giacomo"));
    println!("Number of users modified: {}", rows_modified);
    let user_mod = get_user_by_username(&String::from("giacomo"));
    println!("Modified user: {:?}", user_mod);
    let my_group1 = proto::ProtoGroup {
        name: String::from("group1"),
        creator_id: 1,
    };
    create_group(my_group1);
    let my_user3 = ProtoUser {
        username: String::from("luigi"),
        hashed_password: String::from("hashed_password3"),
    };
    create_user(my_user3);
    let my_user4 = ProtoUser {
        username: String::from("manolo"),
        hashed_password: String::from("hashed_password4"),
    };
    let my_user5 = ProtoUser {
        username: String::from("andrea"),
        hashed_password: String::from("hashed_password5"),
    };
    create_user(my_user4);
    create_user(my_user5);
    let my_group2 = proto::ProtoGroup {
        name: String::from("group2"),
        creator_id: 3,
    };
    create_group(my_group2);
    let groups = get_all_groups();
    println!("All groups: {:?}", groups);
    let group = get_group_by_id(1);
    println!("Group with ID 1: {:?}", group);
    let rows_deleted = delete_group(2);
    println!("Number of groups deleted: {}", rows_deleted);
    let mut user_in_1 = get_users_in_group(1);
    println!("BEFORE ADDING\nUsers in group 1: {:?}", user_in_1);
    add_user_to_group(3, 1, "member");
    add_user_to_group(4, 1, "member");
    user_in_1 = get_users_in_group(1);
    println!("AFTER ADDING\nUsers in group 1: {:?}", user_in_1);
    remove_user_from_group(4, 1);
    user_in_1 = get_users_in_group(1);
    println!("AFTER REMOVING\nUsers in group 1: {:?}", user_in_1);
    let my_invite = proto::ProtoInvite {
        id_gruppo: 1,
        id_utente_invitato: 4,
        id_utente_invitante: 1,
    };
    create_invite(my_invite);
    accept_invite(1);
    user_in_1 = get_users_in_group(1);
    println!("AFTER ACCEPTING INVITE\nUsers in group 1: {:?}", user_in_1);
    let my_invite2 = proto::ProtoInvite {
        id_gruppo: 1,
        id_utente_invitato: 5,
        id_utente_invitante: 1,
    };
    create_invite(my_invite2);
    decline_invite(2);
    user_in_1 = get_users_in_group(1);
    println!("AFTER DECLINING INVITE\nUsers in group 1: {:?}", user_in_1);
}
