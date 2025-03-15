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
  const listCount = document.querySelector(".list-count");
  listCount.textContent = count || 0;
  listCount.style.display = count > 0 ? "flex" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".container");
  const emptyState = document.getElementById("emptyState");
  const toolButtons = document.querySelectorAll(".tool-button");
  const searchInput = document.getElementById("search");
  const clearButton = document.getElementById("clearSearch");
  const editButton = document.getElementById("editButton");
  let isEditMode = false;

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
        toggleAboutButton(false);
      } else {
        hideEmptyState();
        toggleAddButton(true);
        toggleClearButton(true);
        toggleSearchBox(true);
        toggleAboutButton(true);
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
    // Only set draggable in edit mode
    newButton.setAttribute("draggable", isEditMode);

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

    // Add delete button to tool button only if in edit mode
    if (isEditMode) {
      newButton.appendChild(deleteBtn);
    }

    // Update the drag and drop event listeners
    newButton.addEventListener("dragstart", handleDragStart);
    newButton.addEventListener("dragend", handleDragEnd);
    newButton.addEventListener("dragover", handleDragOver);
    newButton.addEventListener("drop", handleDrop);

    // Add click handler for the main button
    newButton.addEventListener("click", (e) => {
      // Only open URL if not in edit mode and not clicking delete button
      if (!isEditMode && !e.target.closest(".delete-tool-btn")) {
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

    if (isEditMode) {
      newButton.classList.add("edit-mode");
    }

    container.appendChild(newButton);
  }

  // Drag and drop handlers
  let draggedItem = null;

  function handleDragStart(e) {
    if (!isEditMode) {
      e.preventDefault();
      return;
    }
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
    if (!isEditMode) {
      e.preventDefault();
      return;
    }
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
    if (!isEditMode) {
      e.preventDefault();
      return;
    }
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
    modal.dataset.mode = "add";
    modal.querySelector("h2").textContent = "Add New Tool";
    modal.querySelector(".submit-btn").textContent = "Add Tool";
    addToolForm.reset();
  });

  addToolForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("toolName").value;
    const url = document.getElementById("toolUrl").value;
    const iconFile = document.getElementById("toolIcon").files[0];
    const modal = document.getElementById("addToolModal");
    const isEditMode = modal.dataset.mode === "edit";

    try {
      let icon;
      if (iconFile) {
        // If new icon is uploaded, use it
        icon = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(iconFile);
        });
      } else if (isEditMode) {
        // In edit mode, if no new icon, keep existing one
        icon = modal.dataset.currentIcon;
      }

      const newTool = { name, url, icon };

      // Save to storage
      chrome.storage.local.get(["tools"], function (result) {
        const tools = result.tools || [];

        if (isEditMode) {
          // Update existing tool
          const originalName = modal.dataset.originalName;
          const toolIndex = tools.findIndex((t) => t.name === originalName);
          if (toolIndex !== -1) {
            tools[toolIndex] = newTool;

            // Update the button in the UI
            const button = Array.from(
              document.querySelectorAll(".tool-button")
            ).find((btn) => btn.textContent.trim() === originalName);

            if (button) {
              // Recreate button content
              button.innerHTML = `
                    <img src="${newTool.icon}" alt="${newTool.name}" />
                    ${newTool.name}
                `;
              button.setAttribute("data-url", newTool.url);

              // Re-add edit and delete buttons if in edit mode
              if (isEditMode) {
                const editBtn = document.createElement("button");
                editBtn.className = "edit-tool-btn";
                editBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18 2l4 4-10 10-4 1 1-4 9-11z"/>
                        </svg>
                    `;

                const deleteBtn = document.createElement("button");
                deleteBtn.className = "delete-tool-btn";
                deleteBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    `;

                // Re-add click handlers
                editBtn.addEventListener("click", (e) => {
                  e.stopPropagation();
                  const toolName = button.textContent.trim();
                  const toolUrl = button.getAttribute("data-url");
                  const toolIcon = button.querySelector("img").src;

                  const modal = document.getElementById("addToolModal");
                  const modalTitle = modal.querySelector("h2");
                  const submitBtn = modal.querySelector(".submit-btn");

                  modal.dataset.mode = "edit";
                  modal.dataset.originalName = toolName;
                  modal.dataset.currentIcon = toolIcon;
                  modalTitle.textContent = "Edit Tool";
                  submitBtn.textContent = "Save Changes";

                  document.getElementById("toolName").value = toolName;
                  document.getElementById("toolUrl").value = toolUrl;
                  document.getElementById("toolIcon").required = false;
                  modal.classList.add("show");
                });

                deleteBtn.addEventListener("click", (e) => {
                  e.stopPropagation();
                  const toolName = button.textContent.trim();
                  const confirmationModal =
                    document.getElementById("confirmationModal");
                  const modalTitle = confirmationModal.querySelector("h3");
                  const modalMessage = confirmationModal.querySelector("p");

                  modalTitle.textContent = "Delete this tool?";
                  modalMessage.textContent = `Are you sure you want to delete ${toolName}?`;

                  confirmationModal.dataset.toolName = toolName;
                  confirmationModal.dataset.deleteType = "single";
                  confirmationModal.classList.add("show");
                });

                button.appendChild(editBtn);
                button.appendChild(deleteBtn);
              }
            }
          }
        } else {
          // Add new tool
          tools.push(newTool);
          createToolButton(newTool);
        }

        chrome.storage.local.set({ tools }, function () {
          updateListCount(tools.length);
          hideEmptyState();
          toggleAddButton(true);
          toggleClearButton(true);

          // Reset form and hide modal
          addToolForm.reset();
          modal.classList.remove("show");
          modal.dataset.mode = "add";
          modal.querySelector("h2").textContent = "Add New Tool";
          modal.querySelector(".submit-btn").textContent = "Add Tool";
          showAlert(
            isEditMode
              ? `${name} has been successfully updated!`
              : `${name} has been successfully added!`
          );
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
            showAlert(`${toolName} has been removed!`);
          });
        } else {
          chrome.storage.local.set({ tools: updatedTools }, function () {
            updateListCount(updatedTools.length);
            removeToolButton(buttonToRemove);
            showAlert(`${toolName} has been removed!`);
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
        showAlert("All tools have been successfully deleted!");
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
    const editButton = document.getElementById("editButton");
    if (show) {
      addButton.classList.add("visible");
      editButton.classList.add("visible");
    } else {
      addButton.classList.remove("visible");
      editButton.classList.remove("visible");
      toggleEditMode(false); // Disable edit mode when hiding buttons
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

  function toggleEditMode(enabled) {
    isEditMode = enabled;
    const toolButtons = document.querySelectorAll(".tool-button");
    const addButton = document.getElementById("addButton");
    const clearStorageBtn = document.getElementById("clearStorage");
    const aboutButton = document.getElementById("aboutButton"); // Add this line

    addButton.classList.toggle("disabled", enabled);
    clearStorageBtn.classList.toggle("disabled", enabled);
    aboutButton.classList.toggle("disabled", enabled); // Add this line

    toolButtons.forEach((button) => {
      button.setAttribute("draggable", enabled);
      if (enabled) {
        button.classList.add("edit-mode");
        if (!button.querySelector(".delete-tool-btn")) {
          // Create delete button
          const deleteBtn = document.createElement("button");
          deleteBtn.className = "delete-tool-btn";
          deleteBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          `;

          // Create edit button
          const editBtn = document.createElement("button");
          editBtn.className = "edit-tool-btn";
          editBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18 2l4 4-10 10-4 1 1-4 9-11z"/>
            </svg>
          `;

          button.appendChild(editBtn);
          button.appendChild(deleteBtn);

          // Add click handler for edit button
          editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const toolName = button.textContent.trim();
            const toolUrl = button.getAttribute("data-url");
            const toolIcon = button.querySelector("img").src;

            // Show add modal with pre-filled data
            const modal = document.getElementById("addToolModal");
            const modalTitle = modal.querySelector("h2");
            const submitBtn = modal.querySelector(".submit-btn");

            // Set modal to edit mode
            modal.dataset.mode = "edit";
            modal.dataset.originalName = toolName;
            modal.dataset.currentIcon = toolIcon; // Store current icon
            modalTitle.textContent = "Edit Tool";
            submitBtn.textContent = "Save Changes";

            // Pre-fill form
            document.getElementById("toolName").value = toolName;
            document.getElementById("toolUrl").value = toolUrl;
            // Make icon field optional
            document.getElementById("toolIcon").required = false;
            modal.classList.add("show");
          });

          // Existing delete button click handler
          deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const toolName = button.textContent.trim();
            const confirmationModal =
              document.getElementById("confirmationModal");
            const modalTitle = confirmationModal.querySelector("h3");
            const modalMessage = confirmationModal.querySelector("p");

            modalTitle.textContent = "Delete this tool?";
            modalMessage.textContent = `Are you sure you want to delete ${toolName}?`;

            confirmationModal.dataset.toolName = toolName;
            confirmationModal.dataset.deleteType = "single";

            confirmationModal.classList.add("show");
          });
        }
      } else {
        button.classList.remove("edit-mode");
        const deleteBtn = button.querySelector(".delete-tool-btn");
        const editBtn = button.querySelector(".edit-tool-btn");
        if (deleteBtn) deleteBtn.remove();
        if (editBtn) editBtn.remove();
      }
    });

    editButton.classList.toggle("active", enabled);
  }

  editButton.addEventListener("click", () => {
    toggleEditMode(!isEditMode);
  });

  // About button functionality
  const aboutButton = document.getElementById("aboutButton");
  const aboutModal = document.getElementById("aboutModal");
  const closeAbout = document.querySelector(".close-about");

  // Show About button when tools are present
  function toggleAboutButton(show) {
    aboutButton.classList.toggle("visible", show);
  }

  aboutButton.addEventListener("click", () => {
    // Don't open modal if button is disabled
    if (aboutButton.classList.contains("disabled")) return;
    aboutModal.classList.add("show");
  });

  closeAbout.addEventListener("click", () => {
    aboutModal.classList.remove("show");
  });

  // Close modal when clicking outside
  aboutModal.addEventListener("click", (e) => {
    if (e.target === aboutModal) {
      aboutModal.classList.remove("show");
    }
  });

  // Close modal with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && aboutModal.classList.contains("show")) {
      aboutModal.classList.remove("show");
    }
  });
});
