const API_BASE_URL = 'http://127.0.0.1:8000';

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = value || '-';
    }
}

function formatGender(g) {
    const map = { m: 'Male', f: 'Female', o: 'Other' };
    return map[g] || g || '-';
}

async function loadStudentProfile() {
    const token = localStorage.getItem('access_token');

    if (!token) {
        alert('Please login first.');
        window.location.replace('index.html'); // আপনার login পেজের নাম দিন
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/students/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load profile (' + response.status + ')');
        }

        const data = await response.json();
        console.log('Student profile:', data);

        setText('disp-first-name', data.first_name);
        setText('disp-last-name', data.last_name);
        setText('disp-email', data.user ? data.user.email_id : '');
        setText('disp-phone', data.phone_no);
        setText('disp-gender', formatGender(data.gender));
        setText('disp-dob', data.date_of_birth);
        setText('disp-address', data.address);
        setText('disp-about', data.about);

        // উপরের ডান কোণার নামও আপডেট
        const nameEl = document.getElementById('studentUserName');
        if (nameEl && data.first_name) {
            nameEl.innerText = data.first_name;
        }

    } catch (error) {
        console.error('Error fetching profile:', error);
    }
}