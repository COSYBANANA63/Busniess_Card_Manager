// Wait for device to be ready
document.addEventListener('deviceready', onDeviceReady, false);

let db = null;
let exitApp = false;
let lastPageStack = [];
let isEditMode = false;
let currentEditId = null;

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
    document.addEventListener("backbutton", handleBackButton, false);

    document.getElementById('scan_card').addEventListener('click', function(){
        toggleScanOptions();  
    });
    
    document.getElementById('scan_button').addEventListener('click', function() {
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

    document.getElementById('from_contacts').addEventListener('click', function(){
        closeScanOptions();
        pickContact();
    });

    // Add cancel button listener
    document.getElementById('cancel_btn').addEventListener('click', function(e) {
        // hideAddCardForm();
        displayConfirmDialog();
    });

    // Remove any existing listeners
    const fromCamera = document.getElementById('from_camera');
    const fromGallery = document.getElementById('from_gallery');
    
    fromCamera.replaceWith(fromCamera.cloneNode(true));
    fromGallery.replaceWith(fromGallery.cloneNode(true));

    document.getElementById('from_camera').addEventListener('click',function(){
        closeScanOptions();
        openCamera();
    });

    document.getElementById('from_gallery').addEventListener('click',function(){
        closeScanOptions()
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
    document.getElementById('save_btn').addEventListener('click', function() {
        // Check required fields first
        const requiredFields = {
            firstName: document.querySelector('input[placeholder="First Name"]').value,
            lastName: document.querySelector('input[placeholder="Last Name"]').value,
            company: document.querySelector('input[placeholder="Company"]').value,
            title: document.querySelector('input[placeholder="Title"]').value
        };
    
        // Show all missing required fields at once
        const missingFields = Object.entries(requiredFields)
            .filter(([, value]) => !value.trim())
            .map(([field]) => field.replace(/([A-Z])/g, ' $1').trim());
        
        if (missingFields.length > 0) {
            showAlert(`Please fill in the following required fields:\n${missingFields.join('\n')}`);
            return;
        }
    
        // Check for required contact details
        const phones = Array.from(document.querySelectorAll('#phone-fields-container .dynamic-field input'))
            .filter(input => input.value.trim());
        const emails = Array.from(document.querySelectorAll('#email-fields-container .dynamic-field input'))
            .filter(input => input.value.trim());
        const addresses = Array.from(document.querySelectorAll('#address-fields-container .dynamic-field input'))
            .filter(input => input.value.trim());
    
        const missingContacts = [];
        if (phones.length === 0) missingContacts.push('Phone Number');
        if (emails.length === 0) missingContacts.push('Email Address');
        if (addresses.length === 0) missingContacts.push('Address');
    
        if (missingContacts.length > 0) {
            showAlert(`Please add at least one:\n${missingContacts.join('\n')}`);
            return;
        }
    });

}

// Move functions outside so they are accessible
function openCamera(){
    if (!navigator.camera) {
        showAlert('Camera plugin not available');
        return;
    }
    navigator.camera.getPicture(onSuccess, onFail, {
        quality: 70,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: Camera.PictureSourceType.CAMERA,
        encodingType: Camera.EncodingType.JPEG,
        mediaType: Camera.MediaType.PICTURE,
        correctOrientation: true,
        correctOrientation: true,
        targetWidth: 1024,
        targetHeight: 1024
    });
}

function openGallery(){
    if (!navigator.camera) {
        showAlert('Camera plugin not available');
        return;
    }
    navigator.camera.getPicture(onSuccess, onFail, {
        quality: 70,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY, // or SAVEDPHOTOALBUM
        encodingType: Camera.EncodingType.JPEG,
        mediaType: Camera.MediaType.PICTURE,
        correctOrientation: true,
        targetWidth: 1024,
        targetHeight: 1024
    });
}

function onSuccess(imageData) {
    showAlert('Processing image...');
    
    // Create image element
    const img = document.createElement('img');
    img.src = "data:image/jpeg;base64," + imageData;
    
    // Create Tesseract worker
    Tesseract.createWorker()
        .then(worker => {
            return worker.loadLanguage('eng')
                .then(() => worker.initialize('eng'))
                .then(() => worker.recognize(img.src))
                .then(({ data: { text } }) => {
                    worker.terminate();
                    
                    // Extract information
                    const extractedInfo = extractInformation(text);
                    
                    // Close scan options and show form
                    closeScanOptions();
                    showAddCardForm();
                    
                    // Populate form fields
                    populateFormFields(extractedInfo);
                });
        })
        .catch(error => {
            console.error('OCR Error:', error);
            showAlert('Error processing image: ' + error.message);
        });
}

function extractInformation(text) {
    const info = {
        firstName: '',
        lastName: '',
        company: '',
        title: '',
        phones: [],
        emails: [],
        websites: [],
        addresses: []
    };

    // Regular expressions for different fields
    const patterns = {
        name: /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/,
        email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        phone: /(?:[\+]?\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/g,
        website: /(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}/g
    };

    // Extract name (assuming first line is name)
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
        const nameParts = lines[0].trim().split(' ');
        info.firstName = nameParts[0] || '';
        info.lastName = nameParts.slice(1).join(' ') || '';
    }

    // Extract title (assuming second line is title)
    if (lines.length > 1) {
        info.title = lines[1].trim();
    }

    // Extract company (assuming third line is company)
    if (lines.length > 2) {
        info.company = lines[2].trim();
    }

    // Extract contact information
    info.phones = text.match(patterns.phone) || [];
    info.emails = text.match(patterns.email) || [];
    info.websites = text.match(patterns.website) || [];

    // Extract address (remaining lines that aren't matched above)
    const addressLines = lines.slice(3).filter(line => {
        return !line.match(patterns.email) && 
               !line.match(patterns.phone) && 
               !line.match(patterns.website);
    });
    info.addresses = [addressLines.join(' ')];

    return info;
}

function populateFormFields(info) {
    // Populate basic fields
    document.querySelector('input[placeholder="First Name"]').value = info.firstName;
    document.querySelector('input[placeholder="Last Name"]').value = info.lastName;
    document.querySelector('input[placeholder="Company"]').value = info.company;
    document.querySelector('input[placeholder="Title"]').value = info.title;

    // Add phone numbers
    info.phones.forEach(phone => {
        addField('phone');
        const lastField = document.querySelector('#phone-fields-container .dynamic-field:last-child');
        lastField.querySelector('input').value = phone;
    });

    // Add emails
    info.emails.forEach(email => {
        addField('email');
        const lastField = document.querySelector('#email-fields-container .dynamic-field:last-child');
        lastField.querySelector('input').value = email;
    });

    // Add websites
    info.websites.forEach(website => {
        addField('website');
        const lastField = document.querySelector('#website-fields-container .dynamic-field:last-child');
        lastField.querySelector('input').value = website;
    });

    // Add addresses
    info.addresses.forEach(address => {
        if (address.trim()) {
            addField('address');
            const lastField = document.querySelector('#address-fields-container .dynamic-field:last-child');
            lastField.querySelector('input').value = address;
        }
    });
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
    const addCardForm = document.getElementById('addCardForm');
    addCardForm.style.visibility = 'visible';
    addCardForm.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Reset form state when opening fresh
    if (!isEditMode) {
        resetForm();
        const saveBtn = document.querySelector('.save_btn');
        saveBtn.onclick = saveCard;
        document.querySelector('.heading .title').textContent = 'Add Card';
    } else {
        const saveBtn = document.querySelector('.save_btn');
        saveBtn.onclick = function() {
            updateCard(currentEditId);
        };
        document.querySelector('.heading .title').textContent = 'Edit Card';
    }
}

function hideAddCardForm() {
    currentEditId = null;
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
    currentEditId = null
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

    if (currentEditId) {
        // Update existing card
        updateCard(currentEditId, firstName, lastName, company, title, profileImage, notes, phones, emails, websites, addresses);
    } else {
        // Create new card
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
                    <button onclick="editCard(${card.id})" class="edit-btn">Edit</button>
                    <h2 class="header-title">${card.firstName} ${card.lastName}</h2>
                    <button onclick="deleteCard(${card.id})" class="delete-btn">Delete</button>
                </div>
                <div class="details-content">
                    ${createDetailsContent(card)}
                    <div class="digital-card">
                        <div class="digital-card-header">
                            ${card.profileImage ?
                                `<img src="${card.profileImage}" alt="Profile" class="digital-profile">` :
                                `<div class="digital-profile">${card.firstName[0]}${card.lastName[0]}</div>`
                            }
                            <div class="digital-info">
                                <div class="digital-name">${card.firstName} ${card.lastName}</div>
                                <div class="digital-title">${card.title}</div>
                                <div class="digital-company">${card.company}</div>
                            </div>
                        </div>
                        <div class="digital-contact">
                            ${JSON.parse(card.phones || '[]')[0] ? `
                                <div class="digital-contact-item">
                                    <svg class="icon" viewBox="0 0 24 24">
                                        <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                    </svg>
                                    <span>${JSON.parse(card.phones)[0].value}</span>
                                </div>
                            ` : ''}
                            ${JSON.parse(card.emails || '[]')[0] ? `
                                <div class="digital-contact-item">
                                    <svg class="icon" viewBox="0 0 24 24">
                                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                    </svg>
                                    <span>${JSON.parse(card.emails)[0].value}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="share-container">
                            <button onclick="shareCard(${card.id})" class="share-btn">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/>
                                </svg>
                                Share Contact
                            </button>
                            <button onclick="saveToContacts(${card.id})" class="save-cont-btn">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                </svg>
                                Save to Contacts
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.querySelector('.app').appendChild(detailView);
            setTimeout(() => detailView.classList.add('active'), 10);
        });
    });
}

function shareCard(cardId) {
    db.transaction((tx) => {
        tx.executeSql('SELECT * FROM cards WHERE id = ?', [cardId], (tx, results) => {
            const card = results.rows.item(0);
            showQRModal(createCardData(card));
        });
    });
}

function createCardData(card) {
    const phones = JSON.parse(card.phones || '[]');
    const emails = JSON.parse(card.emails || '[]');
    const websites = JSON.parse(card.websites || '[]');
    const addresses = JSON.parse(card.addresses || '[]');
    
    // Create standard vCard format
    const vCard = `BEGIN:VCARD
VERSION:3.0
N:${card.lastName};${card.firstName};;;
FN:${card.firstName} ${card.lastName}
ORG:${card.company}
TITLE:${card.title}
${phones.map(p => `TEL;TYPE=${p.type.toUpperCase()}:${p.value}`).join('\n')}
${emails.map(e => `EMAIL;TYPE=${e.type.toUpperCase()}:${e.value}`).join('\n')}
${websites.map(w => `URL:${w.value}`).join('\n')}
${addresses.map(a => `ADR;TYPE=${a.type.toUpperCase()}:;;${a.value}`).join('\n')}
END:VCARD`;

    return vCard;
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
            
            <div class="share-container">
                <button onclick="shareCard(${card.id})" class="share-btn">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/>
                    </svg>
                    Share Contact
                </button>
            </div>

            // ...existing contact sections...
        </div>
    `;
}

function showQRModal(data) {
    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.id = 'qrModal';
    
    // Generate QR code with raw vCard data
    const qr = qrcode(0, 'L');
    qr.addData(data);
    qr.make();
    
    modal.innerHTML = `
        <div class="qr-content">
            <div class="qr-header">
                <h3>Scan to Share Contact</h3>
                <button class="close-modal">×</button>
            </div>
            <div class="qr-code">${qr.createImgTag(5)}</div>
            <p class="qr-instructions">Scan with your phone's camera or QR reader</p>
            <p class="qr-instructions">Contact will be added to your address book</p>
            <p class="qr-instructions">Tap anywhere outside to close QR code</p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const qrBackHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeQRModal();
        document.removeEventListener('backbutton', qrBackHandler);
    };
    
    modal.querySelector('.close-modal').onclick = closeQRModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeQRModal();
    };
    
    document.addEventListener('backbutton', qrBackHandler);
}

function closeQRModal() {
    const modal = document.getElementById('qrModal');
    if (modal) {
        modal.remove();
    }
}

function handleQRModalBack(e) {
    e.preventDefault();
    closeQRModal();
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
    // Check if all fields are empty
    const basicFields = [
        document.querySelector('input[placeholder="First Name"]').value,
        document.querySelector('input[placeholder="Last Name"]').value,
        document.querySelector('input[placeholder="Company"]').value,
        document.querySelector('input[placeholder="Title"]').value,
        document.querySelector('.notes-input')?.value
    ].some(value => value.trim());

    const dynamicFields = ['phone', 'email', 'website', 'address'].some(type => {
        return Array.from(document.querySelectorAll(`#${type}-fields-container .dynamic-field input`))
            .some(input => input.value.trim());
    });

    if (!basicFields && !dynamicFields) {
        showAlert('Cannot save an empty card. Please add some information.');
        return false;
    }

    return true;
}

function createDigitalCard(card) {
    const phones = JSON.parse(card.phones);
    const emails = JSON.parse(card.emails);
    const mainPhone = phones[0]?.value || '';
    const mainEmail = emails[0]?.value || '';
    
    return `
        <div class="digital-card">
            <div class="digital-card-header">
                ${card.profileImage ? 
                    `<img src="${card.profileImage}" alt="Profile" class="digital-profile">` :
                    `<div class="digital-profile">${card.firstName[0]}${card.lastName[0]}</div>`
                }
                <div class="digital-info">
                    <div class="digital-name">${card.firstName} ${card.lastName}</div>
                    <div class="digital-title">${card.title}</div>
                    <div class="digital-company">${card.company}</div>
                </div>
            </div>
            <div class="digital-contact">
                <div class="digital-contact-item">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                    <span>${mainPhone}</span>
                </div>
                <div class="digital-contact-item">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                    <span>${mainEmail}</span>
                </div>
            </div>
        </div>
    `;
}

function handleBackButton(e) {
    e.preventDefault();
    
    // Check if card details or add form is open
    const cardDetails = document.querySelector('.card-details');
    const addCardForm = document.getElementById('addCardForm');
    const scanOptions = document.getElementById('scan_card_options');
    
    if (cardDetails && cardDetails.classList.contains('active')) {
        hideCardDetails();
        return;
    }
    
    if (addCardForm && addCardForm.style.visibility === 'visible') {
        hideAddCardForm();
        return;
    }
    
    if (scanOptions && scanOptions.style.display === 'block') {
        closeScanOptions();
        return;
    }
    
    // If we're on main page, handle exit
    if (!exitApp) {
        exitApp = true;
        showAlert('Swipe back again to exit');
        setTimeout(() => {
            exitApp = false;
        }, 2000); // Reset after 2 seconds
    } else {
        navigator.app.exitApp();
    }
}

function editCard(cardId) {
    currentEditId = cardId;
    isEditMode = true;
    db.transaction((tx) => {
        tx.executeSql('SELECT * FROM cards WHERE id = ?', [cardId], (tx, results) => {
            const card = results.rows.item(0);
            
            hideCardDetails();
            showAddCardForm();
            
            // Populate basic fields
            document.querySelector('input[placeholder="First Name"]').value = card.firstName;
            document.querySelector('input[placeholder="Last Name"]').value = card.lastName;
            document.querySelector('input[placeholder="Company"]').value = card.company;
            document.querySelector('input[placeholder="Title"]').value = card.title;
            document.querySelector('.notes-input').value = card.notes || '';
            
            // Clear existing dynamic fields
            ['phone', 'email', 'website', 'address'].forEach(type => {
                document.getElementById(`${type}-fields-container`).innerHTML = '';
                fieldCounts[type] = 0;
            });
            
            // Populate dynamic fields with values
            try {
                JSON.parse(card.phones).forEach(phone => {
                    addField('phone');
                    const field = document.querySelector(`#phone-fields-container .dynamic-field:last-child`);
                    field.querySelector('.field-label-text').textContent = phone.type;
                    field.querySelector('input').value = phone.value;
                });
                
                JSON.parse(card.emails).forEach(email => {
                    addField('email');
                    const field = document.querySelector(`#email-fields-container .dynamic-field:last-child`);
                    field.querySelector('.field-label-text').textContent = email.type;
                    field.querySelector('input').value = email.value;
                });
                
                JSON.parse(card.websites).forEach(website => {
                    addField('website');
                    const field = document.querySelector(`#website-fields-container .dynamic-field:last-child`);
                    field.querySelector('.field-label-text').textContent = website.type;
                    field.querySelector('input').value = website.value;
                });
                
                JSON.parse(card.addresses).forEach(address => {
                    addField('address');
                    const field = document.querySelector(`#address-fields-container .dynamic-field:last-child`);
                    field.querySelector('.field-label-text').textContent = address.type;
                    field.querySelector('input').value = address.value;
                });
            } catch (e) {
                console.error('Error populating dynamic fields:', e);
            }
            
            // Update form title
            document.querySelector('.heading .title').textContent = 'Edit Card';
            
            // Update save button to handle update
            // document.querySelector('.save_btn').addEventListener('click', function(e) {
            //     e.preventDefault();
            //     if (currentEditId) {
            //         updateCard(currentEditId);
            //     } else {
            //         saveCard();
            //     }
            // });
        });
    });
}

// UpdateCard function
function updateCard(cardId, firstName, lastName, company, title, profileImage, notes, phones, emails, websites, addresses) {
    db.transaction((tx) => {
        tx.executeSql(`
            UPDATE cards 
            SET firstName = ?, 
                lastName = ?, 
                company = ?, 
                title = ?, 
                profileImage = ?,
                phones = ?,
                emails = ?,
                websites = ?,
                addresses = ?,
                notes = ?
            WHERE id = ?
        `, [
            firstName, lastName, company, title, profileImage,
            JSON.stringify(phones),
            JSON.stringify(emails),
            JSON.stringify(websites),
            JSON.stringify(addresses),
            notes,
            cardId
        ], (tx, results) => {
            if (results.rowsAffected > 0) {
                currentEditId = null;
                hideAddCardForm();
                resetForm();
                loadCards();
                showAlert('Card updated successfully');
                document.querySelector('.heading .title').textContent = 'Add Card';
            }
        });
    });
}


function showAddCardForm() {
    const addCardForm = document.getElementById('addCardForm');
    addCardForm.style.visibility = 'visible';
    addCardForm.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Reset form state when opening fresh
    if (!isEditMode) {
        resetForm();
        const saveBtn = document.querySelector('.save_btn');
        saveBtn.onclick = saveCard;
        document.querySelector('.heading .title').textContent = 'Add Card';
    } else {
        const saveBtn = document.querySelector('.save_btn');
        saveBtn.onclick = saveCard;
        document.querySelector('.heading .title').textContent = 'Edit Card';
    }
}

function pickContact() {
    navigator.contacts.pickContact(function(contact) {
        const cardData = {
            firstName: contact.name.givenName || '',
            lastName: contact.name.familyName || '',
            company: contact.organizations && contact.organizations[0] ? contact.organizations[0].name : '',
            title: contact.organizations && contact.organizations[0] ? contact.organizations[0].title : '',
            phones: contact.phoneNumbers ? contact.phoneNumbers.map(phone => ({
                type: phone.type || 'mobile',
                value: phone.value
            })) : [],
            emails: contact.emails ? contact.emails.map(email => ({
                type: email.type || 'work',
                value: email.value
            })) : [],
            addresses: contact.addresses ? contact.addresses.map(addr => ({
                type: addr.type || 'work',
                value: addr.formatted || addr.streetAddress
            })) : []
        };

        showAddCardForm();
        populateFormFields(cardData);
    }, function(error) {
        // showAlert('Failed to pick contact: ' + error);
        if (error == 6){
            showAlert('No contact selected ;)');
        }
    });
}

function saveToContacts(cardId) {
    console.log('Saving contact:', cardId);
    
    if (!navigator.contacts) {
        showAlert('Contacts plugin not available');
        return;
    }

    db.transaction((tx) => {
        tx.executeSql('SELECT * FROM cards WHERE id = ?', [cardId], (tx, results) => {
            const card = results.rows.item(0);
            console.log('Card data:', card);
            
            try {
                const contact = navigator.contacts.create();
                
                // Basic info
                contact.displayName = `${card.firstName} ${card.lastName}`;
                contact.name = new ContactName(
                    null,
                    card.lastName,
                    card.firstName,
                    '',
                    '',
                    ''
                );
                
                // Organization
                if (card.company || card.title) {
                    contact.organizations = [{
                        type: 'work',
                        name: card.company,
                        title: card.title
                    }];
                }
                
                // Phone numbers
                const phones = JSON.parse(card.phones || '[]');
                if (phones.length > 0) {
                    contact.phoneNumbers = phones.map(p => ({
                        type: p.type,
                        value: p.value,
                        pref: false
                    }));
                }
                
                // Emails
                const emails = JSON.parse(card.emails || '[]');
                if (emails.length > 0) {
                    contact.emails = emails.map(e => ({
                        type: e.type,
                        value: e.value,
                        pref: false
                    }));
                }
                
                // Addresses
                const addresses = JSON.parse(card.addresses || '[]');
                if (addresses.length > 0) {
                    contact.addresses = addresses.map(a => ({
                        type: a.type,
                        formatted: a.value,
                        streetAddress: a.value
                    }));
                }

                console.log('Saving contact:', contact);
                
                contact.save(
                    () => {
                        console.log('Contact saved successfully');
                        showAlert('Contact saved to device');
                    },
                    (error) => {
                        console.error('Save error:', error);
                        showAlert('Failed to save contact: ' + error);
                    }
                );
            } catch (error) {
                console.error('Contact creation error:', error);
                showAlert('Error creating contact: ' + error.message);
            }
        });
    });
}