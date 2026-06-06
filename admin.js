// admin.js - Complete Admin Dashboard Functionality

let currentPage = 1;
let donationChart = null;
let currentSearchTimeout = null;

// Check admin authentication on page load
window.addEventListener("load", async () => {
    const token = localStorage.getItem("token");
    
    if (!token) {
        alert("Please login to access admin panel");
        window.location.href = "login.html";
        return;
    }
    
    // Verify admin role
    try {
        const response = await fetch("http://localhost:5000/api/admin/stats", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (!data.success) {
            alert("Admin access required. You don't have permission to view this page.");
            window.location.href = "campaigns.html";
            return;
        }
        
        // Load dashboard data
        loadDashboardStats();
        
    } catch (error) {
        console.error("Auth error:", error);
        window.location.href = "login.html";
    }
});

// ===============================
// SECTION SWITCHING
// ===============================
function showSection(sectionName) {
    // Hide all sections
    document.getElementById("dashboardSection").style.display = "none";
    document.getElementById("donationsSection").style.display = "none";
    document.getElementById("usersSection").style.display = "none";
    document.getElementById("analyticsSection").style.display = "none";
    
    // Show selected section
    document.getElementById(`${sectionName}Section`).style.display = "block";
    
    // Load data based on section
    if (sectionName === 'donations') {
        currentPage = 1;
        loadDonations();
    } else if (sectionName === 'users') {
        loadUsers();
    } else if (sectionName === 'analytics') {
        loadAnalytics();
    }
}

// ===============================
// DASHBOARD STATISTICS
// ===============================
async function loadDashboardStats() {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/admin/stats", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            
            // Update stats cards
            document.getElementById("totalDonations").innerText = stats.totalDonations;
            document.getElementById("totalAmount").innerText = "৳" + stats.totalAmount.toLocaleString();
            document.getElementById("totalUsers").innerText = stats.totalUsers;
            document.getElementById("todayDonations").innerText = stats.todayDonations;
            
            // Display campaign stats
            displayCampaignStats(stats.campaignStats);
            
            // Display recent donations
            displayRecentDonations(stats.recentDonations);
        }
        
    } catch (error) {
        console.error("Error loading stats:", error);
        showToast("Error loading dashboard statistics", "error");
    }
}

// Display campaign statistics
function displayCampaignStats(campaignStats) {
    const container = document.getElementById("campaignStats");
    const campaignNames = {
        gaza: "🇵🇸 Gaza Emergency",
        flood: "🌊 Flood Relief",
        education: "📚 Education Support",
        medical: "🏥 Medical Support"
    };
    
    if (!container) return;
    
    if (!campaignStats || campaignStats.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">No campaign data available</p>';
        return;
    }
    
    container.innerHTML = "";
    
    campaignStats.forEach(stat => {
        const div = document.createElement("div");
        div.className = "campaign-stat-card";
        div.innerHTML = `
            <h4>${campaignNames[stat._id] || stat._id}</h4>
            <p><strong>Total:</strong> ৳${stat.total.toLocaleString()}</p>
            <p><strong>Donations:</strong> ${stat.count}</p>
        `;
        container.appendChild(div);
    });
}

