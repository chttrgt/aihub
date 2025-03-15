export function showAlert(message, duration = 3000) {
  const alertBox = document.getElementById("alertBox");
  const alertMessage = alertBox.querySelector(".alert-message");
  alertMessage.textContent = message;
  alertBox.classList.add("show");
  setTimeout(() => {
    alertBox.classList.remove("show");
  }, duration);
}

export function updateListCount(count) {
  const listCount = document.querySelector(".list-count");
  listCount.textContent = count || 0;
  listCount.style.display = count > 0 ? "flex" : "none";
}
