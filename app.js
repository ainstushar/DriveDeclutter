/**
 * Simple node.js app to declutter your Google Drive
 */
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
// Grants full read, write, and delete permission
const SCOPES = ['https://www.googleapis.com/auth/drive'];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), declutterFilesLoader); // Change the function being called
  /** 
   * declutterFilesLoader - lookup duplicate files and create a list of files to delete
   * deleteFiles - deletes files from list array.txt
   */
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Loads declutter files function. :(
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function declutterFilesLoader(auth) {
  const drive = google.drive({ version: 'v3', auth: auth });
  declutterFiles(drive, "", []);
}

/**
 * Makes a list of duplicate files/folders based on the query specified in q
 * @param {object} drive 
 * @param {string} nextPageToken 
 * @param {array} fileArray 
 */
function declutterFiles(drive, nextPageToken, fileArray) {
  // List files
  drive.files.list({
    pageToken: nextPageToken ? nextPageToken : "",
    pageSize: 1000,
    q: "mimeType = 'application/vnd.google-apps.folder' and name != 'subs' and name != 'screens'",
    fields: 'nextPageToken, files(id, name, size)',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    var token = res.data.nextPageToken;
    files = res.data.files;
    if (files.length) {
      // files found
      files.map((file) => {
        fileArray.push([file.id, file.name, file.size]);
      });
    } else {
      console.log('No files found')
    }
    // console.log(token);
    if (token) {
      console.log(token);
      console.log(fileArray);
      declutterFiles(drive, token, fileArray);
    } else {
      // Create duplicateFileArray that contains 
      var duplicateFileArrray = [];
      console.log('fileArray', fileArray);
      for (var i = 0; i <= fileArray.length; i++) {
        for (var j = i; j < fileArray.length; j++) {
          if (i != j && fileArray[i][1] == fileArray[j][1] && fileArray[i][2] == fileArray[j][2]) {
            duplicateFileArrray.push(fileArray[i][0])
          }
        }
      }

      console.table(duplicateFileArrray);
      
      // Creates array.txt 
      var file = fs.createWriteStream('array.txt');
      file.on('error', function (err) { /* error handling */ });
      duplicateFileArrray.forEach(function (v) { file.write(v.join(', ') + '\n'); });
      file.end();

      // Uncomment below to delete files stored in array.txt
      // deleteFiles(auth);


      // duplicateFileArrray.forEach(function (e) {
      //   // console.log(e[0])
      //   drive.files.delete({fileId: e[0], function(err, resp) {
      //       if (err) {
      //           console.log('Error code:', err.code)
      //       } else {
      //           console.log('Successfully deleted', file);
      //       }
      //   }})
      // })
    }
  })
}
/**
 * Calls a setDelay function to delete files from array.txt with 1 second interval to get around Google Drive's free API call quotas.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 */
// function deleteFiles(auth) {
//   const drive = google.drive({ version: 'v3', auth: auth });
//   fs.readFile('array.txt', function (err, data) {
//     if (err) throw err;
//     var duplicateFileArrray = data.toString().split("\n");
//     console.table(duplicateFileArrray);
//     duplicateFileArrray.forEach(function (e, index) {
//       setDelay(drive, auth, e, index);
//     })
//   });
// }

/**
 * Sets a timer to call delete function each second.
 * @param {object} drive 
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {*} e id of file that needs to be deleted
 * @param {*} index of ID - used to create a timer
 */
// function setDelay(drive, auth, e, index) {
//   setTimeout(function() {
//     drive.files.delete({fileId: e, function(err, resp) {
//       if (err) {
//           console.log('Error code:', err.code)
//       } else {
//           console.log('Successfully deleted', file);
//       }
//   }})
//   }, 1000*index);
// }