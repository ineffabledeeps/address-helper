// --- 1. INDEXEDDB SETUP ---
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_CONFIG.objectStore)) {
        db.createObjectStore(DB_CONFIG.objectStore, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.error("❌ Address Helper Popup DB Error:", request.error);
      reject(request.error);
    };
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("📱 Address Helper Popup: UI Opened.");
  loadProfilesDropdown();
});

// New Listener: Dispatches a message to content.js to force open the sidebar layout
document.getElementById("openSidebarBtn").addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showStatus("No active tab found!", "red");
      return;
    }
    
    console.log("📱 Address Helper Popup: Sending trigger message to display sidebar.");
    chrome.tabs.sendMessage(tab.id, { action: "OPEN_SIDEBAR" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("⚠️ Address Helper Popup: Content script not ready on this page.", chrome.runtime.lastError);
        showStatus("Make sure you're on innofulfill.com", "red");
      } else if (response?.status === "success") {
        console.log("✅ Address Helper Popup: Sidebar opened successfully.");
        showStatus("Sidebar opened!", "green");
      }
    });
  } catch (err) {
    console.error("❌ Address Helper Popup Error:", err);
    showStatus("Error opening sidebar", "red");
  }
});

async function loadProfilesDropdown() {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_CONFIG.objectStore, "readonly");
    const store = tx.objectStore(DB_CONFIG.objectStore);
    const request = store.getAll();

    request.onsuccess = () => {
      const profiles = request.result;
      console.log(`📱 Address Helper Popup: Loaded ${profiles.length} profiles into dropdown list.`);
      const select = document.getElementById("profileSelect");
      select.innerHTML = '<option value="">-- Choose a profile --</option>';
      
      const sorted = profiles.sort((a, b) => b.timestamp - a.timestamp);

      sorted.forEach(profile => {
        if (profile && profile.id && profile.name) {
          const option = document.createElement("option");
          option.value = profile.id;
          option.textContent = profile.name;
          select.appendChild(option);
        }
      });
    };

    request.onerror = () => {
      console.error("❌ Address Helper Popup DB Error:", request.error);
      showStatus("Error loading profiles", "red");
    };
  } catch (err) {
    console.error("❌ Address Helper Popup Error: Dropdown population failed.", err);
    showStatus("Error loading profiles", "red");
  }
}

document.getElementById("fillBtn").addEventListener("click", async () => {
  try {
    const selectedProfileId = document.getElementById("profileSelect").value;
    if (!selectedProfileId) {
      showStatus("Please select a profile to fill!", "red");
      return;
    }

    console.log(`📱 Address Helper Popup: Autofill button clicked for profile ID: "${selectedProfileId}"`);

    const db = await openDB();
    const tx = db.transaction(DB_CONFIG.objectStore, "readonly");
    const store = tx.objectStore(DB_CONFIG.objectStore);
    const request = store.get(selectedProfileId);

    request.onsuccess = async () => {
      const profile = request.result;
      if (!profile || !profile.fields) {
        console.warn("⚠️ Address Helper Popup: Requested profile data missing or invalid in DB.");
        showStatus("Profile data is invalid", "red");
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        showStatus("No active tab found", "red");
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (savedFields) => {
          FIELD_DEFINITIONS.forEach(field => {
            const el = document.querySelector(field.selector);
            let savedValue = savedFields[field.key];
            
            // Replace specific KYC number
            if (field.key === 'kycNumber' && savedValue === '731737310286') {
              savedValue = '123456789012';
              console.log(`🔄 Address Helper: Replaced KYC number 731737310286 with 123456789012`);
            }
            
            if (el && savedValue !== undefined) {
              el.value = savedValue;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
        },
        args: [profile.fields]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("❌ Address Helper Popup Script Error:", chrome.runtime.lastError);
          showStatus("Failed to fill form", "red");
        } else {
          console.log("📱 Address Helper Popup: Form filled successfully.");
          showStatus(`Filled details successfully!`, "green");
        }
      });
    };

    request.onerror = () => {
      console.error("❌ Address Helper Popup DB Error:", request.error);
      showStatus("Error retrieving profile", "red");
    };
  } catch (err) {
    console.error("❌ Address Helper Popup Error:", err);
    showStatus("Error during autofill", "red");
  }
});

function showStatus(text, color) {
  const div = document.getElementById("status");
  div.innerText = text;
  div.style.color = color;
  setTimeout(() => div.innerText = "", 3000);
}