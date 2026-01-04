use actix_rt;
use chrono::{SecondsFormat, Utc};
use std::fs::OpenOptions;
use std::io::Write;
use std::time::Duration;
use sysinfo::{get_current_pid, Pid, ProcessRefreshKind, ProcessesToUpdate, System};

/// Starts a background task that logs CPU usage of the current process every 2 minutes
pub fn start_logging() {
    actix_rt::spawn(async move {
        let mut sys = System::new_all();

        let pid = match get_current_pid() {
            Ok(p) => p,
            Err(e) => {
                eprintln!("Error while getting PID: {}", e);
                return;
            }
        };

        refresh_stats(&mut sys, pid);
        // in order to get a correct cpu usage value we need to await at least 0.2 sec
        tokio::time::sleep(Duration::from_millis(222)).await;

        let mut interval = tokio::time::interval(Duration::from_secs(120));
        loop {
            interval.tick().await;

            refresh_stats(&mut sys, pid);

            if let Some(proc_info) = sys.process(pid) {
                let cpu = proc_info.cpu_usage();
                let mem_mb = proc_info.memory() as f64 / 1024.0 / 1024.0;

                let timestamp = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
                let log_line =
                    format!("[{}] CPU: {:.2}% | RAM: {:.2} MB\n", timestamp, cpu, mem_mb);

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

fn refresh_stats(sys: &mut System, pid: Pid) {
    sys.refresh_processes_specifics(
        ProcessesToUpdate::Some(&[pid]),
        true,
        ProcessRefreshKind::nothing().with_cpu().with_memory(),
    );
}