// Wait for device to be ready
document.addEventListener('deviceready', onDeviceReady, false);

let db = null;

let activeDropdownField = null;

// Counter and limit management
const FIELD_LIMITS = {
    phone: 9,
    email: 5,
    website: 3,
    address: 3
};

const DEFAULT_TYPES = {
    phone: ['Work', 'Home', 'Main', 'Work Fax', 'Home Fax', 'Fax', 'Pager', 'Other'],
    email: ['Work', 'Home', 'Other'],
    website: ['Work', 'Personal', 'Other'],
    address: ['Work', 'Home', 'Other']
};

let fieldCounts = {
    phone: 0,
    email: 0,
    website: 0,
    address: 0
};

function onDeviceReady() {
    console.log('Device is ready');

    // Define the scan_card variable after the DOM is ready
    var scan_card = document.getElementById('scan_card_options');

    // Event Listeners
    document.getElementById('scan_card').addEventListener('click', function(){
        toggleScanOptions();  
    });

    document.getElementById('scan_button').addEventListener('click', function() {
        console.log('Fixed scan button clicked');
        toggleScanOptions();
    });

    document.getElementById('close_scan').addEventListener('click', function(){
        closeScanOptions();
    });

    document.getElementById('add_card').addEventListener('click', function(e){
        showAddCardForm();
    });
    
    document.getElementById('add_card_option').addEventListener('click', function(e){
        showAddCardForm();
    });

    // Add cancel button listener
    document.getElementById('cancel_btn').addEventListener('click', function(e) {
        // hideAddCardForm();
        displayConfirmDialog();
    });

    document.getElementById('from_camera').addEventListener('click',function(){
        openCamera();
    });

    document.getElementById('from_gallery').addEventListener('click',function(){
        openGallery();
    });

    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons[0].addEventListener('click', () => addField('phone'));
    actionButtons[1].addEventListener('click', () => addField('email'));
    actionButtons[2].addEventListener('click', () => addField('website'));
    actionButtons[3].addEventListener('click', () => addField('address'));

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('type-dropdown');
        const isClickInside = e.target.closest('.field-label') || e.target.closest('.type-dropdown');
        
        if (!isClickInside && dropdown.style.display !== 'none') {
            dropdown.style.display = 'none';
        }
    });

    document.getElementById('confirm_no_btn').addEventListener('click', function(){
        resetForm();
        hideAddCardForm();
    });

    document.getElementById('confirm_yes_btn').addEventListener('click', function(){

    });

     // Initialize database
     db = window.sqlitePlugin.openDatabase({
        name: 'businesscards.db',
        location: 'default'
    });

    // Create table
    db.transaction((tx) => {
        tx.executeSql(`
            CREATE TABLE IF NOT EXISTS cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                firstName TEXT,
                lastName TEXT,
                company TEXT,
                title TEXT,
                profileImage TEXT,
                phones TEXT,
                emails TEXT,
                websites TEXT,
                addresses TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }, (error) => {
        console.log('Error creating table:', error);
    }, () => {
        loadCards(); // Load existing cards
    });

    // Add save button listener
    document.getElementById('save_btn').addEventListener('click', saveCard);

}

// Move functions outside so they are accessible
function openCamera(){
    navigator.camera.getPicture(onSuccess, onFail, {
        quality: 70,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: Camera.PictureSourceType.CAMERA,
        encodingType: Camera.EncodingType.JPEG,
        mediaType: Camera.MediaType.PICTURE,
        correctOrientation: true
    });
}

function openGallery(){
    navigator.camera.getPicture(onSuccess, onFail, {
        quality: 70,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY, // or SAVEDPHOTOALBUM
        encodingType: Camera.EncodingType.JPEG,
        mediaType: Camera.MediaType.PICTURE
    });
}

function onSuccess(imageData) {
    let img = document.createElement('img');
    img.src = "data:image/jpeg;base64," + imageData;
    img.style.width = "100%";
    img.style.borderRadius = "8px";
    document.querySelector('.main_content').appendChild(img);
}

function onFail(message) {
    if (message == 20) {
        showAlert('User Denied Permission');
    }if (message == 'No Image Selected') {
    }else{
    showAlert('Failed: ' + message);
    }
    console.error('Camera failed: ' + message);
}

// Functions for scan options
function toggleScanOptions() {
    console.log('Toggle scan options called');
    var scan_card = document.getElementById('scan_card_options');
    
    if (!scan_card) {
        console.error('Scan card options element not found');
        return;
    }
    
    if (scan_card.style.display === 'block') {
        closeScanOptions();
    } else {
        scan_card.style.display = 'block';
        setTimeout(function() {
            scan_card.style.bottom = '0';
            scan_card.style.opacity = '1';
        }, 10);
    }
}

function closeScanOptions(){
    var scan_card = document.getElementById('scan_card_options');
    scan_card.style.bottom = '-100%'; // Move the element off-screen
    scan_card.style.opacity = '0'; // Fade out
    setTimeout(function () {
        scan_card.style.display = 'none'; // Hide the element after animation
    }, 300); // Ensure the element hides after the animation finishes
}

function showAlert(message) {
    const alertBox = document.getElementById('custom-alert');
    const alertText = document.getElementById('alert-text');

    alertText.textContent = message;
    alertBox.style.display = 'block'; // Ensure it's block to start with

    // Clear any existing transitions
    alertBox.style.transition = 'none';
    alertBox.style.bottom = '0px'; // Reset initial position
    alertBox.style.opacity = '0'; // Reset initial opacity

    // Apply transitions after a brief reflow
    requestAnimationFrame(() => {
        alertBox.style.transition = 'opacity 0.6s ease, bottom 0.6s ease'; // Smooth transition
        requestAnimationFrame(() => {
            alertBox.style.bottom = '10px'; // Move the element up slightly from the bottom
            alertBox.style.opacity = '1'; // Fade in
        });
    });

    // Automatically hide the alert after 3 seconds
    setTimeout(function () {
        alertBox.style.opacity = '0'; // Fade out
        alertBox.style.bottom = '0px'; // Move the element off-screen
        setTimeout(function () {
            alertBox.style.display = 'none'; // Hide the element after animation completes
        }, 600); // Ensure the element hides after the animation finishes
    }, 3000);
}

function showAddCardForm() {
    const scanButton = document.querySelector('.scan-button');
    scanButton.style.display = 'none';
    const addCardForm = document.getElementById('addCardForm');
    addCardForm.style.visibility = 'visible';
    // Trigger reflow
    addCardForm.offsetHeight;
    addCardForm.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideAddCardForm() {
    const scanButton = document.querySelector('.scan-button');
    scanButton.style.display = 'flex';
    const addCardForm = document.getElementById('addCardForm');
    const dialog = document.getElementById('confirmation_box');
    addCardForm.classList.remove('active');
    dialog.style.display = 'none';
    // Hide after animation completes
    setTimeout(() => addCardForm.style.visibility = 'hidden', 300);
}


function addField(type) {
    // Check if we've hit the limit
    if (fieldCounts[type] >= FIELD_LIMITS[type]) {
        showAlert(`Maximum ${FIELD_LIMITS[type]} ${type} fields allowed`);
        return;
    }

    const container = document.getElementById(`${type}-fields-container`);
    const id = `${type}-${fieldCounts[type]}`;
    
    const field = document.createElement('div');
    field.className = 'dynamic-field';
    field.id = id;
    
    // Get the next default type in sequence
    const defaultType = DEFAULT_TYPES[type][fieldCounts[type] % DEFAULT_TYPES[type].length];
    
    field.innerHTML = `
        <div class="field-label" onclick="toggleDropdown('${id}', '${type}')">
            <span class="field-label-text">${defaultType}</span>
            <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </div>
        <input type="${getInputType(type)}" 
               class="field-input" 
               placeholder="${getPlaceholder(type)}"
               style="color: white;">
        <span class="remove-field" onclick="removeField('${id}', '${type}')">−</span>
    `;
    
    //Add the field to its specific container
    container.appendChild(field);
    fieldCounts[type]++;
}


function removeField(id, type) {
    const field = document.getElementById(id);
    if (field) {
        // Animate removal
        field.style.opacity = '0';
        field.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            field.remove();
            fieldCounts[type]--;
        }, 200);
    }
}

//CSS for smooth animations

const style = document.createElement('style');
style.textContent = `
    .dynamic-field {
        transition: opacity 0.2s ease, transform 0.2s ease;
    }
    
    .remove-field {
        transition: color 0.2s ease;
    }
    
    .remove-field:hover {
        color: #ff1a1a;
    }
`;
document.head.appendChild(style);


function toggleDropdown(fieldId, type) {
    const dropdown = document.getElementById('type-dropdown');
    const field = document.getElementById(fieldId);
    const fieldRect = field.getBoundingClientRect();
    
    // Hide any currently visible dropdown
    if (dropdown.style.display !== 'none') {
        dropdown.style.display = 'none';
    }

    // Show only relevant dropdown items
    const sections = dropdown.querySelectorAll('.dropdown-section');
    sections.forEach(section => {
        section.style.display = section.dataset.for === type ? 'block' : 'none';
    });

    // Position the dropdown relative to the field
    dropdown.style.top = `${fieldRect.bottom + window.scrollY + 5}px`;
    dropdown.style.display = 'block';
    
    // Store active field
    activeDropdownField = fieldId;
    
    // Add click handlers to dropdown items
    const items = dropdown.querySelectorAll(`.dropdown-section[data-for="${type}"] .dropdown-item`);
    items.forEach(item => {
        item.onclick = () => {
            const label = field.querySelector('.field-label-text');
            label.textContent = item.textContent;
            dropdown.style.display = 'none';
        };
    });
}

// Helper functions remain the same
function getInputType(type) {
    switch(type) {
        case 'phone': return 'tel';
        case 'email': return 'email';
        case 'website': return 'url';
        case 'address': return 'text';
    }
}

function getPlaceholder(type) {
    switch(type) {
        case 'phone': return 'Phone Number';
        case 'email': return 'Email Address';
        case 'website': return 'Website URL';
        case 'address': return 'Street Address';
    }
}

function getButtonIndex(type) {
    switch(type) {
        case 'phone': return 1;
        case 'email': return 2;
        case 'website': return 3;
        case 'address': return 4;
    }
}

function displayConfirmDialog() {
    const dialog = document.getElementById('confirmation_box');
    // Check ALL input fields (including dynamic ones)
    const hasContent = Array.from(document.querySelectorAll('.form-input, .note-input, .dynamic-field input'))
        .some(input => input.value.trim() !== '');

    if (!hasContent) {
        hideAddCardForm();
    } else {
        dialog.style.display = 'block';
        setTimeout(() => dialog.style.opacity = '1', 10);
    }
}

// Function to reset the form
function resetForm() {
    // Reset all input fields
    document.querySelectorAll('.form-input, .note-input').forEach(input => {
        input.value = '';
    });

    // Remove all dynamically added fields
    document.querySelectorAll('.dynamic-field').forEach(field => {
        field.remove();
    });

    // Reset field counts
    fieldCounts = {
        phone: 0,
        email: 0,
        website: 0,
        address: 0
    };
}


function saveCard() {
    const firstName = document.querySelector('input[placeholder="First Name"]').value;
    const lastName = document.querySelector('input[placeholder="Last Name"]').value;
    const company = document.querySelector('input[placeholder="Company"]').value;
    const title = document.querySelector('input[placeholder="Title"]').value;
    const profileImage = document.querySelector('.profile-image img')?.src || '';
    const notes = document.querySelector('.note-input')?.value || '';

    // Collect field data
    const phones = collectFieldData('phone');
    const emails = collectFieldData('email');
    const websites = collectFieldData('website');
    const addresses = collectFieldData('address');

    db.transaction((tx) => {
        tx.executeSql(`
            INSERT INTO cards (firstName, lastName, company, title, profileImage, 
                            phones, emails, websites, addresses, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            firstName, lastName, company, title, profileImage,
            JSON.stringify(phones),
            JSON.stringify(emails),
            JSON.stringify(websites),
            JSON.stringify(addresses),
            notes
        ]);
    }, (error) => {
        showAlert('Error saving card: ' + error.message);
    }, () => {
        hideAddCardForm();
        resetForm();
        closeScanOptions();
        loadCards();
        showAlert('Card saved successfully');
    });
}

