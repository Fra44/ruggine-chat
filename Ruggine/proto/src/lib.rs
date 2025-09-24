#[macro_use]
extern crate diesel; // ci permette di usare le macro di Diesel

mod db;
mod operations;
mod models;
mod schema;

// #[derive(Debug, Clone)]
// pub struct Utente {
//     pub id_utente: i32,
//     pub nome_utente: String,
//     pub password_hash: String,
//     pub creato_il: NaiveDateTime,
// }

// #[derive(Debug, Clone)]
// pub struct Gruppo {
//     pub id_gruppo: i32,
//     pub nome: String,
//     pub creato_da: i32,
//     pub creato_il: NaiveDateTime,
//     pub visualizzato: bool,
// }

// #[derive(Debug, Clone, PartialEq, Eq)]
// pub enum Ruolo {
//     Admin,
//     User,
// }

// #[derive(Debug, Clone)]
// pub struct MembroGruppo {
//     pub id_gruppo: i32,
//     pub id_utente: i32,
//     pub ruolo: Ruolo,
// }

// #[derive(Debug, Clone)]
// pub struct InvitoGruppo {
//     pub id_invito: i32,
//     pub id_gruppo: i32,
//     pub id_utente_invitato: i32,
//     pub id_utente_invitante: i32,
// }

// #[derive(Debug, Clone)]
// pub struct Messaggio {
//     pub id_messaggio: i32,
//     pub id_gruppo: i32,
//     pub id_mittente: i32,
//     pub contenuto: String,
//     pub timestamp: NaiveDateTime,
// }