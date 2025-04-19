const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const typing = document.getElementById("typing-indicator");
const shortcutPanel = document.querySelector(".shortcuts");
let currentMode = "student"; // default
const modeSelect = document.getElementById("user-mode");

let threads = JSON.parse(localStorage.getItem("fairusebot_threads") || "[]");
let currentThreadId = null;

function generateThreadId() {
  return "thread-" + Date.now();
}

function saveThreads() {
  localStorage.setItem("fairusebot_threads", JSON.stringify(threads));
}

function renderThreadList() {
  const threadList = document.getElementById("thread-list");
  threadList.innerHTML = "";
  threads.forEach(thread => {
    const li = document.createElement("li");
    li.className = "thread-item" + (thread.id === currentThreadId ? " active" : "");
    li.textContent = thread.title || "Untitled Thread";
    li.title = thread.title || "Untitled Thread";
    li.setAttribute('data-thread-id', thread.id); // Use data attribute
    threadList.appendChild(li);
  });
}

function startNewThread() {
  const newThread = {
    id: generateThreadId(),
    title: "New Thread",
    messages: []
  };
  threads.unshift(newThread);
  currentThreadId = newThread.id;
  saveThreads();
  renderThreadList();
  renderThreadMessages();
}


function switchThread(id) {
  currentThreadId = id;
  renderThreadList();
  renderThreadMessages();
}

function renderThreadMessages() {
  chatBox.innerHTML = "";
  const thread = threads.find(t => t.id === currentThreadId);
  if (!thread) return;
  thread.messages.forEach(msg => {
    addMessage(msg.sender, msg.text, msg.type, false);
  });
}

function addMessage(sender, text, type, save = true) {
  const message = document.createElement("div");
  message.classList.add("message", type);
  message.innerHTML = `<strong>${sender}:</strong><br>${marked.parse(text)}`;
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;


  if (save && currentThreadId) {
    const thread = threads.find(t => t.id === currentThreadId);
    if (thread) {
      thread.messages.push({ sender, text, type });
      
      if (thread.title === "New Thread" && type === "user") {
        thread.title = text.slice(0, 30) + (text.length > 30 ? "..." : "");
      }
      saveThreads();
      renderThreadList();
    }
  }
}

function updateDynamicShortcuts(message) {
  shortcutPanel.innerHTML = "";

  if (currentMode === "student") {
    addShortcut("📚 Educational Fair Use", "Can students use this under fair use in a school project?");
  } else if (currentMode === "influencer") {
    addShortcut("📣 Sponsored Use", "Can I use this in a TikTok or Instagram ad? [insert use case]");
  } else if (currentMode === "nonprofit") {
    addShortcut("🤝 Nonprofit Exception", "Does being a nonprofit help my case for using this content?");
  } else if (currentMode === "artist") {
    addShortcut("🎨 Remix Rights", "Can I remix this into a new piece and still be safe?");
  }

  addShortcut("🔍 Link Scanner", "Can you analyze the licensing of this content for me? [insert URL]");
  addShortcut("💡 Ethics Tips", "Is it ethical to use this even if it's technically allowed?");
}

function addShortcut(label, template) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.type = "button";
  btn.setAttribute("data-template", template);
  btn.addEventListener("click", () => {
    input.value = template;
    input.focus();
  });
  shortcutPanel.appendChild(btn);
}


modeSelect.addEventListener("change", () => {
  currentMode = modeSelect.value;
  updateDynamicShortcuts("");
});


form.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("💬 Form submitted!");

  const userMessage = input.value.trim();
  if (!userMessage) return;

  console.log("📨 Sending message:", userMessage, "Mode:", currentMode);

  addMessage("You", userMessage, "user");
  input.value = "";
  typing.style.display = "block";

  try {
    const res = await fetch("http://127.0.0.1:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: userMessage,
        mode: currentMode
      })
    });

    const data = await res.json();
    addMessage("FairUseBot", data.response, "bot");

    if (data.cc_audio_html) {
      const audioSection = document.createElement("div");
      audioSection.classList.add("message", "bot");
      audioSection.innerHTML = `<strong>🎵 Suggested Tracks:</strong><br><br>${data.cc_audio_html}`;
      chatBox.appendChild(audioSection);
      
      
      if (currentThreadId) {
        const thread = threads.find(t => t.id === currentThreadId);
        if (thread) {
          thread.messages.push({ 
            sender: "FairUseBot", 
            text: `<strong>🎵 Suggested Tracks:</strong><br><br>${data.cc_audio_html}`, 
            type: "bot" 
          });
          saveThreads();
        }
      }
    }

  } catch (err) {
    console.error("❌ Fetch error:", err);
    addMessage("Error", "Something went wrong 😢", "bot");
  } finally {
    typing.style.display = "none";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  
  if (threads.length === 0) startNewThread();
  else {
    currentThreadId = threads[0].id;
    renderThreadList();
    renderThreadMessages();
  }
  

  updateDynamicShortcuts("");
  

  const newThreadBtn = document.getElementById("new-thread-btn");
  if (newThreadBtn) {
    newThreadBtn.onclick = startNewThread;
  }
});


input.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
