# RUGGINE: App di Chat Testuale

## Introduzione
Il documento descrive il progetto "Ruggine: App di Chat Testuale", sviluppato nel contesto del corso "Programmazione di Sistema" tenuto al Politecnico di Torino.
L'obiettivo è quello di costrurire un applicativo per la gestione di un app testuale utilizzando il linguaggio Rust, le quali funzionalità richieste sono le seguenti : iscrizione, creazione e gestione di chat (private o gruppi) tramite un sistema di inviti, monitoraggio delle prestazioni.

L'applicazione è composta da un server (backend) interamente sviluppato in Rust, mentre l'interfaccia è stata fatta utilizzando React + Vite (frontend), il che consente di poter essere utilizzata su ogni dispositivo che supporta un browser moderno.

---

### Partecipanti
- **Francesco Magno (S)**
- **Francesco Papini (S)**
- **Vito Piazzolla (S)**
- **Giacomo Scorza (S347145)**

---

## Indice
1. [Manuale Utente](#manualeutente)  
2. [Manuale del Progettista](#manualeprogettista)

---

## 1. Manuale Utente

### Introduzione
L'applicazione **Ruggine** offre una piattaforma di messaggistica, il sistema consente agli utenti di :
- creare conversazioni private
- creare conversazioni di gruppo
- invio e ricezione di messaggi in real time
- sistema di inviti per la gestione dei partecipanti alle chat

### Piattaforme supportate
L'interfaccia è esposta tramite un'applicazione web, perciò qualsiasi dispositivo con un browser moderno può suportarla.
(Google Chrome, Opera, Firefox, Microsoft Edge, ecc...)