function showAlert(message, duration = 3000) {
  const alertBox = document.getElementById("alertBox");
  const alertMessage = alertBox.querySelector(".alert-message");

  alertMessage.textContent = message;
  alertBox.classList.add("show");

  setTimeout(() => {
    alertBox.classList.remove("show");
  }, duration);
}

function updateListCount(count) {
  document.querySelector(".list-count").textContent = count || 0;
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".container");
  const emptyState = document.getElementById("emptyState");
  const toolButtons = document.querySelectorAll(".tool-button");
  const searchInput = document.getElementById("search");
  const clearButton = document.getElementById("clearSearch");

  // Load saved tools from storage
  loadSavedTools();

  function loadSavedTools() {
    chrome.storage.local.get(["tools"], function (result) {
      const tools = result.tools || [];
      updateListCount(tools.length);
      if (!result.tools || tools.length === 0) {
        showEmptyState();
        toggleAddButton(false);
        toggleClearButton(false);
        toggleSearchBox(false);
      } else {
        hideEmptyState();
        toggleAddButton(true);
        toggleClearButton(true);
        toggleSearchBox(true);
        tools.forEach((tool) => createToolButton(tool));
      }
    });
  }

  function showEmptyState() {
    const emptyState = document.querySelector(".empty-state");
    emptyState.classList.add("visible");
    toggleSearchBox(false);
    toggleClearButton(false);
    toggleAddButton(false);
  }

  function hideEmptyState() {
    const emptyState = document.querySelector(".empty-state");
    emptyState.classList.remove("visible");
    toggleSearchBox(true);
    toggleClearButton(true);
    toggleAddButton(true);
  }

  function createToolButton(tool) {
    const newButton = document.createElement("button");
    newButton.className = "tool-button";
    newButton.setAttribute("data-url", tool.url);
    newButton.setAttribute("draggable", "true");

    // Create delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-tool-btn";
    deleteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;

    // Main button content
    newButton.innerHTML = `
      <img src="${tool.icon}" alt="${tool.name}" />
      ${tool.name}
    `;

    // Add delete button to tool button
    newButton.appendChild(deleteBtn);

    // Update the drag and drop event listeners
    newButton.addEventListener("dragstart", handleDragStart);
    newButton.addEventListener("dragend", handleDragEnd);
    newButton.addEventListener("dragover", handleDragOver);
    newButton.addEventListener("drop", handleDrop);

    // Add click handler for the main button
    newButton.addEventListener("click", (e) => {
      if (!e.target.closest(".delete-tool-btn")) {
        chrome.runtime.sendMessage({ action: "open_tab", url: tool.url });
      }
    });

    // Add click handler for delete button
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent main button click

      // Show confirmation modal with custom message for single tool deletion
      const confirmationModal = document.getElementById("confirmationModal");
      const modalTitle = confirmationModal.querySelector("h3");
      const modalMessage = confirmationModal.querySelector("p");

      modalTitle.textContent = "Delete this tool?";
      modalMessage.textContent = `Are you sure you want to delete ${tool.name}?`;

      // Store the tool data in the modal for reference
      confirmationModal.dataset.toolName = tool.name;
      confirmationModal.dataset.deleteType = "single";

      confirmationModal.classList.add("show");
    });

    container.appendChild(newButton);
  }

  // Drag and drop handlers
  let draggedItem = null;

  function handleDragStart(e) {
    draggedItem = this;
    this.style.opacity = "0.5";
    this.classList.add("dragging");
  }

  function handleDragEnd(e) {
    this.style.opacity = "1";
    this.classList.remove("dragging");
    draggedItem = null;
    updateToolsOrder();
  }

  function handleDragOver(e) {
    e.preventDefault();
    const target = e.currentTarget;

    if (target === draggedItem) return;

    // Get the rectangle of the target element
    const targetRect = target.getBoundingClientRect();
    const targetCenterX = targetRect.left + targetRect.width / 2;

    // Determine if we should place before or after based on mouse position
    if (e.clientX < targetCenterX) {
      target.parentNode.insertBefore(draggedItem, target);
    } else {
      target.parentNode.insertBefore(draggedItem, target.nextSibling);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const target = e.currentTarget;

    if (target === draggedItem) return;

    // Get all tools to find their positions
    const toolButtons = [...container.querySelectorAll(".tool-button")];
    const draggedIndex = toolButtons.indexOf(draggedItem);
    const droppedIndex = toolButtons.indexOf(target);

    // Swap the elements
    if (draggedIndex !== -1 && droppedIndex !== -1) {
      if (draggedIndex < droppedIndex) {
        target.parentNode.insertBefore(draggedItem, target.nextSibling);
      } else {
        target.parentNode.insertBefore(draggedItem, target);
      }
    }
  }

  function updateToolsOrder() {
    const toolButtons = document.querySelectorAll(".tool-button");
    const newOrder = [];

    toolButtons.forEach((button) => {
      newOrder.push({
        name: button.textContent.trim(),
        url: button.getAttribute("data-url"),
        icon: button.querySelector("img").src,
      });
    });

    chrome.storage.local.set({ tools: newOrder });
  }

  // Handle button clicks
  toolButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.getAttribute("data-url");
      chrome.runtime.sendMessage({ action: "open_tab", url });
    });
  });

  // Show|Hide clear button based on input
  searchInput.addEventListener("input", (event) => {
    const searchQuery = event.target.value.toLowerCase().trim();
    clearButton.style.display = searchQuery ? "block" : "none";

    // First check storage state
    chrome.storage.local.get(["tools"], function (result) {
      // If storage is empty or tools key doesn't exist, show empty toolbox state
      if (!result.tools || result.tools.length === 0) {
        emptyState.classList.add("visible");
        emptyState.querySelector("h3").textContent = "Your Toolbox is Empty";
        emptyState.querySelector("p").textContent =
          "Click the + button to add your first tool";
        document.querySelector(".empty-state-icon-button").style.display =
          "block";
        toggleSearchBox(false);
        toggleAddButton(false);
        toggleClearButton(false);
        return;
      }

      // Get all current tool buttons for search
      const currentToolButtons = document.querySelectorAll(".tool-button");

      // Handle search visibility
      currentToolButtons.forEach((button) => {
        const buttonText = button.textContent.toLowerCase().trim();
        const shouldShow = buttonText.includes(searchQuery);

        if (shouldShow) {
          button.style.display = "flex";
          button.style.opacity = "1";
          button.style.transform = "scale(1)";
        } else {
          button.style.opacity = "0";
          button.style.transform = "scale(0.8)";
          setTimeout(() => {
            if (!buttonText.includes(searchInput.value.toLowerCase().trim())) {
              button.style.display = "none";
            }
          }, 300);
        }
      });

      // Check for visible buttons after search
      const visibleButtons = Array.from(currentToolButtons).filter(
        (button) => button.style.display !== "none"
      );

      if (visibleButtons.length === 0 && searchQuery) {
        // Only show "No Tools Found" when there's a search query and no matches
        emptyState.classList.add("visible");
        emptyState.querySelector("h3").textContent = "No Tools Found";
        emptyState.querySelector("p").textContent =
          "Try a different search term";
        document.querySelector(".empty-state-icon-button").style.display =
          "none";
        // Keep search box and buttons visible since we have tools in storage
        toggleAddButton(true);
        toggleSearchBox(true);
        toggleClearButton(true);
      } else if (visibleButtons.length > 0) {
        // Hide empty state when we have visible tools
        emptyState.classList.remove("visible");
        toggleAddButton(true);
        toggleSearchBox(true);
        toggleClearButton(true);
      } else if (!searchQuery) {
        // When search is cleared and we have tools
        emptyState.classList.remove("visible");
        currentToolButtons.forEach((button) => {
          button.style.display = "flex";
          button.style.opacity = "1";
          button.style.transform = "scale(1)";
        });
        toggleAddButton(true);
        toggleSearchBox(true);
        toggleClearButton(true);
      }
    });
  });

  // Clear search functionality
  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    clearButton.style.display = "none";

    const currentToolButtons = document.querySelectorAll(".tool-button");

    // If there are no tools at all
    if (currentToolButtons.length === 0) {
      showEmptyState();
      emptyState.querySelector("h3").textContent = "Your Toolbox is Empty";
      emptyState.querySelector("p").textContent =
        "Click the + button to add your first tool";
      document.querySelector(".empty-state-icon-button").style.display =
        "block";
      toggleAddButton(false);
    } else {
      // If there are tools, show them all
      currentToolButtons.forEach((button) => {
        button.style.display = "flex";
        button.style.opacity = "1";
        button.style.transform = "scale(1)";
      });
      hideEmptyState();
      toggleAddButton(true);
    }

    searchInput.focus();
  });

  // Add Tool Modal Functionality
  const addButton = document.getElementById("addButton");
  const modal = document.getElementById("addToolModal");
  const cancelButton = document.getElementById("cancelAdd");
  const addToolForm = document.getElementById("addToolForm");

  addButton.addEventListener("click", () => {
    modal.classList.add("show");
  });

  cancelButton.addEventListener("click", () => {
    modal.classList.remove("show");
    addToolForm.reset();
  });

  addToolForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("toolName").value;
    const url = document.getElementById("toolUrl").value;
    const iconFile = document.getElementById("toolIcon").files[0];

    try {
      const base64Icon = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(iconFile);
      });

      const newTool = { name, url, icon: base64Icon };

      // Save to storage
      chrome.storage.local.get(["tools"], function (result) {
        const tools = result.tools || [];
        tools.push(newTool);
        chrome.storage.local.set({ tools }, function () {
          updateListCount(tools.length);
          hideEmptyState();
          createToolButton(newTool);
          toggleAddButton(true);
          toggleClearButton(true);

          // Reset form and hide modal
          addToolForm.reset();
          modal.classList.remove("show");
          showAlert(`${name} has been successfully added! 🚀`);
        });
      });
    } catch (error) {
      showAlert("Oops! Something went wrong. Please try again. 😕");
    }
  });

  // Clear storage functionality
  const clearStorageBtn = document.getElementById("clearStorage");
  const confirmationModal = document.getElementById("confirmationModal");
  const cancelClearBtn = document.getElementById("cancelClear");
  const confirmClearBtn = document.getElementById("confirmClear");

  clearStorageBtn.addEventListener("click", () => {
    const confirmationModal = document.getElementById("confirmationModal");
    const modalTitle = confirmationModal.querySelector("h3");
    const modalMessage = confirmationModal.querySelector("p");

    modalTitle.textContent = "Delete All Tools?";
    modalMessage.textContent =
      "Do you want to continue this process? All tools will be permanently deleted.";

    confirmationModal.dataset.deleteType = "all";
    confirmationModal.classList.add("show");
  });

  cancelClearBtn.addEventListener("click", () => {
    confirmationModal.classList.remove("show");
  });

  confirmClearBtn.addEventListener("click", () => {
    const confirmationModal = document.getElementById("confirmationModal");
    const deleteType = confirmationModal.dataset.deleteType;

    if (deleteType === "single") {
      const toolName = confirmationModal.dataset.toolName;
      // Get current tools from storage
      chrome.storage.local.get(["tools"], function (result) {
        const tools = result.tools || [];
        // Filter out the clicked tool
        const updatedTools = tools.filter((t) => t.name !== toolName);

        // Find the button to remove
        const buttonToRemove = Array.from(
          document.querySelectorAll(".tool-button")
        ).find((btn) => btn.textContent.trim().includes(toolName));

        if (updatedTools.length === 0) {
          chrome.storage.local.remove(["tools"], function () {
            updateListCount(0);
            // Update empty state before removing the button
            const emptyState = document.getElementById("emptyState");
            emptyState.classList.add("visible");
            emptyState.querySelector("h3").textContent =
              "Your Toolbox is Empty";
            emptyState.querySelector("p").textContent =
              "Click the + button to add your first tool";
            document.querySelector(".empty-state-icon-button").style.display =
              "block";

            removeToolButton(buttonToRemove);
            toggleSearchBox(false);
            toggleAddButton(false);
            toggleClearButton(false);
            showAlert(`${toolName} has been removed! 🗑️`);
          });
        } else {
          chrome.storage.local.set({ tools: updatedTools }, function () {
            updateListCount(updatedTools.length);
            removeToolButton(buttonToRemove);
            showAlert(`${toolName} has been removed! 🗑️`);
          });
        }
      });
    } else {
      // Clear all functionality
      chrome.storage.local.remove(["tools"], function () {
        updateListCount(0);
        const toolButtons = document.querySelectorAll(".tool-button");
        toolButtons.forEach((button) => button.remove());

        const searchInput = document.getElementById("search");
        const clearButton = document.getElementById("clearSearch");
        searchInput.value = "";
        clearButton.style.display = "none";

        // Update empty state with correct message
        const emptyState = document.getElementById("emptyState");
        emptyState.classList.add("visible");
        emptyState.querySelector("h3").textContent = "Your Toolbox is Empty";
        emptyState.querySelector("p").textContent =
          "Click the + button to add your first tool";
        document.querySelector(".empty-state-icon-button").style.display =
          "block";

        toggleSearchBox(false);
        toggleAddButton(false);
        toggleClearButton(false);
        showAlert("All tools have been successfully deleted! 🗑️");
      });
    }

    confirmationModal.classList.remove("show");
  });

  // Close modal when clicking outside
  confirmationModal.addEventListener("click", (e) => {
    if (e.target === confirmationModal) {
      confirmationModal.classList.remove("show");
    }
  });

  // Add this function to control clear button visibility
  function toggleClearButton(show) {
    const clearStorageBtn = document.getElementById("clearStorage");
    if (show) {
      clearStorageBtn.classList.add("visible");
    } else {
      clearStorageBtn.classList.remove("visible");
    }
  }

  // Add this function to control add button visibility
  function toggleAddButton(show) {
    const addButton = document.getElementById("addButton");
    if (show) {
      addButton.classList.add("visible");
    } else {
      addButton.classList.remove("visible");
    }
  }

  // Add click handler for empty state icon
  document
    .querySelector(".empty-state-icon-button")
    .addEventListener("click", () => {
      const modal = document.getElementById("addToolModal");
      modal.classList.add("show");
    });

  // Add this function to handle input div visibility
  function toggleSearchBox(show) {
    const inputDiv = document.querySelector(".inputDiv");
    const container = document.querySelector(".container");
    const searchInput = document.getElementById("search");
    const clearButton = document.getElementById("clearSearch");

    if (show) {
      inputDiv.classList.remove("hidden");
      container.classList.remove("full-height");
    } else {
      inputDiv.classList.add("hidden");
      container.classList.add("full-height");
      // Clear search when hiding
      if (searchInput) {
        searchInput.value = "";
      }
      if (clearButton) {
        clearButton.style.display = "none";
      }
    }
  }

  // Add this helper function for removing tool buttons with animation
  function removeToolButton(button) {
    button.style.opacity = "0";
    button.style.transform = "scale(0.8)";

    setTimeout(() => {
      button.remove();

      // Check if this was the last tool
      const remainingTools = document.querySelectorAll(".tool-button");
      if (remainingTools.length === 0) {
        const emptyState = document.getElementById("emptyState");
        emptyState.classList.add("visible");
        emptyState.querySelector("h3").textContent = "Your Toolbox is Empty";
        emptyState.querySelector("p").textContent =
          "Click the + button to add your first tool";
        document.querySelector(".empty-state-icon-button").style.display =
          "block";

        showEmptyState();
        toggleSearchBox(false);
        toggleAddButton(false);
        toggleClearButton(false);
      }
    }, 300);
  }
});
