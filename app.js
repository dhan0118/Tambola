/*<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyATYxYA5Z9LlZdV56zx5gqVjzQjLHzwpKY",
    authDomain: "tambola-8abb7.firebaseapp.com",
    projectId: "tambola-8abb7",
    storageBucket: "tambola-8abb7.firebasestorage.app",
    messagingSenderId: "50822051042",
    appId: "1:50822051042:web:984e839380e094c9d29abb",
    measurementId: "G-LCHKBQFL5Y"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getDatabase, ref, set, update, onValue, get, child } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

/* 🔥 Firebase Config (YOURS) */
const firebaseConfig = {
  apiKey: "AIzaSyATYxYA5Z9LlZdV56zx5gqVjzQjLHzwpKY",
  authDomain: "tambola-8abb7.firebaseapp.com",
  projectId: "tambola-8abb7",
  storageBucket: "tambola-8abb7.firebasestorage.app",
  messagingSenderId: "50822051042",
  appId: "1:50822051042:web:984e839380e094c9d29abb"
};
console.log(new Date());

/* Init */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* Globals */
let roomId, userId, username;
let roomRef;

const numbers90 = () => Array.from({ length: 90 }, (_, i) => i + 1);

/* ---------------- ROOM ---------------- */

window.createRoom = function () {
  roomId = Math.random().toString(36).substring(2, 8);
  joinRoom(true);
};

window.joinRoom = function (isCreator = false) {
  username = document.getElementById("username").value;
  roomId = roomId || document.getElementById("roomId").value;

  if (!username || !roomId) return alert("Enter username & room ID");

  userId = "u_" + Date.now();
  roomRef = ref(db, "rooms/" + roomId);

  if (isCreator) {
    set(roomRef, {
      meta: {
        createdAt: Date.now(),
        iteration: 1,
        status: "running"
      },
      game: {
        current: null,
        drawn: [],
        available: numbers90()
      },
      winnings: {}
    });
  }

  set(ref(db, `rooms/${roomId}/users/${userId}`), {
    username
  });

  document.getElementById("setup").hidden = true;
  document.getElementById("game").hidden = false;
  document.getElementById("roomLabel").innerText = roomId;

  listenRoom();
};

/* ---------------- GAME ---------------- */

window.drawNumber = async function () {
  const snap = await get(roomRef);
  const data = snap.val();

  if (!data || data.meta.status !== "running") return;

  // ✅ SAFE ARRAY CREATION
  const drawn = Array.isArray(data.game?.drawn)
    ? [...data.game.drawn]
    : [];

  const available = Array.isArray(data.game?.available)
    ? [...data.game.available]
    : [];

  if (available.length === 0) return;

  const index = Math.floor(Math.random() * available.length);
  const number = available[index];

  const newDrawn = [...drawn, number];
  const newAvailable = available.filter(n => n !== number);

  // ✅ NO MUTATION – PURE UPDATE
  update(roomRef, {
    "game/current": number,
    "game/drawn": newDrawn,
    "game/available": newAvailable
  });
};


window.declareWin = function () {
  const type = document.getElementById("winType").value;

  get(roomRef).then(snapshot => {
    const data = snapshot.val();
    const iter = data.meta.iteration;

    if (data.winnings?.[`iteration_${iter}`]?.[type]) {
      alert("Already won");
      return;
    }

    set(ref(db, `rooms/${roomId}/winnings/iteration_${iter}/${type}`), {
      userId,
      username,
      time: Date.now()
    });

    if (type === "full_house") {
      update(roomRef, { "meta/status": "ended" });
      alert("🎉 Full House! Game Ended");
    }
  });
};

window.resetGame = function () {
  get(roomRef).then(snapshot => {
    const data = snapshot.val();
    const next = data.meta.iteration + 1;

    update(roomRef, {
      "meta/iteration": next,
      "meta/status": "running",
      "game/current": null,
      "game/drawn": [],
      "game/available": numbers90()
    });
  });
};

/* ---------------- LISTENERS ---------------- */

function listenRoom() {
  onValue(roomRef, snapshot => {
    const data = snapshot.val();
    if (!data) return;

    document.getElementById("current").innerText =
      data.game.current || "--";

    document.getElementById("iterationLabel").innerText =
      `Game Iteration: ${data.meta.iteration}`;

    renderBoard(data.game?.drawn);
    renderWinners(data.winnings);
    handleDeclareState(data);
  });
}

/* ---------------- UI ---------------- */

function renderBoard(drawn) {
  const board = document.getElementById("board");
  board.innerHTML = "";

  // ✅ HARD SAFETY GUARD
  if (!Array.isArray(drawn)) drawn = [];

  for (let i = 1; i <= 90; i++) {
    const s = document.createElement("span");
    s.innerText = i;

    if (drawn.indexOf(i) !== -1) {
      s.classList.add("drawn");
    }

    board.appendChild(s);
  }
}


function renderWinners(winnings) {
  const div = document.getElementById("winners");
  div.innerHTML = "";

  for (const iter in winnings) {
    const h = document.createElement("h4");
    h.innerText = iter;
    div.appendChild(h);

    for (const p in winnings[iter]) {
      const d = document.createElement("div");
      d.innerText = `${p} → ${winnings[iter][p].username}`;
      div.appendChild(d);
    }
  }
}

function handleDeclareState(data) {
  const iter = data.meta.iteration;
  const wins = data.winnings?.[`iteration_${iter}`];
  const select = document.getElementById("winType");
  const btn = document.querySelector("button[onclick='declareWin()']");

  let allDisabled = true;

  for (let opt of select.options) {
    if (wins && wins[opt.value]) {
      opt.disabled = true;
    } else {
      opt.disabled = false;
      allDisabled = false;
    }
  }

  btn.disabled = allDisabled;
}
