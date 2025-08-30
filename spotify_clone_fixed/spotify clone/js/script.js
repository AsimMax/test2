console.log("Hello, World!");
let currentSong = new Audio();
let songs;
let currFolder;

// select important buttons
let play = document.querySelector("#play");
let previous = document.querySelector("#previous");
let next = document.querySelector("#next");

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

async function getSongs(folder) {
    currFolder = folder;
    let a = await fetch(`http://127.0.0.1:5500/${folder}/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let as = div.getElementsByTagName("a");
    songs = [];
    for (let i = 0; i < as.length; i++) {
        const element = as[i];
        if (element.href.endsWith(".mp3")) {
            let relativePath = element.href.replace(window.location.origin + "/", "");
            songs.push(relativePath);
        }
    }
    let songUL = document.querySelector(".songList ul");
    songUL.innerHTML = "";  // clear existing list

    songs.forEach((song, index) => {
        // Create each li with data-index
        songUL.innerHTML += `
            <li data-index="${index}">
                <img class="invert" src="img/music.svg" alt="">
                <div class="info">
                    <div>${decodeURIComponent(song.split("/").pop())}</div>
                    <div>Song Artist</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="">
                </div>
            </li>`;
    });

    // Attach event listener to every li (play on click only)
    Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach((e)=>{
        e.addEventListener("click", ()=>{
            let index = e.getAttribute("data-index");
            playMusic(songs[index]);  // play correct file from array
        });
    });

    return songs;  // ✅ return the playlist
}

const playMusic = (track, pause = false) => {
    currentSong.src = `http://127.0.0.1:5500/${track}`;  // ✅ ensure correct path
    if (!pause) {
        currentSong.play();
    }
    play.src = "img/pause.svg"
    document.querySelector(".songinfo").innerHTML = decodeURI(track.split(`${currFolder}/`)[1]);
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
}
async function displayAlbums(){
    console.log("displayAlbums() called ✅");

    let a = await fetch("http://127.0.0.1:5500//songs/");
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let anchors = div.getElementsByTagName("a");
    let cardContainer = document.querySelector(".cardContainer");
    if (!cardContainer) {
        console.error("❌ .cardContainer not found in HTML!");
        return;
    }
    let albums = [];

    for (let e of anchors) {
        // pick only directories
        if (e.href.includes("//songs/") && e.classList.contains("icon-directory")) {
            let folder = e.getAttribute("title");  // ✅ "cs", "ncs"
            if (!folder || folder === "..") continue;

            console.log("✅ Found album folder:", folder);

            try {
                let res = await fetch(`http://127.0.0.1:5500//songs/${folder}/info.json`);
                if (!res.ok) {
                    console.error("❌ info.json missing for:", folder);
                    continue;
                }
                let info = await res.json();

                console.log("Appending card for:", folder, info);

                albums.push(folder);

                cardContainer.innerHTML += `
                  <div data-folder="${folder}" class="card">
                      <div class="play">▶</div>
                      <img src="//songs/${folder}/cover.jpg" alt=""/>
                      <h2>${info.title}</h2>
                      <p>${info.description}</p>
                  </div>`;
            } catch (err) {
                console.error(`❌ Error loading folder ${folder}:`, err);
            }
        }
    }

    // Attach click events
    Array.from(document.getElementsByClassName("card")).forEach(e => { 
        e.addEventListener("click", async item => {
            console.log("🎵 Album clicked:", item.currentTarget.dataset.folder);
            songs = await getSongs(`/songs/${item.currentTarget.dataset.folder}`);
            playMusic(songs[0]);
        });
    });

    return albums;
}

async function main(){
    songs = await getSongs("/songs/ncs");
    console.log(songs); 
    playMusic(songs[0], true);
    // Display all the albums on the page
    displayAlbums();
    //attach event listener to play button
    play.addEventListener("click", ()=>{
        if(currentSong.paused){
            currentSong.play();
            play.src="img/pause.svg"
        }
        else{
            currentSong.pause();
            play.src="img/play.svg"
        }
    });

    //Listen for timeupdate event
    currentSong.addEventListener("timeupdate",()=>{
        document.querySelector(".songtime").innerHTML = 
            `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    //Add an event listener to seekbar
    document.querySelector(".seekbar").addEventListener("click",e=>{
        let percent=(e.offsetX/e.target.getBoundingClientRect().width)*100;
        document.querySelector(".circle").style.left = percent+"%";
        currentSong.currentTime=((currentSong.duration)*percent)/100;
    });

    //Add an event listener for hamburger
    document.querySelector(".hamburger").addEventListener("click",()=>{
        document.querySelector(".left").style.left="0";
    });

    // Add an event listener for close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%"
    });

    // Add an event listener for previous button
    previous.addEventListener("click", () => {
        let currentTrack = currentSong.src.replace(window.location.origin + "/", "");
        let index = songs.indexOf(currentTrack);
        if ((index - 1) >= 0) {
            currentSong.pause()
            playMusic(songs[index - 1])
        }
    });

    // Add an event listener to next button
    next.addEventListener("click", () => {
        let currentTrack = currentSong.src.replace(window.location.origin + "/", "");
        let index = songs.indexOf(currentTrack);
        if ((index + 1) < songs.length) {
            currentSong.pause()
            playMusic(songs[index + 1])
        }
    });

    // Add an event to volume
    document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
        currentSong.volume = parseInt(e.target.value) / 100
        if (currentSong.volume > 0){
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("mute.svg", "volume.svg")
        }
    });

    // Load the playlist whenever card is clicked
    Array.from(document.getElementsByClassName("card")).forEach(e => { 
        e.addEventListener("click", async item => {
            songs = await getSongs(`/songs/${item.currentTarget.dataset.folder}`)  
            playMusic(songs[0])
        })
    });
    // Add event listener to mute the track
    document.querySelector(".volume>img").addEventListener("click", e=>{ 
        if(e.target.src.includes("img/volume.svg")){
            e.target.src = e.target.src.replace("img/volume.svg", "img/mute.svg")
            currentSong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
        }
        else{
            e.target.src = e.target.src.replace("img/mute.svg", "img/volume.svg")
            currentSong.volume = .10;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
        }

    })
}

main();