// Display recent donations on dashboard
function displayRecentDonations(donations) {
    const tbody = document.getElementById("recentDonations");
    
    if (!tbody) return;
    
    if (!donations || donations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No donations yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = donations.map(donation => `
        <tr>
            <td>${new Date(donation.date).toLocaleDateString()}</td>
            <td>${escapeHtml(donation.donorName)}</td>
            <td>${getCampaignName(donation.campaign)}</td>
            <td>৳${donation.amount.toLocaleString()}</td>
            <td><span class="status-${donation.status || 'pending'}">${donation.status || 'pending'}</span></td>
        </tr>
    `).join("");
}

// ===============================
// DONATIONS MANAGEMENT
// ===============================
async function loadDonations() {
    try {
        const token = localStorage.getItem("token");
        const campaign = document.getElementById("campaignFilter")?.value || 'all';
        const status = document.getElementById("statusFilter")?.value || 'all';
        const search = document.getElementById("searchInput")?.value || '';
        
        const response = await fetch(
            `http://localhost:5000/api/admin/donations?page=${currentPage}&campaign=${campaign}&status=${status}&search=${search}`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );
        
        const data = await response.json();
        
        if (data.success) {
            displayDonationsTable(data.donations);
            displayPagination(data);
        }
        
    } catch (error) {
        console.error("Error loading donations:", error);
        showToast("Error loading donations", "error");
    }
}

// Display donations table
function displayDonationsTable(donations) {
    const tbody = document.getElementById("donationsTableBody");
    
    if (!tbody) return;
    
    if (!donations || donations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No donations found</td></tr>';
        return;
    }
    
    tbody.innerHTML = donations.map(donation => `
        <tr>
            <td>${new Date(donation.date).toLocaleDateString()}</td>
            <td>${escapeHtml(donation.donorName)}</td>
            <td>${donation.phone}</td>
            <td>${getCampaignName(donation.campaign)}</td>
            <td>৳${donation.amount.toLocaleString()}</td>
            <td><small>${donation.transactionId || 'N/A'}</small></td>
            <td><span class="status-${donation.status || 'pending'}">${donation.status || 'pending'}</span></td>
            <td>
                ${donation.status !== 'verified' ? `<button class="btn-verify" onclick="updateStatus('${donation._id}', 'verified')">
                    <i class="fas fa-check"></i> Verify
                </button>` : ''}
                ${donation.status !== 'cancelled' ? `<button class="btn-cancel" onclick="updateStatus('${donation._id}', 'cancelled')">
                    <i class="fas fa-times"></i> Cancel
                </button>` : ''}
                <button class="btn-delete" onclick="deleteDonation('${donation._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join("");
}

// Display pagination
function displayPagination(data) {
    const container = document.getElementById("pagination");
    if (!container) return;
    
    if (data.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>← Previous</button>`;
    
    for (let i = 1; i <= data.totalPages; i++) {
        if (i === 1 || i === data.totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button onclick="changePage(${i})" ${i === currentPage ? 'class="active"' : ''}>${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<button disabled>...</button>`;
        }
    }
    
    html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === data.totalPages ? 'disabled' : ''}>Next →</button>`;
    
    container.innerHTML = html;
}

function changePage(page) {
    if (page < 1) return;
    currentPage = page;
    loadDonations();
}

// Search with debounce
function searchDonations() {
    if (currentSearchTimeout) {
        clearTimeout(currentSearchTimeout);
    }
    currentSearchTimeout = setTimeout(() => {
        currentPage = 1;
        loadDonations();
    }, 500);
}

// Update donation status
async function updateStatus(donationId, status) {
    if (!confirm(`Are you sure you want to mark this donation as ${status.toUpperCase()}?`)) return;
    
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/admin/donation/${donationId}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`Donation ${status} successfully!`, "success");
            loadDonations(); // Refresh the table
            loadDashboardStats(); // Update dashboard stats
        } else {
            showToast(data.message || "Error updating status", "error");
        }
        
    } catch (error) {
        console.error("Error updating status:", error);
        showToast("Error updating donation status", "error");
    }
}

// Delete donation
async function deleteDonation(donationId) {
    if (!confirm("⚠️ Are you sure you want to delete this donation? This action cannot be undone!")) return;
    
    try {
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/admin/donation/${donationId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast("Donation deleted successfully", "success");
            loadDonations(); // Refresh the table
            loadDashboardStats(); // Update dashboard stats
        } else {
            showToast(data.message || "Error deleting donation", "error");
        }
        
    } catch (error) {
        console.error("Error deleting donation:", error);
        showToast("Error deleting donation", "error");
    }
}

// ===============================
// USERS MANAGEMENT
// ===============================
async function loadUsers() {
    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/admin/users", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayUsersTable(data.users);
        }
        
    } catch (error) {
        console.error("Error loading users:", error);
        showToast("Error loading users", "error");
    }
}