function collectFieldData(type) {
    return Array.from(document.querySelectorAll(`#${type}-fields-container .dynamic-field`))
        .map(field => ({
            type: field.querySelector('.field-label-text').textContent,
            value: field.querySelector('input').value
        }));
}

function loadCards() {
    const mainContent = document.querySelector('.main_content');
    const placeholder = document.querySelector('.placeholder_container');
    
    db.transaction((tx) => {
        tx.executeSql('SELECT * FROM cards ORDER BY created_at DESC', [], (tx, results) => {
            console.log('Cards found:', results.rows.length); // Debug
            
            if (results.rows.length > 0) {
                placeholder.style.display = 'none';
                mainContent.innerHTML = ''; // Clear existing content
                
                for (let i = 0; i < results.rows.length; i++) {
                    const card = results.rows.item(i);
                    const cardElement = createCardElement(card);
                    mainContent.appendChild(cardElement);
                }
            } else {
                placeholder.style.display = 'flex';
                mainContent.innerHTML = '';
            }
        });
    }, (error) => {
        console.error('Database error:', error);
        showAlert('Error loading cards');
    });
}

function createCardElement(card) {
    const div = document.createElement('div');
    div.className = 'card-preview';
    div.onclick = () => showCardDetails(card.id);
    
    div.innerHTML = `
        <div class="card-image">
            ${card.profileImage ? 
                `<img src="${card.profileImage}" alt="Profile">` :
                `<div class="initial-circle">${card.firstName[0]}${card.lastName[0]}</div>`
            }
        </div>
        <div class="card-info">
            <h3>${card.firstName} ${card.lastName}</h3>
            <p class="company">${card.company}</p>
            <p class="title">${card.title}</p>
        </div>
    `;
    
    return div;
}

