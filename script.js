import { createClient } from 'https://unpkg.com/@supabase/supabase-js@latest';

// Initialize Supabase
const supabaseUrl = 'https://vrszetgxfqizfjbrtscw.supabase.co'; // Replace with your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyc3pldGd4ZnFpemZqYnJ0c2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI0MzM3NTksImV4cCI6MjAzODAwOTc1OX0.LSbGcs2UieCXM_pPoXiDLC_gBXxyno7W-8q85mRBDh8'; // Replace with your Supabase anon key
const supabase = createClient(supabaseUrl, supabaseKey);

const requiredColumns = ['ID', 'Please describe why they deserve recognition', 'Your name', 'Who are you recognizing?'];
let nameToImageMap = {};
const personIcon = 'data:image/png;base64,YOUR_BASE64_IMAGE_HERE'; // Replace with your base64 person icon

document.getElementById('fileInput').addEventListener('change', handleFile, false);

async function fetchNamesAndImages() {
    const { data, error } = await supabase
        .from('Recognition Pictures')
        .select('Name, Base64');

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    data.forEach(entry => {
        nameToImageMap[entry.Name] = `data:image/png;base64,${entry.Base64}`;
    });

    // Log the nameToImageMap to see if it's being populated
    console.log('nameToImageMap:', nameToImageMap);
}

async function handleFile(e) {
    await fetchNamesAndImages();
    const files = e.target.files;
    if (!files.length) {
        showWarning('Please select an Excel file.');
        return;
    }
    const file = files[0];
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        showWarning('Please select a valid Excel file.');
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            console.log('First sheet name:', firstSheetName);
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (!validateColumns(jsonData[0])) {
                showWarning('The Excel file does not have the required columns.');
                return;
            }
            hideWarning();
            generateRecognitionItems(jsonData);
        } catch (error) {
            console.error('Error reading the Excel file:', error);
            showWarning('Error reading the Excel file. Please ensure it is a valid Excel file.');
        }
    };
    reader.readAsArrayBuffer(file);
}

function toggleMenu() {
    const menu = document.getElementById('dropdownMenu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function validateColumns(columns) {
    const cleanedColumns = columns.map(col => col.replace(/[\n\r]/g, ''));
    const missingColumns = requiredColumns.filter(col => !cleanedColumns.includes(col));
    if (missingColumns.length > 0) {
        console.error('Missing columns:', missingColumns);
        return false;
    }
    return true;
}

function showWarning(message) {
    const warningMessage = document.getElementById('warningMessage');
    warningMessage.innerText = message;
    warningMessage.style.display = 'block';
}

function hideWarning() {
    const warningMessage = document.getElementById('warningMessage');
    warningMessage.style.display = 'none';
}

function generateRecognitionItems(data) {
    const recognitionContainer = document.getElementById('recognitionContainer');
    recognitionContainer.innerHTML = '';
    const headers = data[0].map(header => header.trim());
    console.log('Headers:', headers);
    const rows = data.slice(1);
    rows.forEach((row, index) => {
        try {
            const id = row[headers.indexOf('ID')];
            const recognitionText = row[headers.indexOf('Please describe why they deserve recognition')];
            const recognizerName = row[headers.indexOf('Your name')];
            const recognizedNamesCell = row[headers.indexOf('Who are you recognizing?')];
            const additionalNamesCell = row[headers.indexOf('If not on the list, please write their name(s) here')];
            const recognizedNames = recognizedNamesCell ? recognizedNamesCell.split(';').map(name => name.trim()).filter(name => name && name !== 'Other') : [];
            const additionalNames = additionalNamesCell ? additionalNamesCell.split(';').map(name => name.trim()).filter(name => name) : [];
            console.log(`Row ${index + 1} - ID: ${id}, Recognizer: ${recognizerName}, Recognition Text: ${recognitionText}`);
            console.log(`Row ${index + 1} - Recognized Names: ${recognizedNames}, Additional Names: ${additionalNames}`);
            const recognitionItem = document.createElement('div');
            recognitionItem.className = 'recognition-item';
            const imageContainer = document.createElement('div');
            imageContainer.className = 'recognition-images';
            const namesContainer = document.createElement('div');
            namesContainer.className = 'recognition-names';
            namesContainer.innerText = recognizedNames.concat(additionalNames).join(', ');
            recognizedNames.forEach(name => {
                if (nameToImageMap[name]) {
                    const img = document.createElement('img');
                    img.src = `${nameToImageMap[name]}`;
                    imageContainer.appendChild(img);
                }
            });
            additionalNames.forEach(name => {
                const img = document.createElement('img');
                img.src = personIcon;
                imageContainer.appendChild(img);
            });
            recognitionItem.appendChild(imageContainer);
            recognitionItem.appendChild(namesContainer);
            const textDiv = document.createElement('div');
            textDiv.className = 'recognition-text';
            textDiv.innerText = `${recognitionText}\n~ ${recognizerName}`;
            recognitionItem.appendChild(textDiv);
            recognitionContainer.appendChild(recognitionItem);
            console.log(`Processed row ${index + 1} successfully`);
        } catch (error) {
            console.error(`Error processing row ${index + 1}:`, error);
        }
    });
}

async function addPerson() {
    const personName = document.getElementById('personName').value.trim();
    const personImage = document.getElementById('personImage').value.trim();

    if (!personName || !personImage) {
        showWarning('Please provide both name and base64 image.');
        return;
    }

    try {
        const { error } = await supabase
            .from('RecognitionPictures')
            .insert([{ Name: personName, Base64: personImage }]);

        if (error) {
            showWarning('Error adding person. Please try again.');
            console.error('Error adding person:', error);
        } else {
            showWarning('Person added successfully!');
            fetchNamesAndImages(); // Refresh the name to image map
        }
    } catch (error) {
        showWarning('Error adding person. Please try again.');
        console.error('Error adding person:', error);
    }
}

async function removePerson() {
    const personName = document.getElementById('personName').value.trim();

    if (!personName) {
        showWarning('Please provide the name of the person to remove.');
        return;
    }

    try {
        const { error } = await supabase
            .from('RecognitionPictures')
            .delete()
            .eq('Name', personName);

        if (error) {
            showWarning('Error removing person. Please try again.');
            console.error('Error removing person:', error);
        } else {
            showWarning('Person removed successfully!');
            fetchNamesAndImages(); // Refresh the name to image map
        }
    } catch (error) {
        showWarning('Error removing person. Please try again.');
        console.error('Error removing person:', error);
    }
}

// Exporting functions to be globally accessible
window.toggleMenu = toggleMenu;
window.addPerson = addPerson;
window.removePerson = removePerson;