function displayUsersTable(users) {
    const tbody = document.getElementById("usersTableBody");
    
    if (!tbody) return;
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.phone}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>৳${user.totalDonated?.toLocaleString() || 0}</td>
            <td>${user.donationCount || 0}</td>
            <td>${user.lastDonation ? new Date(user.lastDonation).toLocaleDateString() : 'Never'}</td>
        </tr>
    `).join("");
}

// ===============================
// ANALYTICS
// ===============================
async function loadAnalytics() {
    try {
        const token = localStorage.getItem("token");
        const period = document.getElementById("periodFilter")?.value || 'month';
        
        const response = await fetch(`http://localhost:5000/api/admin/analytics?period=${period}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            createDonationChart(data.dailyStats);
            displayTopDonors(data.topDonors);
        }
        
    } catch (error) {
        console.error("Error loading analytics:", error);
        showToast("Error loading analytics data", "error");
    }
}

function createDonationChart(dailyStats) {
    const ctx = document.getElementById('donationChart')?.getContext('2d');
    if (!ctx) return;
    
    // Destroy existing chart
    if (donationChart) {
        donationChart.destroy();
    }
    
    const labels = dailyStats.map(stat => stat._id);
    const amounts = dailyStats.map(stat => stat.total);
    const counts = dailyStats.map(stat => stat.count);
    
    donationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Donation Amount (BDT)',
                    data: amounts,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Number of Donations',
                    data: counts,
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            let value = context.raw;
                            if (context.dataset.label.includes('Amount')) {
                                return `${label}: ৳${value.toLocaleString()}`;
                            }
                            return `${label}: ${value}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amount (BDT)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '৳' + value.toLocaleString();
                        }
                    }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Number of Donations'
                    },
                    grid: {
                        drawOnChartArea: false,
                    }
                }
            }
        }
    });
}

function displayTopDonors(topDonors) {
    const tbody = document.getElementById("topDonorsTable");
    
    if (!tbody) return;
    
    if (!topDonors || topDonors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No donor data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = topDonors.map((donor, index) => `
        <tr>
            <td><strong>#${index + 1}</strong> ${index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}</td>
            <td>${escapeHtml(donor.name)}</td>
            <td>${donor._id}</td>
            <td>৳${donor.total.toLocaleString()}</td>
            <td>${donor.count} donation${donor.count !== 1 ? 's' : ''}</td>
        </tr>
    `).join("");
}

// ===============================
// EXPORT DATA
// ===============================
async function exportData() {
    try {
        const token = localStorage.getItem("token");
        const campaign = document.getElementById("campaignFilter")?.value || 'all';
        
        showToast("Preparing export...", "info");
        
        const response = await fetch(`http://localhost:5000/api/admin/export-donations?campaign=${campaign}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            // Convert to CSV
            const headers = Object.keys(data.data[0]);
            const csvRows = [];
            
            csvRows.push(headers.join(','));
            
            for (const row of data.data) {
                const values = headers.map(header => {
                    const value = row[header] || '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                });
                csvRows.push(values.join(','));
            }
            
            // Download file
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `donations_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast(`Exported ${data.data.length} donations successfully!`, "success");
        } else {
            showToast("No data to export", "warning");
        }
        
    } catch (error) {
        console.error("Error exporting data:", error);
        showToast("Error exporting data", "error");
    }
}

// ===============================
// HELPER FUNCTIONS
// ===============================
function getCampaignName(campaign) {
    const names = {
        gaza: "🇵🇸 Gaza Emergency",
        flood: "🌊 Flood Relief",
        education: "📚 Education Support",
        medical: "🏥 Medical Support"
    };
    return names[campaign] || campaign;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showToast(message, type = 'info') {
    // Create toast element if it doesn't exist
    let toast = document.getElementById('customToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'customToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(toast);
        
        // Add animation style
        if (!document.querySelector('#toastStyles')) {
            const style = document.createElement('style');
            style.id = 'toastStyles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Set color based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    toast.textContent = message;
    toast.style.display = 'block';
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            toast.style.display = 'none';
            toast.style.animation = '';
        }, 300);
    }, 3000);
}

// ===============================
// LOGOUT FUNCTION (from app.js)
// ===============================
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
    }
}