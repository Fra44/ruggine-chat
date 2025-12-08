use chrono::NaiveDateTime;
use serde::{ Deserialize, Serialize };

/// DTO di dominio per l'entità User (non-diesel).
/// Questo è il tipo che userai nella business logic e nelle risposte interne.
/// Nota: include `hashed_password` per completezza; per le risposte API usa `PublicUserDTO`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserDTO {
    pub id: i32,
    pub username: String,
    pub hashed_password: String,
}

/// DTO semplificato da esporre nelle API (non contiene la password).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicUserDTO {
    pub id: i32,
    pub username: String,
}

impl From<crate::repository::users::User> for UserDTO {
    fn from(db: crate::repository::users::User) -> Self {
        UserDTO {
            id: db.id,
            username: db.username,
            hashed_password: db.hashed_password,
        }
    }
}

impl From<UserDTO> for PublicUserDTO {
    fn from(u: UserDTO) -> Self {
        PublicUserDTO {
            id: u.id,
            username: u.username,
        }
    }
}

impl From<&UserDTO> for PublicUserDTO {
    fn from(u: &UserDTO) -> Self {
        PublicUserDTO {
            id: u.id,
            username: u.username.clone(),
        }
    }
}

impl UserDTO {
    /// it builds a new `UserDTO`
    pub fn new(id: i32, username: String, hashed_password: String) -> Self {
        UserDTO {
            id,
            username,
            hashed_password,
        }
    }

    /// it builds a `UserDTO` from a `repository::users::User` (the diesel Queryable struct)
    pub fn from_db_form(db: crate::repository::users::User) -> Self {
        db.into()
    }

    /// it builds a `repository::users::NewUser` (the diesel Insertable struct) from self (a `UserDTO`)
    pub fn into_db_form<'a>(
        &'a self,
        hashed_password: &'a str
    ) -> crate::repository::users::NewUser<'a> {
        crate::repository::users::NewUser {
            username: &self.username,
            hashed_password,
        }
    }

    /// Se hai una struct di input come `crate::repository::args::CreateUser`
    /// e vuoi trasformarla in un `UserDTO` temporaneo (attento: qui passiamo plain password,
    /// normalmente non si conserva), puoi usare questa factory helper che non conserva la password:
    pub fn from_create_args(args: crate::repository::args::CreateUser) -> Self {
        // Non salviamo il plain password: mettiamo un placeholder per hashed_password.
        // Normalmente l'hashing avverrà nel repository prima di costruire il NewUser.
        UserDTO {
            id: 0, // id reale verrà assegnato dalla DB dopo l'inserimento
            username: args.username,
            hashed_password: String::new(),
        }
    }
}
