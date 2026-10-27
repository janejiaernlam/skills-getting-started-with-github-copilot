document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function confirmUnregister(email, activityName) {
    return new Promise((resolve) => {
      const dialog = document.createElement("dialog");
      dialog.className = "confirm-dialog";
      dialog.setAttribute("aria-labelledby", "unregister-dialog-title");
      dialog.setAttribute("aria-describedby", "unregister-dialog-description");

      const heading = document.createElement("h2");
      heading.id = "unregister-dialog-title";
      heading.textContent = "Unregister participant?";

      const description = document.createElement("p");
      description.id = "unregister-dialog-description";
      description.textContent = `Are you sure you want to unregister ${email} from ${activityName}?`;

      const actions = document.createElement("div");
      actions.className = "confirm-dialog-actions";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "confirm-cancel";
      cancelButton.textContent = "Cancel";

      const confirmButton = document.createElement("button");
      confirmButton.type = "button";
      confirmButton.className = "confirm-delete";
      confirmButton.textContent = "Yes, unregister";

      const finish = (confirmed) => {
        dialog.close();
        dialog.remove();
        resolve(confirmed);
      };

      cancelButton.addEventListener("click", () => finish(false));
      confirmButton.addEventListener("click", () => finish(true));
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finish(false);
      }, { once: true });

      actions.append(cancelButton, confirmButton);
      dialog.append(heading, description, actions);
      document.body.appendChild(dialog);
      dialog.showModal();
      cancelButton.focus();
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants";

        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = `Participants (${details.participants.length})`;
        participantsSection.appendChild(participantsHeading);

        if (details.participants.length > 0) {
          const participantsList = document.createElement("ul");
          participantsList.className = "participants-list";

          details.participants.forEach((email) => {
            const participant = document.createElement("li");

            const participantEmail = document.createElement("span");
            participantEmail.textContent = email;
            participant.appendChild(participantEmail);

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "participants-remove";
            removeButton.textContent = "×";
            removeButton.title = `Unregister ${email}`;
            removeButton.setAttribute("aria-label", `Unregister ${email} from ${name}`);
            removeButton.addEventListener("click", async () => {
              const confirmed = await confirmUnregister(email, name);
              if (!confirmed) {
                return;
              }

              removeButton.disabled = true;

              try {
                const response = await fetch(
                  `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(email)}`,
                  { method: "DELETE" }
                );
                const result = await response.json();

                if (!response.ok) {
                  throw new Error(result.detail || "Failed to unregister participant");
                }

                await fetchActivities();
              } catch (error) {
                removeButton.disabled = false;
                messageDiv.textContent = error.message || "Failed to unregister participant";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
              }
            });
            participant.appendChild(removeButton);
            participantsList.appendChild(participant);
          });

          participantsSection.appendChild(participantsList);
        } else {
          const emptyMessage = document.createElement("p");
          emptyMessage.className = "participants-empty";
          emptyMessage.textContent = "No participants yet";
          participantsSection.appendChild(emptyMessage);
        }

        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
