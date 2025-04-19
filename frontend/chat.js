const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const typing = document.getElementById("typing-indicator");

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
      body: JSON.stringify({ query: userMessage })
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
