async function loadTSV() {
  const custom = localStorage.getItem("qaDataCustom");

  if (custom) {
    return JSON.parse(custom);
  }

  const res = await fetch("data/big-doc.tsv");
  const text = await res.text();
  const newText = parseText(text);

  localStorage.setItem("qaDataCustom", JSON.stringify(newText));

  return newText;
}

async function showQA() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get("index"), 10);
  const data = await loadTSV();

  const questionElem = document.getElementById("question");
  const answerBoxElem = document.getElementById("answer-box");
  const answerElem = document.getElementById("answer");
  const referenceElem = document.getElementById("reference");
  const centerContainer = document.querySelector(".center-content");
  const countdownElem = document.getElementById("countdown");
  countdownElem.style.display = "none";

  if (data[id]) {
    questionElem.textContent = data[id].question;
    answerElem.textContent = data[id].answer;
    referenceElem.textContent = data[id].reference;

    if (!localStorage.getItem(`revealBtnClicked-${id}`)) {
      countdownElem.style.display = "block";
      startCountdown(20);

      // Create Show Answer button
      const revealBtn = document.createElement("button");
      revealBtn.textContent = "Show Answer";
      revealBtn.id = "revealBtn";

      revealBtn.addEventListener("click", () => {
        localStorage.setItem(`revealBtnClicked-${id}`, "true");
      });

      revealBtn.onclick = () => {
        answerBoxElem.style.display = "block";
        revealBtn.style.display = "none";
        countdownElem.style.opacity = "0";
        setTimeout(() => {
          answerBoxElem.style.opacity = "1";
        }, 10);
      };

      centerContainer.appendChild(revealBtn);
    } else {
      answerBoxElem.style.display = "block";
      answerBoxElem.style.opacity = "1";
    }
  } else {
    questionElem.textContent = "Question not found.";
    answerElem.textContent = "";
    referenceElem.textContent = "";
  }
}

function shuffle(a, b, c, d) {
  c = a.length;
  while (c)
    (b = (Math.random() * c--) | 0), (d = a[c]), (a[c] = a[b]), (a[b] = d);
}

function createGrid() {
  const container = document.querySelector(".grid");

  for (let i = 0; i < 25; i++) {
    const btn = document.createElement("button");
    btn.textContent = i + 1;

    // Check if this button has been clicked before
    if (localStorage.getItem(`btnClicked-${i}`) === "true") {
      btn.classList.add("clicked");
    }

    btn.addEventListener("click", () => {
      localStorage.setItem(`btnClicked-${i}`, "true");
      btn.classList.add("clicked");

      // Navigate to question page
      window.location.href = `question.html?index=${i}`;
    });

    container.appendChild(btn);
  }
}

function clearClickedStates() {
  for (let i = 0; i < 25; i++) {
    localStorage.removeItem(`btnClicked-${i}`);
    localStorage.removeItem(`revealBtnClicked-${i}`);
  }
  location.reload();
}

function parseText(text) {
  const rows = text.trim().split("\n").slice(1); // skip header
  const data = rows.map((row) => {
    const [question, answer, reference] = row.split("\t");
    return { question, answer, reference };
  });

  shuffle(data);
  return data.slice(0, 25);
}

function triggerUpload() {
  console.log(document.getElementById("tsvUpload"));
  document.getElementById("tsvUpload").click();
}

// Clear custom TSV
function clearCustomTSV() {
  localStorage.removeItem("qaDataCustom");
  alert("Custom TSV cleared. Reloading default.");
  clearClickedStates();
}

function startCountdown(duration) {
  const countdownEl = document.getElementById("countdown");
  let timeLeft = duration;

  countdownEl.textContent = timeLeft;

  const timer = setInterval(() => {
    timeLeft--;
    countdownEl.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timer);
      countdownEl.style.opacity = "0";
    }
  }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("tsvUpload");
  if (input) {
    input.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) {
        clearCustomTSV();
      }

      const text = await file.text();

      localStorage.setItem("qaDataCustom", JSON.stringify(parseText(text)));
      alert("Custom TSV uploaded! Reloading the page.");
      clearClickedStates();
      location.reload();
    });
  }

  if (
    window.location.pathname.includes("index.html") ||
    window.location.pathname === "/"
  ) {
    const menu = document.getElementById("floating-menu-wrapper");
    const toggleBtn = document.getElementById("floating-toggle");
    const iconMenu = document.getElementById("floating-icons");
    const arrowIcon = toggleBtn.querySelector("i");

    const readMenuState = () => {
      if (!localStorage.getItem("menu-open")) {
        menu.classList.add("hidden");
        iconMenu.classList.add("hidden");
        arrowIcon.classList.replace("fa-arrow-right", "fa-arrow-left");

        return false;
      } else {
        menu.classList.remove("hidden");
        iconMenu.classList.remove("hidden");
        arrowIcon.classList.replace("fa-arrow-left", "fa-arrow-right");

        return true;
      }
    };

    let menuOpen = readMenuState();

    toggleBtn.addEventListener("click", () => {
      if (menuOpen) {
        localStorage.removeItem("menu-open");
      } else {
        localStorage.setItem("menu-open", "true");
      }

      menuOpen = readMenuState();
    });
  }
});

if (window.location.pathname.includes("question.html")) {
  localStorage.removeItem("menu-open");
  showQA();
}
