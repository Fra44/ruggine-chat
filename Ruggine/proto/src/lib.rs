use chrono::NaiveDateTime;

#[derive(Debug, Clone)]
pub struct ProtoUser {
    pub username: String,
    pub hashed_password: String,
    // pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone)]
pub struct ProtoGroup {
    pub name: String,
    pub creator_id: i32,
    // pub creato_il: NaiveDateTime,
    // pub visualizzato: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Ruolo {
    Admin,
    Member,
}

// #[derive(Debug, Clone)]
// pub struct MembroGruppo {
//     pub id_gruppo: i32,
//     pub id_utente: i32,
//     pub ruolo: Ruolo,
// }

#[derive(Debug, Clone)]
pub struct ProtoInvite {
    pub id_gruppo: i32,
    pub id_utente_invitato: i32,
    pub id_utente_invitante: i32,
}
// maybe to substitute ids with usernames

// #[derive(Debug, Clone)]
// pub struct Messaggio {
//     pub id_messaggio: i32,
//     pub id_gruppo: i32,
//     pub id_mittente: i32,
//     pub contenuto: String,
//     pub timestamp: NaiveDateTime,
// }