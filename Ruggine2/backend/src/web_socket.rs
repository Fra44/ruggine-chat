use actix::{ Recipient, Actor, AsyncContext, ActorContext };
use serde::{ Deserialize, Serialize };
use std::collections::HashMap;
use std::sync::{ Arc, Mutex };
use actix_web_actors::ws;
use std::time::Duration;

/// the JSON payload sent through WebSocket to the connnected clients
#[derive(actix::Message, Clone)]
#[rtype(result = "()")]
pub struct WsMessage(pub String);

/// Main element to manage WebSocket sessions (clients connected through WS)
/// Maintains a mapping of user IDs to their WebSocket recipients for broadcasting messages
pub struct ChatServer {
    pub sessions: HashMap<i32, Recipient<WsMessage>>,
}

impl ChatServer {
    /// Creates a new ChatServer instance with an empty sessions map
    pub fn new() -> ChatServer {
        ChatServer {
            sessions: HashMap::new(),
        }
    }

    /// Registers a new WebSocket connection for a user
    /// Associates the user's ID with their WebSocket recipient for future message delivery
    pub fn connect(&mut self, user_id: i32, addr: Recipient<WsMessage>) {
        self.sessions.insert(user_id, addr);
        log::info!("User {} connected.", user_id);
    }

    /// Removes a user's WebSocket connection when they disconnect
    /// Cleans up the session mapping to prevent sending messages to disconnected clients
    pub fn disconnect(&mut self, user_id: i32) {
        self.sessions.remove(&user_id);
        log::info!("User {} disconnected.", user_id);
    }

    /// Sends a message to multiple users via their WebSocket connections
    /// Only sends to users who are currently connected (have active sessions)
    pub fn send_to_users(&self, recipients: &[i32], message: &str) {
        for recipient_id in recipients {
            if let Some(addr) = self.sessions.get(recipient_id) {
                let _ = addr.do_send(WsMessage(message.to_owned()));
            }
        }
    }
}

/// The Actor for the WebSocket SINGLE user connection
/// Represents an individual WebSocket connection for a specific user
/// Handles the lifecycle of the connection and message routing
pub struct WsConn {
    pub id: i32,
    pub addr: Arc<Mutex<ChatServer>>,
}

impl Actor for WsConn {
    type Context = ws::WebsocketContext<Self>;

    /// Called when the WebSocket connection is established
    /// Registers the user with the ChatServer and sets up connection maintenance
    /// Also delivers any pending invites that were created while the user was offline
    fn started(&mut self, ctx: &mut Self::Context) {
        if self.id == 0 {
            log::error!("WebSocket connection started without authentication!");
            ctx.stop();
            return;
        }

        self.addr.lock().unwrap().connect(self.id, ctx.address().recipient());

        ctx.run_interval(Duration::from_secs(30), |_, ctx| {
            ctx.ping(b"");
        });
        
        // After connecting, try to deliver any pending invites that were created 
        // while the user was offline
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
                    self.addr.lock().unwrap().send_to_users(&[self.id], &json);
                }
            }
            Err(e) => {
                log::warn!("Failed to fetch pending invites for user {}: {}", self.id, e);
            }
        }
    }

    /// Called when the WebSocket connection is closing
    /// Unregisters the user from the ChatServer
    fn stopping(&mut self, _: &mut Self::Context) -> actix::Running {
        self.addr.lock().unwrap().disconnect(self.id);
        actix::Running::Stop
    }
}

/// Handling of messages RECEIVED FROM the WebSocket CLIENT
/// Currently logs received messages but doesn't process them (client-to-server communication not implemented)
impl actix::StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsConn {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        println!("WebSocket message received: {:?}", msg);
    }
}

/// Handling of messages SENT TO the WebSocket CLIENT
/// Receives WsMessage instances and sends them as text frames to the connected client
impl actix::Handler<WsMessage> for WsConn {
    type Result = ();
    fn handle(&mut self, msg: WsMessage, ctx: &mut Self::Context) {
        ctx.text(msg.0);
    }
}

// WEB SOCKET MESSAGES : STRUCTURES USED TO SEND DATA TO THE CLIENTS VIA WEBSOCKET

/// Enum representing the different types of WebSocket events that can be sent to clients
/// Each variant corresponds to a specific event type that the client can handle appropriately.
/// Serialized to SCREAMING_SNAKE_CASE for JSON compatibility with the frontend.
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
    RemovedFromGroup, // to send when user is removed from a group chat
}


/// Structure representing a WebSocket message sent from server to client
/// # Fields
/// `event_type` - The type of WebSocket event (WsEventType)
/// `payload` - The actual data payload associated with the event, generic over T
#[derive(Debug, Serialize)]
pub struct ServerWsMessage<T> where T: Serialize {
    #[serde(rename = "type")] // Renamed to 'type' for JSON compatibility
    pub event_type: WsEventType,
    pub payload: T,
}

impl<T: Serialize> ServerWsMessage<T> {
    /// Serializes the WebSocket message to a JSON string for transmission
    /// Returns a fallback empty JSON object if serialization fails
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|e| {
            log::error!("Failed to serialize WsMessage: {}", e);
            "{}".to_string()
        })
    }
}
