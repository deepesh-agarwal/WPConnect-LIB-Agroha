const express = require('express');
const wppconnect = require('@wppconnect-team/wppconnect');
const fs = require('fs');

const app = express();
const PORT = 3000;
let latestQRPath = ''; // Variable to store the path of the latest QR code image
let sessionDataPath = 'session-data.json'; // File path to store session data

// Function to save session data to a file
function saveSessionData(data) {
    fs.writeFileSync(sessionDataPath, JSON.stringify(data));
}

// Function to load session data from a file
function loadSessionData() {
    try {
        const data = fs.readFileSync(sessionDataPath);
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading session data:', error);
        return null;
    }
}

app.get('/QR', (req, res) => {
    if (latestQRPath) {
        fs.readFile(latestQRPath, (err, data) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error retrieving QR code image');
            } else {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(data);
            }
        });
    } else {
        res.status(404).send('QR code image not found');
    }
});

// Load session data if available
const sessionData = loadSessionData();

// Function to send a welcome message and a bonfire message
async function sendWelcome(name, phoneNumber) {
    const message = `Dear ${name}, Thank you for your stay. Pls. Dial *110* for kitchen and *9* for Reception, you can also call *8881088844*. To access FREE WiFi service pls. connect to *Hotel Agroha* with password - *agroha123*. We strictly prohibit any illegal activity in our premises like Gambling.`;
    const chatId = `${phoneNumber}@c.us`;

    // Send the welcome message
    client.sendMessage(chatId, message)
        .then(response => {
            if (response.id.fromMe) {
                console.log(`Message successfully sent to ${name}`);
            }
        })
        .catch(err => {
            console.error(`Failed to send message: ${err}`);
        });

    // Send the bonfire message
    sendBonfire(name, phoneNumber);
}

// Function to sanitize the phone number
function sanitizePhoneNumber(phoneNumber) {
    let sanitizedNumber = phoneNumber.replace(/\D/g, ''); // Remove all non-numeric characters

    if (!sanitizedNumber.startsWith('91')) {
        sanitizedNumber = '91' + sanitizedNumber; // Prepend country code if not present
    }

    if (sanitizedNumber.length !== 12) {
        throw new Error(`Invalid phone number format ${sanitizedNumber}`);
    }

    return sanitizedNumber;
}

// Function to send a bonfire message
async function sendBonfire(name, phoneNumber) {
    try {
        const media = await MessageMedia.fromFilePath('./img/bonfire.mp4'); // Create a MessageMedia instance from the file
        client.sendMessage(`${phoneNumber}@c.us`, media, { caption: `Hello ${name} ji, dont forget to ask for Bonfire at dinner for an unforgettable experience.` }); // Send the video with a caption
    } catch (error) {
        console.error('Error sending video:', error);
    }
}

// Implement the /sendWelcome endpoint
app.get('/sendWelcome', (req, res) => {
    const { name, phoneNumber } = req.query;

    if (name && phoneNumber) {
        sendWelcome(name, phoneNumber); // Call the sendWelcome function
        res.send(`Welcome message sent to ${name}`);
    } else {
        res.status(400).send('Missing name or phoneNumber query parameters');
    }
});

wppconnect.create({
    session: 'sessionName',
    catchQR: (base64Qr, asciiQR) => {
        console.log(asciiQR); // Optional to log the QR in the terminal

        var matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        var response = {};

        if (matches.length !== 3) {
            return new Error('Invalid input string');
        }

        response.type = matches[1];
        response.data = new Buffer.from(matches[2], 'base64');

        const qrImagePath = 'qr-code.png';
        fs.writeFile(qrImagePath, response.data, 'base64', function (err) {
            if (err) {
                console.error(err);
            } else {
                console.log('QR code image saved successfully');
                latestQRPath = qrImagePath; // Update the latest QR code image path
            }
        });
    },
    logQR: false,
    sessionData: sessionData // Pass session data to restore the session
})
.then((client) => {
    console.log('Client created successfully');
    
    client.onMessage(async (message) => {
        console.log('Received message:', message);
    });

    client.onAck((ack) => {
        console.log('Acknowledgment received:', ack);
    });

    client.onStateChange(async (state) => {
        console.log('Client state changed:', state);
        // Save the session data when the state changes
        saveSessionData(client.getSessionData());
    });
})
.catch((error) => {
    console.error('Error creating client:', error);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

