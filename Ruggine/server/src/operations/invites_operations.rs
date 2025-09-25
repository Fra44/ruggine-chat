use crate::db::establish_connection;
use diesel::prelude::*;
use crate::models::{NewGroup, Group};
use crate::models::{NewUserGroup, UserGroup};
use crate::models::{NewInvite, Invite};
use proto::ProtoInvite;

pub fn create_invite(new_invite: ProtoInvite) {
    println!("Creazione invito: {:?}", new_invite);
    use crate::schema::invites::dsl::*;
    let mut connection = establish_connection();
    let invite = NewInvite {
        group_id: Some(new_invite.id_gruppo),
        invited_user: Some(new_invite.id_utente_invitato),
        inviter_user: Some(new_invite.id_utente_invitante),
    };
    diesel::insert_into(invites)
        .values(&invite)
        .execute(&mut connection)
        .expect("Error in inserting new Invite");
}

pub fn accept_invite(invite_id: i32) -> usize {
    use crate::schema::invites::dsl::*;
    let mut connection = establish_connection();
    // prima di tutto, recupero l'invito per ottenere i dettagli necessari
    let invite_details = invites.filter(id.eq(invite_id))
        .first::<Invite>(&mut connection)
        .expect(&format!("Unable to find invite with id {}", invite_id));
    // aggiungo l'utente invitato al gruppo con ruolo "member"
    use crate::schema::user_groups::dsl::*;
    let new_user_group = NewUserGroup {
        user_id: invite_details.invited_user,
        group_id: invite_details.group_id,
        role: "member",
    };
    diesel::insert_into(user_groups)
        .values(&new_user_group)
        .execute(&mut connection)
        .expect("Error in inserting new UserGroup");
    // infine, elimino l'invito
    diesel::delete(invites.filter(id.eq(invite_id)))
        .execute(&mut connection)
        .expect(&format!("Unable to find invite with id {}", invite_id))
}

pub fn decline_invite(invite_id: i32) -> usize {
    use crate::schema::invites::dsl::*;
    let mut connection = establish_connection();
    diesel::delete(invites.filter(id.eq(invite_id)))
        .execute(&mut connection)
        .expect(&format!("Unable to find invite with id {}", invite_id))
}