function showCardDetails(cardId) {
    const scanButton = document.querySelector('.scan-button');
    scanButton.style.display = 'none';
    db.transaction((tx) => {
        tx.executeSql('SELECT * FROM cards WHERE id = ?', [cardId], (tx, results) => {
            const card = results.rows.item(0);
            const detailView = document.createElement('div');
            detailView.className = 'card-details';
            detailView.innerHTML = `
                <div class="details-header">
                    <button onclick="hideCardDetails()" class="back-btn">←</button>
                    <h2>${card.firstName} ${card.lastName}</h2>
                    <button onclick="deleteCard(${card.id})" class="delete-btn">Delete</button>
                </div>
                <div class="details-content">
                    ${createDetailsContent(card)}
                </div>
            `;
            
            document.querySelector('.app').appendChild(detailView);
            setTimeout(() => detailView.classList.add('active'), 10);
        });
    });
}

function hideCardDetails() {
    const detailView = document.querySelector('.card-details');
    const scanButton = document.querySelector('.scan-button');
    scanButton.style.display = 'flex';
    detailView.classList.remove('active');
    setTimeout(() => detailView.remove(), 300);
}

function deleteCard(cardId) {
    if (confirm('Are you sure you want to delete this card?')) {
        db.transaction((tx) => {
            tx.executeSql('DELETE FROM cards WHERE id = ?', [cardId], () => {
                hideCardDetails();
                loadCards();
                showAlert('Card deleted successfully');
            });
        });
    }
}

