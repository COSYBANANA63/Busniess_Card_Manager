# Business Card Wallet App

Welcome to the **Business Card Wallet App**, a Cordova-based mobile application designed to help you easily store, manage, and share business cards digitally. Whether you're networking at events or managing your professional contacts, this app simplifies the process by allowing you to scan physical cards, manually input contact details, and export them in standard formats like vCards.

## Features

- **Scan Business Cards**: Use your device's camera to scan and extract contact details using OCR technology.
- **Manual Entry**: Add contacts manually with fields for name, company, title, phone numbers, emails, websites, and addresses.
- **Contact Organization**: Categorize phone numbers, emails, and addresses by type (e.g., Work, Home, Other).
- **SQLite Database**: Store all contacts securely on your device.
- **Edit & Delete**: Modify or remove existing business cards as needed.
- **Export & Share**: Generate QR codes or vCards for easy sharing.
- **Save to Phone Contacts**: Directly save stored cards to your phone's contacts.

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/business-card-wallet.git
   cd business-card-wallet
   ```

2. **Install Cordova**:
   Ensure you have Cordova installed globally:
   ```bash
   npm install -g cordova
   ```

3. **Add Platforms**:
   Add the desired platform (e.g., Android, iOS):
   ```bash
   cordova platform add android
   # For iOS
   cordova platform add ios
   ```

4. **Install Plugins**:
   The app uses several Cordova plugins:
   ```bash
   cordova plugin add cordova-sqlite-storage
   cordova plugin add cordova-plugin-camera
   cordova plugin add cordova-plugin-contacts
   ```

5. **Run the App**:
   Launch the app on your connected device or emulator:
   ```bash
   cordova run android
   # or for iOS
   cordova run ios
   ```

## Usage

1. **Adding Card From Contact**:
   - Tap the "+" button on the home screen.
   - Choose "From Contacts".
   - The app will prompt you to select a contact, extract details and populate the fields automatically.

2. **Adding a Card Manually**:
   - Click "Add here" on the home screen.
   - Fill in the required fields (First Name, Last Name, Company, Title) and at least one contact method (Phone, Email, or Address).
   - Tap **Save**.

3. **Managing Cards**:
   - Tap on any card in the list to view details.
   - Use the **Edit** button to modify or **Delete** to remove.

4. **Sharing & Exporting**:
   - Tap the **Share Contact** button to generate a QR code or export as a vCard.
   - Use **Save to Contacts** to add the information to your device’s contact list.

## Technologies Used

- **Apache Cordova**: For cross-platform mobile app development.
- **JavaScript**: Core logic handling for app functionalities.
- **SQLite**: Local database for storing contact information.
- **Tesseract.js**: OCR library for text extraction from scanned images.(Code is there for now but is commented)
- **QR Code Generator**: For sharing contact information.

## Folder Structure

```plaintext
business-card-wallet/
├── css/
│   ├── index.css
│   └── kind-all.css
├── js/
│   └── index.js
├── index.html
└── config.xml
```

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature-name`).
5. Open a Pull Request.

## License

This project is licensed under the [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0).

---

**Enjoy managing your business cards digitally with ease!** :rocket:

ICARUSTUDIO

