use std::collections::HashMap;
use actix::{ Recipient, Actor, AsyncContext, ActorContext };
use serde::{ Deserialize, Serialize };
use std::sync::{ Arc, Mutex };
use std::time::Duration;
use actix_web_actors::ws;

/// the JSON payload sent through WebSocket to the connnected clients
#[derive(actix::Message, Clone)]
#[rtype(result = "()")]
pub struct WsMessage(pub String);

/// Main element to manage WebSocket sessions (clients connected through WS)
pub struct ChatServer {
    /// maps session id to the Recipient (address) of the client
    pub sessions: HashMap<i32, Recipient<WsMessage>>,
}

impl ChatServer {
    pub fn new() -> ChatServer {
        ChatServer {
            sessions: HashMap::new(),
        }
    }

    /// function used when an Actor (user) connects
    pub fn connect(&mut self, user_id: i32, addr: Recipient<WsMessage>) {
        self.sessions.insert(user_id, addr);
        log::info!("User {} connected.", user_id);
    }

    /// function used when an Actor (user) disconnects
    pub fn disconnect(&mut self, user_id: i32) {
        self.sessions.remove(&user_id);
        log::info!("User {} disconnected.", user_id);
    }

    /// function to send a message to a list of (connected) users
    pub fn send_to_users(&self, recipients: &[i32], message: &str) {
        for recipient_id in recipients {
            if let Some(addr) = self.sessions.get(recipient_id) {
                let _ = addr.do_send(WsMessage(message.to_owned()));
            }
        }
    }
}

/// The Actor for the WebSocket SINGLE user connection
pub struct WsConn {
    /// the ID of the authenticated user
    pub id: i32,
    /// reference to the central ChatServer
    pub addr: Arc<Mutex<ChatServer>>,
}

impl Actor for WsConn {
    type Context = ws::WebsocketContext<Self>;

    /// at the start of the Actor, if authentication had previously ended well, this function register the user connection to ChatServer
    fn started(&mut self, ctx: &mut Self::Context) {
        if self.id == 0 {
            log::error!("WebSocket connection started without authentication!");
            ctx.stop();
            return;
        }

        self.addr.lock().unwrap().connect(self.id, ctx.address().recipient());

        // Start heartbeat to keep connection alive
        ctx.run_interval(Duration::from_secs(30), |_, ctx| {
            ctx.ping(b"");
        });
        
        // After connecting, try to deliver any pending invites that were created while the user
        // was offline. This fetches invites from the repository and sends a NEW_INVITE WS message
        // to the connected user for each pending invite. This ensures clients that connect
        // after an invite was created still receive the notification.
        match crate::repository::invites::get_invites_for_user(self.id) {
            Ok(pending) => {
                for inv in pending {
                    let invite_dto = crate::model::invites::map_invite_to_dto(inv);
                    let msg = crate::web_socket::ServerWsMessage {
                        event_type: crate::web_socket::WsEventType::NewInvite,
                        payload: invite_dto,
                    };
                    let json = serde_json::to_string(&msg).unwrap_or_else(|e| {
                        log::error!("Failed to serialize invite DTO: {}", e);
                        "{}".to_string()
                    });
                    // send only to this connected user
                    self.addr.lock().unwrap().send_to_users(&[self.id], &json);
                }
            }
            Err(e) => {
                log::warn!("Failed to fetch pending invites for user {}: {}", self.id, e);
            }
        }
    }

    fn stopping(&mut self, _: &mut Self::Context) -> actix::Running {
        // Al termine, si disconnette dal ChatServer
        self.addr.lock().unwrap().disconnect(self.id);
        actix::Running::Stop
    }
}

/// Handling of messages RECEIVED FROM the WebSocket CLIENT
impl actix::StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsConn {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        println!("WebSocket message received: {:?}", msg);
    }
}

/// Handling of messages SENT TO the WebSocket CLIENT
impl actix::Handler<WsMessage> for WsConn {
    type Result = ();
    /// Function to actually handle messages sent to the client
    fn handle(&mut self, msg: WsMessage, ctx: &mut Self::Context) {
        // we send a message for NEW_MESSAGE event
        ctx.text(msg.0);
    }
}

// WEB SOCKET MESSAGES : STRUCTURES USED TO SEND DATA TO THE CLIENTS VIA WEBSOCKET

/// Enum representing the different types of WebSocket events that can be sent to clients
/// Each variant corresponds to a specific event type that the client can handle appropriately.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WsEventType {
    NewMessage, // to send when a new message is sent in a chat the user is part of, so that client can update its message list
    // if it's the one currently selected
    UserJoined, // maybe
    UserLeft, // maybe
    UserTyping, // maybe
    NewChat, // to send when user accepts an invite and joins a new chat (so that client can update its chat list)
    NewInvite, // to send when user receives a new invite (so that client can update its invite list)
}


/// Structure representing a WebSocket message sent from server to client
/// # Fields
/// `event_type` - The type of WebSocket event (WsEventType)
/// `payload` - The actual data payload associated with the event, generic over T
#[derive(Debug, Serialize)]
pub struct ServerWsMessage<T> where T: Serialize {
    #[serde(rename = "type")] // Rinominato in 'type' per il JSON
    pub event_type: WsEventType,
    pub payload: T,
}

impl<T: Serialize> ServerWsMessage<T> {
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|e| {
            log::error!("Failed to serialize WsMessage: {}", e);
            "{}".to_string()
        })
    }
}
