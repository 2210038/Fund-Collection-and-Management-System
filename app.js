// ===============================
// LOGIN
// ===============================
async function loginUser() {
    const phone = document.getElementById("loginPhone").value;
    const password = document.getElementById("loginPassword").value;

    if (!phone || !password) {
        alert("Please enter phone number and password");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem("token", data.token);
            window.location.href = "campaigns.html";
        } else {
            alert(data.message || "Invalid login details");
        }

    } catch (error) {
        console.log(error);
        alert("Server error. Please try again.");
    }
}


// ===============================
// REGISTER
// ===============================
async function registerUser() {
    const phone = document.getElementById("phone").value;
    const password = document.getElementById("password").value;

    if (!phone || !password) {
        alert("Please fill all fields");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, password })
        });

        const data = await response.json();

        alert(data.message);

        if (data.success) {
            window.location.href = "login.html";
        }

    } catch (error) {
        console.log(error);
        alert("Server error");
    }
}


// ===============================
// CAMPAIGN TARGETS
// ===============================
const targets = {
    gaza: 1000000,
    flood: 500000,
    education: 300000,
    medical: 200000
};


// ===============================
// PAGE LOAD
// ===============================
window.addEventListener("load", () => {

    // Campaign auto fill for donation form
    const params = new URLSearchParams(window.location.search);
    const campaign = params.get("campaign");

    if (document.getElementById("campaignName")) {
        if (campaign) {
            document.getElementById("campaignName").value = campaign;
        }
    }

    // Load dashboard data from MongoDB
    if (document.getElementById("totalAmount")) {

        fetch("http://localhost:5000/api/campaign-summary")
            .then(res => res.json())
            .then(data => {

                if (!data.success) return;

                const s = data.summary;

                updateCampaignUI("gaza", s.gaza);
                updateCampaignUI("flood", s.flood);
                updateCampaignUI("education", s.education);
                updateCampaignUI("medical", s.medical);

                const totalAmount =
                    s.gaza.total +
                    s.flood.total +
                    s.education.total +
                    s.medical.total;

                const totalDonors =
                    s.gaza.donors +
                    s.flood.donors +
                    s.education.donors +
                    s.medical.donors;

                document.getElementById("totalAmount").innerText =
                    "৳" + totalAmount;

                document.getElementById("totalDonors").innerText =
                    totalDonors;
            })
            .catch(err => console.log(err));
    }

    // Donation Form
    const form = document.getElementById("donationForm");

    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const donorName =
                document.getElementById("donorName").value;

            const phone =
                document.getElementById("phone").value;

            const amount =
                Number(document.getElementById("donationAmount").value);

            const campaign =
                document.getElementById("campaignName").value;

            const bkashNumber =
                document.getElementById("bkashNumber").value;

            const transactionId =
                document.getElementById("transactionId").value;

            if (!donorName || !phone || !amount || !campaign) {
                alert("Please fill all required fields");
                return;
            }

            try {

                const response = await fetch(
                    "http://localhost:5000/api/donate",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            donorName,
                            phone,
                            amount,
                            campaign,
                            bkashNumber,
                            transactionId
                        })
                    }
                );

                const data = await response.json();

                if (data.success) {
                    alert("Donation successful");
                    window.location.href = "campaigns.html";
                } else {
                    alert(data.message);
                }

            } catch (error) {
                console.log(error);
                alert("Server error");
            }
        });
    }
});

// ===============================
// UPDATE CAMPAIGN UI
// ===============================
function updateCampaignUI(campaign, data) {

    const targets = {
        gaza: 1000000,
        flood: 500000,
        education: 300000,
        medical: 200000
    };

    const target = targets[campaign];

    let percent = (data.total / target) * 100;

    if (percent > 100) {
        percent = 100;
    }

    if (document.getElementById(campaign + "Amount")) {
        document.getElementById(campaign + "Amount").innerText =
            "৳" + data.total;
    }

    if (document.getElementById(campaign + "Donors")) {
        document.getElementById(campaign + "Donors").innerText =
            data.donors;
    }

    if (document.getElementById(campaign + "Percent")) {
        document.getElementById(campaign + "Percent").innerText =
            Math.floor(percent) + "%";
    }

    if (document.getElementById(campaign + "Progress")) {
        document.getElementById(campaign + "Progress").style.width =
            percent + "%";
    }
}


// ===============================
// SHARE
// ===============================
function shareCampaign(title) {
    alert("Share this campaign:\n" + title);
}

// ===============================
// SEARCH CAMPAIGNS
// ===============================
function searchCampaigns() {
    const searchInput = document.getElementById("searchInput");
    if (!searchInput) return;
    
    const filter = searchInput.value.toLowerCase();
    const campaigns = document.querySelectorAll(".campaign");
    
    campaigns.forEach(campaign => {
        const title = campaign.querySelector("h2");
        const description = campaign.querySelector(".campaign-description");
        const tag = campaign.querySelector(".tag");
        
        const text = (title ? title.textContent : "") + 
                     (description ? description.textContent : "") + 
                     (tag ? tag.textContent : "");
        
        if (text.toLowerCase().includes(filter)) {
            campaign.style.display = "";
        } else {
            campaign.style.display = "none";
        }
    });
}

// ===============================
// LOGOUT
// ===============================
function logout() {
    localStorage.removeItem("token");
    window.location.href = "campaigns.html";
}

// ===============================
// CHECK LOGIN STATUS
// ===============================
// ===============================
// CHECK LOGIN STATUS & SHOW ADMIN LINK
// ===============================
async function checkLoginStatus() {
    const token = localStorage.getItem("token");
    const loginLink = document.querySelector('a[href="login.html"]');
    const registerLink = document.querySelector('a[href="register.html"]');
    const logoutBtn = document.getElementById("logoutBtn");
    const adminLink = document.getElementById("adminLink");
    
    if (token) {
        if (loginLink) loginLink.style.display = "none";
        if (registerLink) registerLink.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "inline-block";
        
        // Check if user is admin to show admin link
        try {
            const response = await fetch("http://localhost:5000/api/admin/stats", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.success && adminLink) {
                adminLink.style.display = "inline-block";
            } else if (adminLink) {
                adminLink.style.display = "none";
            }
        } catch (error) {
            if (adminLink) adminLink.style.display = "none";
        }
    } else {
        if (loginLink) loginLink.style.display = "inline-block";
        if (registerLink) registerLink.style.display = "inline-block";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (adminLink) adminLink.style.display = "none";
    }
}

// ===============================
// PAGE LOAD - CHECK LOGIN
// ===============================
window.addEventListener("load", () => {
    checkLoginStatus();
});