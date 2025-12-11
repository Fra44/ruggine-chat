use actix_rt;
use std::fs::OpenOptions;
use std::io::Write;
use std::time::Duration;
use sysinfo::{Pid, Process, System, get_current_pid};
use chrono::Local;

/// Starts a background task that logs CPU usage of the current process every 2 minutes
/// DECOMMENT TO CONTINUE IMPLEMENTATION
pub fn start_logging() {
    !unimplemented!();
//     actix_rt::spawn(async move {
//         let mut sys = System::new_all();
        
//         let pid = match get_current_pid() {
//             Ok(p) => p,
//             Err(e) => {
//                 eprintln!("Error while getting PID: {}", e);
//                 return;
//             }
//         };

//         let mut interval = tokio::time::interval(Duration::from_mins(2));
//     });
}