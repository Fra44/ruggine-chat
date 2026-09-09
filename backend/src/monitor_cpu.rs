use sysinfo::{get_current_pid, Pid, ProcessRefreshKind, ProcessesToUpdate, System};
use chrono::{SecondsFormat, Utc};
use std::fs::OpenOptions;
use std::time::Duration;
use std::io::Write;
use actix_rt;

/// Starts a background task that logs CPU usage of the current process every 2 minutes
pub fn start_logging() {
    actix_rt::spawn(async move {
        let mut sys = System::new_all();

        // Get the current process ID
        let pid = match get_current_pid() {
            Ok(p) => p,
            Err(e) => {
                eprintln!("Error while getting PID: {}", e);
                return;
            }
        };

        // Initial refresh of process statistics
        refresh_stats(&mut sys, pid);
        tokio::time::sleep(Duration::from_millis(222)).await;

        // Set up periodic logging every 2 minutes
        let mut interval = tokio::time::interval(Duration::from_secs(120));
        loop {
            interval.tick().await;

            // Refresh process statistics before logging
            refresh_stats(&mut sys, pid);

            if let Some(proc_info) = sys.process(pid) {
                let cpu = proc_info.cpu_usage();
                let mem_mb = proc_info.memory() as f64 / 1024.0 / 1024.0;

                // Format log entry with timestamp, CPU usage, and memory usage
                let timestamp = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
                let log_line =
                    format!("[{}] CPU: {:.2}% | RAM: {:.2} MB\n", timestamp, cpu, mem_mb);

                // Append to log file (create if doesn't exist)
                let mut file = OpenOptions::new()
                    .append(true)
                    .create(true)
                    .open("monitor_cpu.log")
                    .expect("Failed to open log file");

                file.write_all(log_line.as_bytes()).unwrap();
                file.flush().unwrap();
            }
        }
    });
}

/// Refreshes the system information for a specific process
/// Updates CPU and memory usage statistics for the given process ID
fn refresh_stats(sys: &mut System, pid: Pid) {
    sys.refresh_processes_specifics(
        ProcessesToUpdate::Some(&[pid]),
        true,
        ProcessRefreshKind::nothing().with_cpu().with_memory(),
    );
}