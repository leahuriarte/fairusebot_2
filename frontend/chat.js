const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const typing = document.getElementById("typing-indicator");


let currentMode = "student"; // default
const modeSelect = document.getElementById("user-mode");

modeSelect.addEventListener("change", () => {
  currentMode = modeSelect.value;
  updateDynamicShortcuts(""); // optionally refresh buttons
});


// 🟣 Handle form submit (Enter or button)
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userMessage = input.value.trim();
  if (!userMessage) return;

  addMessage("You", userMessage, "user");
  input.value = "";

  typing.style.display = "block";

  
  try {
    const res = await fetch("http://127.0.0.1:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: userMessage,
        mode: currentMode // 👈 pass the current user mode to your backend
      })
    });

    const data = await res.json();
    addMessage("FairUseBot", data.response, "bot");

    if (data.cc_audio_html) {
      const audioSection = document.createElement("div");
      audioSection.classList.add("message", "bot");
      audioSection.innerHTML = `<strong>🎵 Suggested Tracks:</strong><br><br>${data.cc_audio_html}`;
      chatBox.appendChild(audioSection);
    }

  } catch (err) {
    addMessage("Error", "Something went wrong 😢", "bot");
  } finally {
    typing.style.display = "none";
  }
});

// 🟣 Handle shortcut click – just fill input, don’t send
document.querySelectorAll(".shortcuts button").forEach(btn => {
  btn.addEventListener("click", () => {
    const template = btn.getAttribute("data-template");
    input.value = template;
    input.focus();
  });
});


// 🟣 Handle Enter key inside input manually, but defer to form submission
input.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit(); // triggers form submit event
  }
});


function updateDynamicShortcuts(message) {
  const keywords = message.toLowerCase();

  shortcutPanel.innerHTML = "";

  // Add mode-specific prompts
  if (currentMode === "student") {
    addShortcut("📚 Educational Fair Use", "Can students use this under fair use in a school project?");
  } else if (currentMode === "influencer") {
    addShortcut("📣 Sponsored Use", "Can I use this in a TikTok or Instagram ad? [insert use case]");
  } else if (currentMode === "nonprofit") {
    addShortcut("🤝 Nonprofit Exception", "Does being a nonprofit help my case for using this content?");
  } else if (currentMode === "artist") {
    addShortcut("🎨 Remix Rights", "Can I remix this into a new piece and still be safe?");
  }

  // Add generic ones too
  addShortcut("🔍 Link Scanner", "Can you analyze the licensing of this content for me? [insert URL]");
  addShortcut("💡 Ethics Tips", "Is it ethical to use this even if it’s technically allowed?");
}
