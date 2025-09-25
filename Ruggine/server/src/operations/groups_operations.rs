use crate::db::establish_connection;
use diesel::prelude::*;
use crate::models::{NewGroup, Group};
use crate::models::{NewUserGroup, UserGroup};
use proto::ProtoGroup;

pub fn create_group(new_group: ProtoGroup) {
    println!("Creazione gruppo: {:?}", new_group);
    use crate::schema::groups::dsl::*;
    let mut connection = establish_connection();
    let group = NewGroup {
        name: &new_group.name,
        creator: Some(new_group.creator_id),
    };
    diesel::insert_into(groups)
        .values(&group)
        .execute(&mut connection)
        .expect("Error in inserting new Group");
    // dopo la creazione del gruppo, aggiungo il creatore come membro con ruolo Admin
    use crate::schema::user_groups::dsl::*;
    let new_user_group = NewUserGroup {
        user_id: Some(new_group.creator_id),
        group_id: Some(
            groups
                .order(id.desc())
                .select(id)
                .first::<Option<i32>>(&mut connection)
                .expect("Error getting last inserted group id")
                .unwrap(),
        ),
        role: "admin",
    };
    diesel::insert_into(user_groups)
        .values(&new_user_group)
        .execute(&mut connection)
        .expect("Error in inserting new UserGroup");
}

pub fn delete_group(group_id: i32) -> usize {
    use crate::schema::groups::dsl::*;
    let mut connection = establish_connection();
    diesel::delete(groups.filter(id.eq(group_id)))
        .execute(&mut connection)
        .expect(&format!("Unable to find group with id {}", group_id))
}

pub fn get_group_by_id(group_id: i32) -> Group {
    use crate::schema::groups::dsl::*;
    let mut connection = establish_connection();
    groups.filter(id.eq(group_id))
        .first::<Group>(&mut connection)
        .expect(&format!("Unable to find group with id {}", group_id))
}

pub fn get_all_groups() -> Vec<Group> {
    use crate::schema::groups::dsl::*;
    let mut connection = establish_connection();
    groups.load::<Group>(&mut connection)
        .expect("Error loading groups")
}

pub fn add_user_to_group(userid: i32, groupid: i32, role_str: &str) {
    use crate::schema::user_groups::dsl::*;
    let mut connection = establish_connection();
    let new_user_group = NewUserGroup {
        user_id: Some(userid),
        group_id: Some(groupid),
        role: role_str,
    };
    diesel::insert_into(user_groups)
        .values(&new_user_group)
        .execute(&mut connection)
        .expect("Error in inserting new UserGroup");
}

pub fn remove_user_from_group(userid: i32, groupid: i32) -> usize {
    use crate::schema::user_groups::dsl::*;
    let mut connection = establish_connection();

    // Verifica se l'utente fa parte del gruppo
    let exists = user_groups
        .filter(user_id.eq(userid))
        .filter(group_id.eq(groupid))
        .first::<crate::models::UserGroup>(&mut connection)
        .optional()
        .expect("Errore nella ricerca user_group");

    if exists.is_some() {
        diesel::delete(user_groups.filter(user_id.eq(userid)).filter(group_id.eq(groupid)))
            .execute(&mut connection)
            .expect(&format!(
                "Unable to delete user_group with user_id {} and group_id {}",
                userid, groupid
            ))
    } else {
        0
    }
}

pub fn get_users_in_group(groupid: i32) -> Vec<i32> {
    use crate::schema::user_groups::dsl::*;
    let mut connection = establish_connection();
    user_groups
        .filter(group_id.eq(groupid))
        .select(user_id)
        .load::<Option<i32>>(&mut connection)
        .expect("Error loading user_ids")
        .into_iter()
        .flatten()
        .collect()
}