function createDetailsContent(card) {
    const phones = JSON.parse(card.phones || '[]');
    const emails = JSON.parse(card.emails || '[]');
    const websites = JSON.parse(card.websites || '[]');
    const addresses = JSON.parse(card.addresses || '[]');

    return `
        <div class="details-section">
            ${card.company ? `<h3 class="company">${card.company}</h3>` : ''}
            ${card.title ? `<p class="title">${card.title}</p>` : ''}
            
            ${phones.length ? `
                <div class="contact-section">
                    <h4>Phone Numbers</h4>
                    ${phones.map(p => `
                        <div class="contact-item">
                            <span class="label">${p.type}:</span>
                            <span class="value">${p.value}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${emails.length ? `
                <div class="contact-section">
                    <h4>Email Addresses</h4>
                    ${emails.map(e => `
                        <div class="contact-item">
                            <span class="label">${e.type}:</span>
                            <span class="value">${e.value}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${websites.length ? `
                <div class="contact-section">
                    <h4>Websites</h4>
                    ${websites.map(w => `
                        <div class="contact-item">
                            <span class="label">${w.type}:</span>
                            <span class="value">${w.value}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${addresses.length ? `
                <div class="contact-section">
                    <h4>Addresses</h4>
                    ${addresses.map(a => `
                        <div class="contact-item">
                            <span class="label">${a.type}:</span>
                            <span class="value">${a.value}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${card.notes ? `
                <div class="notes-section">
                    <h4>Notes</h4>
                    <p>${card.notes}</p>
                </div>
            ` : ''}
        </div>
    `;
}