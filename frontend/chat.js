const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const typing = document.getElementById("typing-indicator");
const shortcutPanel = document.querySelector(".shortcuts");
let currentMode = "student"; 
const modeSelect = document.getElementById("user-mode");

let threads = JSON.parse(localStorage.getItem("fairusebot_threads") || "[]");
let currentThreadId = null;
let contextMenu = document.getElementById("thread-context-menu");
let contextMenuActive = false;
let contextMenuTargetId = null;


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
    li.setAttribute('data-thread-id', thread.id);

    const titleSpan = document.createElement("span");
    titleSpan.className = "thread-title";
    titleSpan.textContent = thread.title || "Untitled Thread";
    titleSpan.title = thread.title || "Untitled Thread";
    titleSpan.style.cursor = "pointer";

    titleSpan.addEventListener("dblclick", function(e) {
      e.stopPropagation();
      makeThreadTitleEditable(li, thread);
    });

    li.appendChild(titleSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "thread-delete";
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.title = "Delete thread";
    deleteBtn.setAttribute('data-thread-id', thread.id);

    deleteBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      deleteThread(thread.id);
    });

    li.appendChild(deleteBtn);
    threadList.appendChild(li);
  });
}

function switchThread(id) {
  console.log("Switching thread:", id); 
  
  if (id === currentThreadId) {
    console.log("Already on this thread");
    return;
  }
  
  currentThreadId = id;
  
  const thread = threads.find(t => t.id === id);
  if (!thread) {
    console.error("Thread not found:", id);
    return;
  }
  renderThreadList(); 
  renderThreadMessages(); 
}

function deleteThread(id) {
  if (confirm("Are you sure you want to delete this thread?")) {
    console.log("Deleting thread:", id);

    const threadIndex = threads.findIndex(t => t.id === id);
    if (threadIndex === -1) return;
    
    threads.splice(threadIndex, 1);
    
    saveThreads();

    if (id === currentThreadId) {
      
      if (threads.length > 0) {
        currentThreadId = threads[0].id;
      } else {
        startNewThread();
        return; 
      }
    }
    
    renderThreadList();
    renderThreadMessages();
  }
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
  

document.getElementById('thread-list').addEventListener('click', function(e) {
    const threadItem = e.target.closest('.thread-item');
    if (threadItem) {
      const threadId = threadItem.getAttribute('data-thread-id');
      if (threadId) {
        console.log("Switching to thread:", threadId);
        switchThread(threadId);
      }
    }
  });


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

document.addEventListener("DOMContentLoaded", function() {
  initContextMenu();
});


function initContextMenu() {
  contextMenu = document.getElementById("thread-context-menu");
  
  document.addEventListener("click", function(e) {
    if (contextMenuActive && !contextMenu.contains(e.target)) {
      toggleContextMenu(false);
    }
  });

  document.addEventListener("keyup", function(e) {
    if (e.key === "Escape" && contextMenuActive) {
      toggleContextMenu(false);
    }
  });
}

function toggleContextMenu(show, x, y) {
  if (show && contextMenuTargetId) {
    contextMenu.style.left = x + "px";
    contextMenu.style.top = y + "px";
    contextMenu.classList.add("context-menu--active");
    contextMenuActive = true;
  } else {
    contextMenu.classList.remove("context-menu--active");
    contextMenuActive = false;
    contextMenuTargetId = null;
  }
}

function renameThread(id) {
  const thread = threads.find(t => t.id === id);
  if (!thread) return;
  
  const newTitle = prompt("Enter a new name for this thread:", thread.title);
  
  if (newTitle !== null && newTitle.trim() !== "") {
    thread.title = newTitle.trim();
    saveThreads();
    renderThreadList();
  }
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


function makeThreadTitleEditable(li, thread) {

  const oldInput = li.querySelector("input.thread-title-input");
  if (oldInput) return;

  const titleSpan = li.querySelector(".thread-title");
  const oldTitle = thread.title || "Untitled Thread";

  const input = document.createElement("input");
  input.type = "text";
  input.value = oldTitle;
  input.className = "thread-title-input";
  input.style.width = "80%";
  input.style.fontSize = "1rem";
  input.style.padding = "2px 6px";
  input.style.borderRadius = "0.5rem";
  input.style.border = "1px solid #b86adf";
  input.style.marginRight = "0.5rem";

  li.replaceChild(input, titleSpan);
  input.focus();
  input.select();

  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      finishRename();
    } else if (e.key === "Escape") {
      cancelRename();
    }
  });
  input.addEventListener("blur", finishRename);

  function finishRename() {
    const newTitle = input.value.trim() || "Untitled Thread";
    thread.title = newTitle;
    saveThreads();
    renderThreadList();
  }
  function cancelRename() {
    renderThreadList();
  }
}

document.addEventListener('DOMContentLoaded', function() {

  const dropup = document.querySelector('.custom-dropup');
  const selectedButton = document.getElementById('selected-mode');
  const selectedText = document.getElementById('selected-mode-text');
  const options = document.querySelectorAll('.dropup-option');

  let currentMode = "student";
  
  selectedButton.addEventListener('click', function(e) {
    e.stopPropagation();
    dropup.classList.toggle('open');
  });
  
  document.addEventListener('click', function() {
    dropup.classList.remove('open');
  });
  
  dropup.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  options.forEach(option => {
    option.addEventListener('click', function() {
      
      const value = this.getAttribute('data-value');
      const text = this.textContent;
      
      selectedText.textContent = text;
      
      options.forEach(opt => opt.classList.remove('selected'));
      this.classList.add('selected');
      
      dropup.classList.remove('open');
      
      currentMode = value;
      
      updateDynamicShortcuts("");
    });
  });
  
  options.forEach(option => {
    if (option.getAttribute('data-value') === currentMode) {
      option.classList.add('selected');
    }
  });
});
