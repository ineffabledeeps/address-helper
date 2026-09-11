// --- URL SAFETY LOCK ---
if (!window.location.href.includes("innofulfill.com")) {
  // Safe exit if not on the target domain
  console.log("⚠️ Address Helper: Not running on target domain.");
} else {
  console.log("🚀 Address Helper: Content script active and initialized safely.");

  // --- DIAGNOSTIC FUNCTION ---
  window.addressHelperDiagnostics = function() {
    const allInputs = document.querySelectorAll('input, textarea, select');
    console.log(`📋 Address Helper Diagnostics: Found ${allInputs.length} total input fields`);
    
    const fieldInfo = [];
    allInputs.forEach((field, index) => {
      fieldInfo.push({
        index,
        type: field.type,
        id: field.id || "N/A",
        name: field.name || "N/A",
        placeholder: field.placeholder || "N/A",
        ariaLabel: field.getAttribute('aria-label') || "N/A",
        value: field.value || "",
        class: field.className || "N/A"
      });
    });
    
    console.table(fieldInfo);
    return fieldInfo;
  };
  
  console.log("💡 Tip: Run window.addressHelperDiagnostics() in console to see all form fields on this page");

  // --- 1. INDEXEDDB SETUP ---
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(DB_CONFIG.objectStore)) {
          db.createObjectStore(DB_CONFIG.objectStore, { keyPath: "id" });
          console.log("💾 Address Helper DB: Created '" + DB_CONFIG.objectStore + "' object store.");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error("❌ Address Helper DB Error:", request.error);
        reject(request.error);
      };
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    console.log("📄 Address Helper: Page loaded, scanning for form fields...");
    window.addressHelperDiagnostics();
  });

  // Also run on page load if DOM is already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log("📄 Address Helper: Page loaded, scanning for form fields...");
      window.addressHelperDiagnostics();
    });
  } else {
    console.log("📄 Address Helper: Page already loaded, scanning for form fields...");
    window.addressHelperDiagnostics();
  }

  // --- 3. CREATE CUSTOM DIALOG FOR FREIGHT WARNING ---
  const customDialog = document.createElement('div');
  customDialog.id = 'freight-warning-dialog';
  customDialog.style.cssText = `
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000000;
    justify-content: center;
    align-items: center;
  `;
  customDialog.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); max-width: 400px; text-align: center;">
      <h3 style="color: #d32f2f; margin-top: 0;">⚠️ Freight Below Minimum</h3>
      <p style="font-size: 14px; color: #555; margin: 15px 0;">
        The minimum freight required is <strong>120</strong>.
      </p>
      <p style="font-size: 16px; font-weight: bold; color: #d32f2f; margin: 15px 0;" id="freight-value-display"></p>
      <p style="font-size: 13px; color: #777; margin: 15px 0;">Do you want to proceed anyway?</p>
      <div style="display: flex; gap: 10px; justify-content: space-between; margin-top: 20px;">
        <button id="freight-confirm-less" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Yes, Proceed</button>
        <button id="freight-make-120" style="flex: 1; padding: 10px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Make 120</button>
      </div>
    </div>
  `;
  document.body.appendChild(customDialog);

  function showFreightWarningDialog(currentFreight) {
    return new Promise((resolve) => {
      document.getElementById('freight-value-display').textContent = `Your freight value: ${currentFreight}`;
      customDialog.style.display = 'flex';

      document.getElementById('freight-confirm-less').onclick = () => {
        customDialog.style.display = 'none';
        resolve('proceed');
      };

      document.getElementById('freight-make-120').onclick = () => {
        document.querySelector('#freight').value = '120';
        document.querySelector('#freight').dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('#freight').dispatchEvent(new Event('change', { bubbles: true }));
        customDialog.style.display = 'none';
        console.log("✓ Address Helper: Freight value set to 120");
        resolve('adjusted');
      };
    });
  }
  const sidebar = document.createElement('div');
  sidebar.id = 'address-helper-sidebar';
  sidebar.style.cssText = `
    position: fixed; top: 0; right: -350px; width: 320px; height: 100vh;
    background: #ffffff; box-shadow: -4px 0 15px rgba(0,0,0,0.15);
    z-index: 999999; transition: right 0.3s ease; padding: 20px;
    box-sizing: border-box; font-family: Arial, sans-serif; overflow-y: auto;
  `;

  sidebar.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #f0f0f0; padding-bottom:10px;">
      <h3 style="margin:0; color:#333;">Matching Profiles</h3>
      <button id='close-helper-sidebar' style='background:none; border:none; font-size:20px; cursor:pointer; color:#999;'>&times;</button>
    </div>
    <div style="margin-bottom:15px;">
      <input 
        type="text" 
        id="sidebar-search-input" 
        placeholder="Search by name, phone or address..." 
        style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:13px; box-sizing:border-box;"
      />
    </div>
    <div id="sidebar-results-container"></div>
  `;
  document.body.appendChild(sidebar);

  document.getElementById('close-helper-sidebar').addEventListener('click', () => {
    sidebar.style.right = '-350px';
    // Clear search input when sidebar closes
    document.getElementById('sidebar-search-input').value = '';
    document.getElementById('sidebar-results-container').innerHTML = '';
  });

  // --- 3.5 SIDEBAR SEARCH FUNCTIONALITY ---
  async function searchAllProfiles(query) {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
      // If search is empty, clear results
      const container = document.getElementById('sidebar-results-container');
      container.innerHTML = '';
      return;
    }

    try {
      const db = await openDB();
      const tx = db.transaction(DB_CONFIG.objectStore, "readonly");
      const store = tx.objectStore(DB_CONFIG.objectStore);
      const request = store.getAll();

      request.onsuccess = () => {
        const allRecords = request.result;
        const filtered = allRecords.filter(record => {
          const f = record.fields;
          return (
            (f.senderName?.toLowerCase().includes(searchTerm)) ||
            (f.receiverName?.toLowerCase().includes(searchTerm)) ||
            (f.senderMobile?.includes(searchTerm)) ||
            (f.receiverMobile?.includes(searchTerm)) ||
            (f.senderAddress?.toLowerCase().includes(searchTerm)) ||
            (f.receiverAddress?.toLowerCase().includes(searchTerm))
          );
        });
        
        console.log(`🔎 Address Helper: Sidebar search found ${filtered.length} matching profiles for query: "${searchTerm}"`);
        renderResults(filtered);
      };

      request.onerror = () => {
        console.error("❌ Address Helper DB Error during sidebar search:", request.error);
      };
    } catch (err) {
      console.error("❌ Address Helper Error in searchAllProfiles:", err);
    }
  }

  // Add event listener for sidebar search input
  const searchInput = document.getElementById('sidebar-search-input');
  const debouncedSidebarSearch = debounce((query) => {
    searchAllProfiles(query);
  }, 300);

  searchInput.addEventListener('input', (event) => {
    const query = event.target.value;
    console.log(`🔍 Address Helper Sidebar: Search input changed to: "${query}"`);
    debouncedSidebarSearch(query);
  });

  // --- 4. DEBOUNCE UTILITY ---
  function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // --- 5. FUZZY SEARCH ---
  async function searchProfiles(isManualOverride = false) {
    const sName = document.querySelector('#senderName')?.value.toLowerCase().trim() || "";
    const rName = document.querySelector('#receiverName')?.value.toLowerCase().trim() || "";
    const sMobile = document.querySelector('#senderMobileNumber')?.value.trim() || "";
    const rMobile = document.querySelector('#mobileNumber')?.value.trim() || "";

    if (!sName && !rName && !sMobile && !rMobile && !isManualOverride) {
      sidebar.style.right = '-350px';
      return;
    }

    console.log(`🔍 Address Helper: Querying profiles... Override mode: ${isManualOverride}`);

    try {
      const db = await openDB();
      const tx = db.transaction(DB_CONFIG.objectStore, "readonly");
      const store = tx.objectStore(DB_CONFIG.objectStore);
      const request = store.getAll();

      request.onsuccess = () => {
        const allRecords = request.result;
        const filtered = allRecords.filter(record => {
          if (isManualOverride && !sName && !rName && !sMobile && !rMobile) return true;
          
          const f = record.fields;
          const matchSName = sName ? f.senderName?.toLowerCase().includes(sName) : true;
          const matchRName = rName ? f.receiverName?.toLowerCase().includes(rName) : true;
          const matchSMobile = sMobile ? f.senderMobile?.includes(sMobile) : true;
          const matchRMobile = rMobile ? f.receiverMobile?.includes(rMobile) : true;
          return matchSName && matchRName && matchSMobile && matchRMobile;
        });
        
        console.log(`📈 Address Helper: Found ${filtered.length} matching profiles.`);
        renderResults(filtered);
      };

      request.onerror = () => {
        console.error("❌ Address Helper DB Error during search:", request.error);
      };
    } catch (err) {
      console.error("❌ Address Helper Error in searchProfiles:", err);
    }
  }

  // --- 6. RENDER SIDEBAR RESULTS ---
  function renderResults(records) {
    const container = document.getElementById('sidebar-results-container');
    container.innerHTML = '';

    if (records.length === 0) {
      container.innerHTML = '<p style="color:#777; font-size:14px; text-align:center;">No matching profiles found.</p>';
      sidebar.style.right = '0px';
      return;
    }

    records.forEach(record => {
      const card = document.createElement('div');
      card.style.cssText = `
        padding: 12px; margin-bottom: 10px; border: 1px solid #e0e0e0;
        border-radius: 6px; cursor: pointer; background: #fafafa; transition: background 0.2s;
      `;
      card.onmouseover = () => card.style.background = '#f0f7ff';
      card.onmouseout = () => card.style.background = '#fafafa';

      card.innerHTML = `
        <div style="font-weight:bold; color:#007bff; font-size:14px; margin-bottom:4px;">To: ${record.fields.receiverName || 'N/A'}</div>
        <div style="font-size:11px; color:#666; margin-bottom:6px;">
          ${record.fields.receiverAddress || 'N/A'}
        </div>
        <div style="font-size:12px; color:#555;"><b>From:</b> ${record.fields.senderName || 'N/A'}</div>
        <div style="font-size:11px; color:#666; margin-bottom:6px;">
          ${record.fields.senderAddress || 'N/A'}
        </div>
        <div style="font-size:11px; color:#777;">
          Ph: ${record.fields.senderMobile || 'N/A'} → ${record.fields.receiverMobile || 'N/A'}
        </div>
      `;

      card.addEventListener('click', () => {
        console.log(`⚡ Address Helper: Injecting profile data for ID: ${record.id}`);
        FIELD_DEFINITIONS.forEach(field => {
          const el = document.querySelector(field.selector);
          let savedValue = record.fields[field.key];
          
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
        sidebar.style.right = '-350px';
      });
      container.appendChild(card);
    });
    sidebar.style.right = '0px';
  }

  // --- 7. ATTACH LISTENERS TO WEBPAGE INPUTS WITH DEBOUNCING ---
  const searchSelectors = [
    '#senderName', '#senderMobileNumber',
    '#receiverName', '#mobileNumber'
  ];

  // Debounced search function - waits 500ms after user stops typing
  const debouncedSearch = debounce(() => {
    const sName = document.querySelector('#senderName')?.value || "";
    const rName = document.querySelector('#receiverName')?.value || "";
    const sMobile = document.querySelector('#senderMobileNumber')?.value || "";
    const rMobile = document.querySelector('#mobileNumber')?.value || "";
    
    console.log(`📝 Address Helper: Current field values:`, { 
      senderName: sName, 
      receiverName: rName, 
      senderMobile: sMobile, 
      receiverMobile: rMobile 
    });
    
    searchProfiles(false);
  }, 500);

  document.addEventListener('input', (event) => {
    const isSearchField = searchSelectors.some(selector => event.target.matches(selector));
    if (isSearchField) {
      console.log(`✏️ Address Helper: Input detected in field:`, event.target.id, "Value:", event.target.value);
      debouncedSearch();
    }
  });

  // --- 8. CORE SAVE ACTION MECHANISM ---
  async function captureAndSaveForm(triggerType) {
    try {
      console.log(`📥 Address Helper: Save triggered via [${triggerType}].`);
      
      const formData = {};
      let hasData = false;
      let fieldCount = 0;
      let matchedCount = 0;

      FIELD_DEFINITIONS.forEach(field => {
        const el = document.querySelector(field.selector);
        fieldCount++;
        if (el) {
          matchedCount++;
          if (el.value && el.value.trim() !== "") {
            formData[field.key] = el.value.trim();
            hasData = true;
          }
        }
      });

      console.log(`📊 Address Helper: Found ${matchedCount}/${fieldCount} form fields on page.`);

      if (!hasData) {
        console.warn(`⚠️ Address Helper Save Cancelled: Form has no data. (Matched fields: ${matchedCount}/${fieldCount})`);
        console.warn("Available fields:", formData);
        return;
      }
      if (!formData.senderMobile || !formData.receiverMobile) {
        console.warn(`⚠️ Address Helper Save Cancelled: Missing phone numbers. Sender: ${formData.senderMobile ? '✓' : '✗'}, Receiver: ${formData.receiverMobile ? '✓' : '✗'}`);
        return;
      }

      const uniqueRecordId = `${formData.senderName}|${formData.senderMobile}|${formData.receiverName}|${formData.receiverMobile}`;
      const profileName = `${formData.receiverName || 'Unknown'} (From: ${formData.senderName || 'Unknown'})`;

      const db = await openDB();
      const tx = db.transaction(DB_CONFIG.objectStore, "readwrite");
      const store = tx.objectStore(DB_CONFIG.objectStore);

      store.put({
        id: uniqueRecordId,
        name: profileName,
        fields: formData,
        timestamp: Date.now()
      });
      
      tx.oncomplete = () => {
        console.log(`✅ Address Helper Success: Saved ${Object.keys(formData).length} fields under ID: "${uniqueRecordId}"`);
      };

      tx.onerror = () => {
        console.error("❌ Address Helper DB Error during save:", tx.error);
      };
    } catch (err) {
      console.error("❌ Address Helper Error in captureAndSaveForm:", err);
    }
  }

  // --- 9. CONFIRM BOOKING VALIDATION & BLOCKING ---
  function validateBeforeBooking() {
    // Define validation criteria here
    const senderName = document.querySelector('#senderName')?.value?.trim() || "";
    const receiverName = document.querySelector('#receiverName')?.value?.trim() || "";
    const senderMobile = document.querySelector('#senderMobileNumber')?.value?.trim() || "";
    const receiverMobile = document.querySelector('#mobileNumber')?.value?.trim() || "";
    const senderAddress = document.querySelector('#senderAddress')?.value?.trim() || "";
    const receiverAddress = document.querySelector('#receiverAddress')?.value?.trim() || "";
    const weight = document.querySelector('#weight')?.value?.trim() || "";
    const destPinCode = document.querySelector('#deliveryPincode')?.value?.trim() || "";
    
    const errors = [];
    
    // Add your validation criteria below:
    if (!senderName) errors.push("Sender Name is required");
    if (!receiverName) errors.push("Receiver Name is required");
    if (!senderMobile) errors.push("Sender Mobile is required");
    if (!receiverMobile) errors.push("Receiver Mobile is required");
    if (!senderAddress) errors.push("Sender Address is required");
    if (!receiverAddress) errors.push("Receiver Address is required");
    if (!weight || weight === "0") errors.push("Weight must be greater than 0");
    if (!destPinCode) errors.push("Destination PIN code is required");
    
    return { valid: errors.length === 0, errors };
  }

  function checkFreightWarning() {
    const freight = document.querySelector('#freight')?.value;
    const MIN_FREIGHT = 120;
    
    if (!freight || freight === "") {
      return null; // No freight value, skip check
    }
    
    const freightValue = parseFloat(freight);
    if (freightValue < MIN_FREIGHT) {
      return {
        needsConfirm: true,
        message: `Freight below minimum!\n\nYour freight value: ${freightValue}\n\nMinimum required: ${MIN_FREIGHT}\n\nDo you want to proceed anyway?`
      };
    }
    
    return { needsConfirm: false };
  }

  // --- 9. GLOBAL INTERCEPTORS ---
  let freightWarningHandled = false;
  
  document.addEventListener('click', async (event) => {
    const targetElement = event.target;
    if (targetElement && (targetElement.innerText === "CONFIRM BOOKING" || targetElement.textContent?.includes("CONFIRM BOOKING"))) {
      
      // Validate required fields first
      const validation = validateBeforeBooking();
      if (!validation.valid) {
        console.warn("⚠️ Address Helper: Booking blocked due to validation errors:", validation.errors);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      
      // Check freight warning
      const freightCheck = checkFreightWarning();
      if (freightCheck && freightCheck.needsConfirm && !freightWarningHandled) {
        console.warn("⚠️ Address Helper: Freight warning detected");
        event.preventDefault();
        event.stopPropagation();
        
        const freight = document.querySelector('#freight')?.value;
        const result = await showFreightWarningDialog(freight);
        
        if (result === 'proceed') {
          console.log("✓ Address Helper: User explicitly confirmed to proceed with freight value: " + freight);
          captureAndSaveForm("CONFIRM BOOKING BUTTON CLICK");
          // Allow the next click to proceed
          freightWarningHandled = true;
          setTimeout(() => {
            targetElement.click();
            freightWarningHandled = false;  // Reset flag
          }, 100);
        } else if (result === 'adjusted') {
          console.log("✓ Address Helper: Freight adjusted to 120, proceeding with booking");
          captureAndSaveForm("CONFIRM BOOKING BUTTON CLICK");
          // Allow the next click to proceed
          freightWarningHandled = true;
          setTimeout(() => {
            targetElement.click();
            freightWarningHandled = false;  // Reset flag
          }, 100);
        }
        return;
      }
      
      // If all validations pass, proceed with save and booking
      captureAndSaveForm("CONFIRM BOOKING BUTTON CLICK");
    }
  });

  document.addEventListener('submit', (event) => {
    captureAndSaveForm("FORM SUBMIT EVENT");
  });

  // --- 10. POPUP MESSAGE HANDLER ---
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      if (message.action === "OPEN_SIDEBAR") {
        console.log("📥 Address Helper Content: Received manual override trigger from Popup UI.");
        sidebar.style.right = '0px';
        
        // Clear search input
        const searchInput = document.getElementById('sidebar-search-input');
        searchInput.value = '';
        searchInput.focus();
        
        // Load all profiles sorted by recent first
        (async () => {
          try {
            const db = await openDB();
            const tx = db.transaction(DB_CONFIG.objectStore, "readonly");
            const store = tx.objectStore(DB_CONFIG.objectStore);
            const request = store.getAll();

            request.onsuccess = () => {
              const allRecords = request.result;
              const sorted = allRecords.sort((a, b) => b.timestamp - a.timestamp);
              console.log(`📂 Address Helper: Loaded ${sorted.length} profiles in sidebar`);
              renderResults(sorted);
              sidebar.style.right = '0px';
            };
          } catch (err) {
            console.error("❌ Address Helper Error loading profiles:", err);
          }
        })();
        
        sendResponse({ status: "success", message: "Sidebar opened" });
      }
    } catch (err) {
      console.error("❌ Address Helper Message Handler Error:", err);
      sendResponse({ status: "error", message: err.message });
    }
  });

} // End of main safety lock block
