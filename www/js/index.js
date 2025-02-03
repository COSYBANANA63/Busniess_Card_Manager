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
    if (!validateCard()) {
        return;
    }
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
                    <div class="details-section">
                        ${card.company ? `
                            <div class="detail-item">
                                <svg class="icon" viewBox="0 0 24 24">
                                    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                                </svg>
                                <span>${card.company}</span>
                            </div>
                        ` : ''}
                        ${card.title ? `
                            <div class="detail-item">
                                <svg class="icon" viewBox="0 0 24 24">
                                    <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
                                </svg>
                                <span>${card.title}</span>
                            </div>
                        ` : ''}
                        ${JSON.parse(card.phones).map(phone => `
                            <div class="detail-item">
                                <svg class="icon" viewBox="0 0 24 24">
                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                </svg>
                                <span>${phone.type}: ${phone.value}</span>
                            </div>
                        `).join('')}
                        ${JSON.parse(card.emails).map(email => `
                            <div class="detail-item">
                                <svg class="icon" viewBox="0 0 24 24">
                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                </svg>
                                <span>${email.type}: ${email.value}</span>
                            </div>
                        `).join('')}
                        ${JSON.parse(card.websites).map(website => `
                            <div class="detail-item">
                                <svg class="icon" viewBox="0 0 24 24">
                                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>
                                </svg>
                                <span>${website.type}: ${website.value}</span>
                            </div>
                        `).join('')}
                        ${JSON.parse(card.addresses).map(address => `
                            <div class="detail-item">
                                <svg class="icon" viewBox="0 0 24 24">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                </svg>
                                <span>${address.type}: ${address.value}</span>
                            </div>
                        `).join('')}
                    </div>
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

function validateCard() {
    const requiredFields = {
        firstName: document.querySelector('input[placeholder="First Name"]').value,
        lastName: document.querySelector('input[placeholder="Last Name"]').value,
        company: document.querySelector('input[placeholder="Company"]').value,
        title: document.querySelector('input[placeholder="Title"]').value,
    };

    // Check required fields
    for (const [field, value] of Object.entries(requiredFields)) {
        if (!value.trim()) {
            showAlert(`${field.replace(/([A-Z])/g, ' $1').trim()} is required`);
            return false;
        }
    }

    // Check if at least one phone number exists
    const phones = Array.from(document.querySelectorAll('#phone-fields-container .dynamic-field input'))
        .filter(input => input.value.trim());
    if (phones.length === 0) {
        showAlert('At least one phone number is required');
        return false;
    }

    // Check if at least one email exists
    const emails = Array.from(document.querySelectorAll('#email-fields-container .dynamic-field input'))
        .filter(input => input.value.trim());
    if (emails.length === 0) {
        showAlert('At least one email is required');
        return false;
    }

    // Check if at least one address exists
    const addresses = Array.from(document.querySelectorAll('#address-fields-container .dynamic-field input'))
        .filter(input => input.value.trim());
    if (addresses.length === 0) {
        showAlert('At least one address is required');
        return false;
    }

    return true;
}
