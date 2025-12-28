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

### Requisiti Software/Librerie
- Node.js: ≥ 18  
- npm: ≥ 9.x (solitamente già incluso con Node 18)  
- Rust: ≥ 1.63

### Installazione ed avvio
- Scaricare l'applicazione, in questi diversi "modi" :
    - scaricare il codice sorgente dalla repository remota ufficiale
    - scaricare il codice come archivio `.zip` o `.tar.gz` ed estrarlo
- La struttura del progetto è così fatta: 
    - `frontend/` : contiene i file relativi al server React che si occupa di fornire le pagine al browser (UI)
    - `backend/` : contiene i file relativi al backend server dell'applicazione
    - `docker/` : contiene il dockerfile per lanciare un container che offre un servizio DB (postgres) per l'integrità dei dati.
1. **Installazione delle dipendenze :**
    - all'interno del folder `frontend/` eseguire il comando  
    ```npm install ```  
    - all'interno del folder `docker/` eseguire il comando  
    ```docker compose up -d```  
    per lanciare il container contenente il database
2. **Avvio dell'applicazione :**
    - all'interno del folder `frontend/` lanciare il comando:  
    ```npm run dev```
    - all'interno del folder `backend/` lanciare il comando:  
    ```cargo run```  
    (che si occupa anche dell'installazione delle dipendenze necessarie)
### Utilizzo
Seguendo i passi della sezione "Installazione ed avvio", l'applicazione sarà in esecuzione.  
Il frontend sarà raggiungibile tramite [http://localhost:5173](http://localhost:5173), mentre il backend starà girando su [http://localhost:3000](http://localhost:3000).

1. **Registrazione e Login**  
Collegarsi a [http://localhost:5173](http://localhost:5173), inizialmente si verrà automaticamente indirizzati alla pagina di **Login**, tramite la quale possiamo accedere inserendo **username** e **password**.  
Se non si possiede un account, si può andare (tramite URL o tramite i bottoni all'interno della schermata) alla pagina di **Registrazione**.  
Per registrare un account basterà inserire un username (deve essere UNIVOCO) ed una password. Una volta creato l'account si può effettuare il login.
2. **Homepage**  
Una volta effettuato il login con successo, si viene reindirizzati alla **Homepage**  
Questa contiene, sul lato sinistro, la lista (scorribile) delle chat a cui l'utente partecipa, mentre sul lato destro, i messaggi della chat selezionata, insieme al textbox in cui scrivere il nuovo messaggio ed il tasto per inviarlo.  
(Per vedere i messaggi una chat deve essere precedentemente selezionata cliccando su di essa)  
    - ***Lista delle chat*** : contiene tutte le chat a cui l'utente partecipa, ordinate, dall'alto verso il basso, dalla chat con l'ultimo messaggio più recente alla chat con l'ultimo messaggio più vecchio.  
    Viene fornita anche una *barra di ricerca* per filtrare le chat in base alla stringa di testo inserita.  
    In questa sezione c'è anche il *tasto* per la *creazione* di una *nuova chat*, se cliccato chiede di inserire:
        - username dell'utente con cui aprire una nuova *chat privata*
        - lista degli username degli utenti da invitare in un nuovo *gruppo* che sta per essere creato 
        - il *nome del gruppo* in caso venga inserita la lista di utenti
        
        Inoltre, è possibile effettuare il logout tramite il tasto **Logout** a disposizione in questa sezione. 
    - ***Lista Messaggi***